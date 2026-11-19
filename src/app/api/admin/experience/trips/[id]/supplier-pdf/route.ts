import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { tripPayloadSchema } from "@/lib/experience-trips";
import {
  supplierBatchInput,
  supplierEmailInput,
  supplierRequestInput,
  supplierRequestServices,
} from "@/lib/experience-supplier-request";
import { renderExperiencePdf } from "@/lib/experience-quote-pdf";
import { createSupplierArchive } from "@/lib/experience-supplier-archive";
import { sendExperienceSupplierQuoteEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
const date = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "long",
  timeZone: "Europe/Rome",
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    .safeParse((await params).id);
  if (!id.success) return fail(404, "Viaggio non disponibile.");
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
  const group = supplierBatchInput.safeParse(raw);
  const mail = supplierEmailInput.safeParse(raw);
  const individual = mail.success ? mail : supplierRequestInput.safeParse(raw);
  if (!group.success && !individual.success)
    return fail(400, "Controlli la selezione di servizi e fornitori.");
  const input = group.success
    ? { version: group.data.trip_version, requests: group.data.requests }
    : individual.success
      ? { version: individual.data.trip_version, requests: [individual.data] }
      : null;
  if (!input) return fail(400, "Selezione non valida.");

  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from("experience_trips")
      .select("payload,updated_at")
      .eq("id", id.data)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail(404, "Viaggio non disponibile.");
    if (data.updated_at !== input.version) {
      return fail(
        409,
        "Il viaggio è stato aggiornato. Ricarichi la scheda prima di creare il PDF.",
      );
    }
    const trip = tripPayloadSchema.parse(data.payload);
    const catalogue = supplierRequestServices(trip.ids);
    if (
      input.requests.some((entry) =>
        entry.services.some(
          (service) => !catalogue.some((item) => item.id === service),
        ),
      )
    )
      return fail(400, "La selezione contiene servizi estranei al viaggio.");

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
    const facts = [
      {
        label: "Destinazione",
        value: trip.lake === "Da scegliere insieme" ? "Da definire" : trip.lake,
      },
    ];
    const details = trip.details;
    if (details) {
      facts.push({ label: "Numero di ospiti", value: String(details.guests) });
      if (details.arrival)
        facts.push({
          label: "Arrivo indicativo",
          value: date.format(new Date(details.arrival + "T12:00:00Z")),
        });
      if (details.departure)
        facts.push({
          label: "Partenza indicativa",
          value: date.format(new Date(details.departure + "T12:00:00Z")),
        });
    }

    // All document text comes from controlled labels or explicit operational fields.
    // Travel titles, contact details, free text, budgets and quotes are never included.
    const files = [];
    for (const entry of input.requests) {
      const selected = new Set(entry.services);
      const code =
        "EXP-F-" +
        createHash("sha256")
          .update(
            JSON.stringify([
              id.data,
              data.updated_at,
              [...selected].sort(),
              ...(entry.supplier_id ? [entry.supplier_id] : []),
            ]),
          )
          .digest("hex")
          .slice(0, 12)
          .toUpperCase();
      const bytes = await renderExperiencePdf({
        title: "Richiesta di quotazione",
        status: "Modulo per il fornitore",
        summary: { label: "Codice richiesta", value: code },
        facts,
        supplierServices: catalogue.filter((item) => selected.has(item.id)),
        documentDate: new Date(data.updated_at),
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
    if (mail.success) {
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
      const recipient = mail.data.email.toLowerCase();
      const recipientHash = createHash("sha256")
        .update(recipient)
        .digest("hex");
      try {
        const messageId = await sendExperienceSupplierQuoteEmail({
          recipient: mail.data.email,
          code,
          pdf: bytes,
          deliveryKey: `experience-supplier-${code}-${recipientHash}`,
        });
        await logAdminAction(
          auth.userId,
          "experience_supplier_quote_email",
          "experience_supplier",
          mail.data.supplier_id,
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
