import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { tripPayloadSchema } from "@/lib/experience-trips";
import {
  partnerRequestInput,
  supplierBatchInput,
  supplierEmailInput,
  supplierRequestInput,
  supplierRequestServices,
} from "@/lib/experience-supplier-request";
import { renderExperiencePdf } from "@/lib/experience-quote-pdf";
import { createSupplierArchive } from "@/lib/experience-supplier-archive";
import { sendExperienceSupplierQuoteEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/audit";


const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
const date = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "long",
  timeZone: "Europe/Rome",
});

export async function handleSupplierQuote(request: NextRequest, tripId?: string) {
  function fail(status: number, error: string) {
    console.warn("[experience-supplier-pdf] Request rejected:", status, error);
    return NextResponse.json({ error }, { status, headers });
  }
  const auth = await requireAdminApi();
  if (!auth.ok) return fail(auth.status, "Accesso amministratore richiesto.");

  const origin = request.headers.get("origin");
  if (
    !origin ||
    (origin !== request.nextUrl.origin &&
      origin !== process.env.NEXT_PUBLIC_APP_URL)
  ) {
    return fail(403, "Origine della richiesta non valida.");
  }
  const limited = rateLimit(request, 20, 60000);
  if (limited) return limited;

  const id = z
    .string()
    .uuid()
    .safeParse(tripId);
  if (tripId !== undefined && !id.success) return fail(404, "Viaggio non disponibile.");
  if (Number(request.headers.get("content-length")) > 8192) {
    return fail(413, "Richiesta troppo grande.");
  }

  let raw: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 8192)
      return fail(413, "Richiesta troppo grande.");
    raw = JSON.parse(body);
  } catch {
    return fail(400, "Richiesta non valida.");
  }
  const partner = partnerRequestInput.safeParse(raw);
  if (tripId === undefined && !partner.success)
    return fail(400, "Scelga il fornitore e almeno una voce del listino.");
  const group = supplierBatchInput.safeParse(raw);
  const mail = supplierEmailInput.safeParse(raw);
  const individual = mail.success ? mail : supplierRequestInput.safeParse(raw);
  if (id.success && !group.success && !individual.success)
    return fail(400, "Controlli la selezione di servizi e fornitori.");
  const input = !id.success && partner.success
    ? { version: null, requests: [partner.data] }
    : group.success
    ? { version: group.data.trip_version, requests: group.data.requests }
    : individual.success
      ? { version: individual.data.trip_version, requests: [individual.data] }
      : null;
  if (!input) return fail(400, "Selezione non valida.");

  try {
    const db = createServiceClient();
    let catalogue: ReturnType<typeof supplierRequestServices>;
    let documentDate = new Date();
    let versionKey: unknown[];
    const facts: { label: string; value: string }[] = [];
    if (id.success) {
      const { data, error } = await db.from("experience_trips")
        .select("payload,updated_at").eq("id", id.data).maybeSingle();
      if (error) throw error;
      if (!data) return fail(404, "Viaggio non disponibile.");
      if (data.updated_at !== input.version)
        return fail(409, "Il viaggio è stato aggiornato. Ricarichi la scheda prima di creare il PDF.");
      const trip = tripPayloadSchema.parse(data.payload);
      catalogue = supplierRequestServices(trip.ids);
      documentDate = new Date(data.updated_at);
      versionKey = [id.data, data.updated_at];
      facts.push({ label: "Destinazione", value: trip.lake === "Da scegliere insieme" ? "Da definire" : trip.lake });
      if (trip.details) {
        facts.push({ label: "Numero di ospiti", value: String(trip.details.guests) });
        for (const [label, value] of [
          ["Arrivo indicativo", trip.details.arrival],
          ["Partenza indicativa", trip.details.departure],
        ]) {
          if (value) facts.push({ label, value: date.format(new Date(value + "T12:00:00Z")) });
        }
      }
    } else {
      const { data: services, error } = await db.from("experience_services")
        .select("id,title,lake,unit,updated_at").eq("active", true)
        .in("id", input.requests[0].services).order("id");
      if (error) throw error;
      catalogue = services.map(({ id, title, lake, unit }) => ({
        id, title, format: `${lake} · per ${unit}`,
      }));
      versionKey = ["partner", services.map(({ id, updated_at }) => [id, updated_at])];
      facts.push({ label: "Richiesta", value: "Tariffe partner riservate a SILKinCOM" });
    }
    if (
      input.requests.some((entry) =>
        entry.services.some(
          (service) => !catalogue.some((item) => item.id === service),
        ),
      )
    )
      return fail(400, id.success ? "La selezione contiene servizi estranei al viaggio." : "Alcune voci del listino non sono più attive. Ricarichi la pagina.");

    const supplierIds = input.requests.flatMap((entry) =>
      entry.supplier_id ? [entry.supplier_id] : [],
    );
    if (supplierIds.length) {
      const { data: suppliers, error: supplierError } = await db
        .from("experience_suppliers")
        .select("id,status")
        .in("id", supplierIds);
      if (supplierError) throw supplierError;
      const available = new Set(
        suppliers
          .filter((supplier) => supplier.status !== "inactive")
          .map((supplier) => supplier.id),
      );
      if (supplierIds.some((supplierId) => !available.has(supplierId)))
        return fail(
          400,
          "Uno dei fornitori non è più attivo. Controlli la selezione.",
        );
    }
    const files = [];
    for (const entry of input.requests) {
      const selected = new Set(entry.services);
      const code =
        "EXP-F-" +
        createHash("sha256")
          .update(
            JSON.stringify([
              ...versionKey,
              [...selected].sort(),
              ...(entry.supplier_id ? [entry.supplier_id] : []),
            ]),
          )
          .digest("hex")
          .slice(0, 12)
          .toUpperCase();
      const bytes = await renderExperiencePdf({
        title: id.success ? "Richiesta di quotazione" : "Richiesta tariffa partner",
        status: "Modulo per il fornitore",
        summary: { label: "Codice richiesta", value: code },
        facts,
        supplierServices: catalogue.filter((item) => selected.has(item.id)),
        documentDate,
        sections: [],
      });
      files.push({ code, bytes });
    }
    if (group.success) {
      return new NextResponse(createSupplierArchive(files), {
        headers: {
          ...headers,
          "Content-Type": "application/zip",
          "Content-Disposition":
            'attachment; filename="SILKinCOM-richieste-fornitori.zip"',
          "X-Experience-Request-Codes": files.map(({ code }) => code).join(","),
        },
      });
    }
    const [{ code, bytes }] = files;
    const emailRequest = id.success ? (mail.success ? mail.data : null)
      : (partner.success ? partner.data : null);
    if (!id.success && partner.success && partner.data.request_code && partner.data.request_code !== code)
      return fail(409, "Il listino è cambiato. Chiuda l’anteprima e prepari un nuovo PDF.");
    if (emailRequest?.email) {
      if (
        process.env.NODE_ENV !== "production" ||
        (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
      )
        return fail(
          403,
          "In anteprima può scaricare il PDF. L’invio email è disattivato.",
        );
      if (
        process.env.RESEND_DOMAIN_VERIFIED !== "true" ||
        !process.env.RESEND_API_KEY
      )
        return fail(
          503,
          "Invio email non configurato. Può scaricare il PDF e inviarlo dalla sua casella.",
        );
      const recipient = emailRequest.email.toLowerCase();
      const recipientHash = createHash("sha256")
        .update(recipient)
        .digest("hex");
      try {
        const messageId = await sendExperienceSupplierQuoteEmail({
          recipient: emailRequest.email,
          code,
          pdf: bytes,
          deliveryKey: `experience-supplier-${code}-${recipientHash}`,
        });
        await logAdminAction(
          auth.userId,
          "experience_supplier_quote_email",
          "experience_supplier",
          emailRequest.supplier_id,
          { request_code: code, message_id: messageId },
        );
        return NextResponse.json({ ok: true, code }, { headers });
      } catch (error) {
        console.error(
          "[experience-supplier-pdf] Email failed:",
          code,
          error instanceof Error ? error.name : "unknown",
        );
        return fail(
          502,
          "Non abbiamo ricevuto conferma dell’invio. Verifichi l’indirizzo o riprovi.",
        );
      }
    }
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SILKinCOM-${code}.pdf"`,
        "X-Experience-Request-Code": code,
      },
    });
  } catch (error) {
    console.error(
      "[experience-supplier-pdf] Generation failed:",
      error instanceof Error ? error.name : (error as { code?: string })?.code,
    );
    return fail(503, "Non è stato possibile creare il PDF. Riprovi.");
  }
}
