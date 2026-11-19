import { NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { bookingJson as json, bookingOriginMatches, guestToken, hashBookingToken } from "@/lib/experience-booking";
import { splitQuoteConditions } from "@/lib/experience-payment";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  if (!bookingOriginMatches(request)) return json({ error: "Origine non valida." }, 403);
  const limited = rateLimit(request, 25, 60_000);
  if (limited) return limited;
  const raw = await request.text();
  if (raw.length > 2048) return json({ error: "Richiesta troppo grande." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: "Richiesta non valida." }, 400); }
  const parsed = z.object({
    token: z.string().regex(guestToken),
    action: z.enum(["view", "accept", "pay"]),
  }).strict().safeParse(body);
  if (!parsed.success) return json({ error: "Link non valido." }, 400);
  try {
    const db = createServiceClient();
    const hash = hashBookingToken(parsed.data.token);
    const row = await db.from("experience_bookings")
      .select("quote_id,accepted_at,deposit_at,balance_at,deposit_session,balance_session")
      .eq("token_hash", hash).maybeSingle();
    if (row.error) throw row.error;
    if (!row.data) return json({ error: "Link non disponibile. Chiedi un nuovo link a SILKinCOM." }, 404);
    const booking = row.data;
    const result = await db.from("experience_quotes")
      .select("id,trip_id,total_cents,inclusions,exclusions,conditions,valid_until,trip_updated_at,published_at")
      .eq("id", booking.quote_id).eq("status", "sent").single();
    if (result.error) throw result.error;
    const q = result.data;
    const terms = splitQuoteConditions(q.conditions);
    if (parsed.data.action === "accept") {
      const accepted = await db.rpc("experience_booking_transition", {
        p_quote: q.id, p_action: "accept", p_token: hash, p_reference: null, p_amount: null,
      });
      if (accepted.error) throw accepted.error;
      if (!accepted.data) return json({ error: "La proposta è scaduta o superata. Contatta SILKinCOM." }, 409);
      booking.accepted_at = booking.accepted_at ?? new Date().toISOString();
    }
    const deposit = Math.ceil(q.total_cents / 2);
    const amount = booking.deposit_at ? q.total_cents - deposit : deposit;
    const canPay = Boolean(booking.accepted_at && !booking.balance_at && amount > 0 &&
      !terms.link && (terms.method === "card" || terms.method === "either"));
    if (parsed.data.action === "pay") {
      if (process.env.NODE_ENV !== "production" || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"))
        return json({ error: "Il pagamento reale è disattivato in anteprima." }, 403);
      if (!canPay || amount < 50) return json({ error: "Pagamento con carta non disponibile per questa fase." }, 409);
      const stripe = getStripe();
      const stage = booking.deposit_at ? "balance" : "deposit";
      const field = stage === "deposit" ? "deposit_session" : "balance_session";
      const previous = booking[field];
      if (previous) {
        const session = await stripe.checkout.sessions.retrieve(previous);
        if (session.status === "open" && session.url) return json({ url: session.url });
        if (session.status !== "expired") return json({ error: "Pagamento in verifica. Ricarica tra poco." }, 409);
      }
      const home = new URL("/it/experience/preventivo", process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).toString();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          quantity: 1,
          price_data: { currency: "eur", unit_amount: amount,
            product_data: { name: stage === "deposit" ? "SILKinCOM Experience · Acconto" : "SILKinCOM Experience · Saldo" } },
        }],
        payment_intent_data: { metadata: { experience_quote_id: q.id, experience_stage: stage } },
        success_url: home,
        cancel_url: home,
      }, { idempotencyKey: `experience-${q.id}-${stage}-${previous ?? "initial"}` });
      let update = db.from("experience_bookings").update({ [field]: session.id }).eq("quote_id", q.id).eq("token_hash", hash).is(stage === "deposit" ? "deposit_at" : "balance_at", null);
      update = previous ? update.eq(field, previous) : update.is(field, null);
      const saved = await update.select("quote_id").maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data || !session.url) return json({ error: "Ricarica il preventivo per continuare il pagamento." }, 409);
      return json({ url: session.url });
    }
    return json({
      total: q.total_cents, deposit, expiry: q.valid_until,
      inclusions: q.inclusions, exclusions: q.exclusions,
      conditions: terms.conditions, payment: terms.payment, legacyLink: booking.accepted_at && !booking.deposit_at ? terms.link : "",
      accepted: Boolean(booking.accepted_at), depositPaid: Boolean(booking.deposit_at),
      balancePaid: Boolean(booking.balance_at || (booking.deposit_at && q.total_cents === deposit)), canPay,
    });
  } catch (error) {
    console.error("[experience-booking]", (error as { code?: string }).code ?? "operation_failed");
    return json({ error: "Servizio temporaneamente non disponibile. Riprova tra poco." }, 503);
  }
}
