import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/server";
import { bookingJson as json, bookingOriginMatches, hashBookingToken } from "@/lib/experience-booking";
import { tripPayloadSchema } from "@/lib/experience-trips";
import { rateLimit } from "@/lib/rate-limit";

const id = z.string().uuid();
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("guest"), contact: z.union([id, z.string().regex(/^\d{1,18}$/)]) }),
  z.object({ action: z.literal("share"), quote: id }),
  z.object({ action: z.literal("status"), quote: id }),
  z.object({ action: z.literal("deposit"), quote: id, amount: z.number().int().positive(), reference: z.string().trim().min(1).max(140) }),
  z.object({ action: z.literal("balance"), quote: id, amount: z.number().int().positive(), reference: z.string().trim().min(1).max(140) }),
]);

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return json({ error: "Accesso amministratore richiesto." }, auth.status);
  if (!bookingOriginMatches(request)) return json({ error: "Origine non valida." }, 403);
  const limited = rateLimit(request, 30, 60_000);
  if (limited) return limited;
  const body = await request.text();
  if (body.length > 4096) return json({ error: "Richiesta troppo grande." }, 413);
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return json({ error: "Richiesta non valida." }, 400); }
  const parsed = input.safeParse(raw);
  if (!parsed.success) return json({ error: "Controlla i dati inseriti." }, 400);
  const data = parsed.data;
  try {
    const db = createServiceClient();
    if (data.action === "guest") {
      const contact = await db.from("contacts").select("id,messaggio,experience_payload")
        .eq("id", data.contact).like("messaggio", "SILKinCOM EXPERIENCE%").maybeSingle();
      if (contact.error) throw contact.error;
      if (!contact.data || /\n\nViaggio account verificato:/.test(contact.data.messaggio))
        return json({ error: "Richiesta ospite non disponibile." }, 404);
      const lake = contact.data.messaggio.split("\n")[1]?.slice("Destinazione: ".length);
      const validLake = ["Lago di Como", "Lago Maggiore", "Entrambi i laghi"].find((value) => value === lake);
      const payload = tripPayloadSchema.safeParse(contact.data.experience_payload);
      if (contact.data.experience_payload && !payload.success)
        return json({ error: "Le scelte salvate nella richiesta non sono valide." }, 409);
      const saved = await db.from("experience_trips").upsert({
        guest_contact_id: data.contact,
        title: `Richiesta ospite n. ${data.contact}`,
        payload: payload.success ? payload.data : { version: 1, ids: [], lake: validLake || "Da scegliere insieme" },
      }, { onConflict: "guest_contact_id", ignoreDuplicates: true });
      if (saved.error) throw saved.error;
      const trip = await db.from("experience_trips").select("id").eq("guest_contact_id", data.contact).single();
      if (trip.error) throw trip.error;
      return json({ id: trip.data.id });
    }
    if (data.action === "status") {
      const result = await db.from("experience_bookings")
        .select("accepted_at,deposit_at,balance_at,deposit_session,balance_session")
        .eq("quote_id", data.quote).maybeSingle();
      if (result.error) throw result.error;
      return json({ booking: result.data });
    }
    if (data.action === "share") {
      const quote = await db.from("experience_quotes").select("id,trip_id,status").eq("id", data.quote).maybeSingle();
      if (quote.error) throw quote.error;
      if (quote.data?.status !== "sent") return json({ error: "Pubblica il preventivo prima di creare il link." }, 409);
      const token = randomBytes(32).toString("hex");
      const result = await db.from("experience_bookings").upsert({
        quote_id: quote.data.id, trip_id: quote.data.trip_id, token_hash: hashBookingToken(token),
      }, { onConflict: "quote_id" });
      if (result.error) throw result.error;
      return json({ path: `/it/experience/preventivo#${token}` });
    }
    const transition = await db.rpc("experience_booking_transition", {
      p_quote: data.quote, p_action: data.action, p_token: null,
      p_reference: `bonifico:${data.reference}`, p_amount: data.amount,
    });
    if (transition.error) throw transition.error;
    if (!transition.data) return json({ error: "Verifica accettazione, importo e ordine dei pagamenti." }, 409);
    return json({ ok: true });
  } catch (error) {
    console.error("[experience-booking-admin]", (error as { code?: string }).code ?? "operation_failed");
    return json({ error: "Operazione non disponibile. Controlla la configurazione del database e riprova." }, 503);
  }
}
