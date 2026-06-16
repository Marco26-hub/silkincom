/**
 * POST /api/recesso/confirm  (public, no auth)
 *
 * Step 2 — the deliberate, final act of withdrawal (art. 54-bis Codice del
 * Consumo). Re-validates the order, records the request in `withdrawals`
 * (durable record, with date/time of transmission) and sends the legally
 * mandated acknowledgement of receipt on a durable medium (email) plus an
 * internal alert.
 * Body: { orderNumber, email, locale }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { findOrderForWithdrawal, buildDeclaration, isRecessoEnabled } from '@/lib/recesso';
import {
  sendWithdrawalAcknowledgementEmail,
  sendOwnerWithdrawalNotificationEmail,
} from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCALES = ['it', 'en', 'de', 'fr', 'es', 'pt', 'nl'];

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  // Admin kill-switch: behave as a non-existent endpoint when disabled.
  if (!(await isRecessoEnabled())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const orderNumber = String(body?.orderNumber || '');
  const email = String(body?.email || '');
  const locale = LOCALES.includes(String(body?.locale)) ? String(body.locale) : 'it';
  if (!orderNumber.trim() || !email.trim()) {
    return NextResponse.json({ error: 'Dati mancanti.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const order = await findOrderForWithdrawal(supabase, orderNumber, email);
  if (!order) {
    return NextResponse.json({ error: 'Nessun ordine trovato con questi dati.' }, { status: 404 });
  }
  if (!order.withinWindow) {
    return NextResponse.json(
      { error: 'Il termine di 14 giorni per il recesso è scaduto.' },
      { status: 409 },
    );
  }
  // Idempotent: one withdrawal per order. Return the existing reference.
  if (order.alreadyRequested) {
    return NextResponse.json(
      { ok: true, alreadyRequested: true, withdrawalNumber: order.existingNumber },
      { status: 200 },
    );
  }

  const submittedAt = new Date();
  const declaration = buildDeclaration(locale, {
    orderNumber: order.orderNumber,
    name: order.customerName,
    items: order.items,
  });

  const isoDay = submittedAt.toISOString().slice(0, 10);
  const datePart = isoDay.replace(/-/g, '');
  const { count } = await supabase
    .from('withdrawals')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${isoDay}T00:00:00Z`);
  const withdrawalNumber = `RC-${datePart}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data: created, error: insErr } = await supabase
    .from('withdrawals')
    .insert({
      withdrawal_number: withdrawalNumber,
      order_id: order.id,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      items: order.items,
      declaration,
      locale,
      status: 'received',
      submitted_at: submittedAt.toISOString(),
    })
    .select('id, withdrawal_number')
    .single();

  if (insErr || !created) {
    console.error('withdrawal insert failed:', insErr);
    return NextResponse.json({ error: 'Errore nella registrazione del recesso.' }, { status: 500 });
  }

  // Durable-medium receipt — the record is already persisted, so a send failure
  // is logged + retryable from admin rather than losing the request.
  let receiptSent = true;
  try {
    await sendWithdrawalAcknowledgementEmail({
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      withdrawalNumber,
      items: order.items,
      declaration,
      submittedAt,
    });
    await supabase
      .from('withdrawals')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', created.id);
  } catch (err) {
    receiptSent = false;
    console.error('withdrawal receipt email failed:', err);
  }

  // Internal alert — best-effort, never blocks the response.
  try {
    await sendOwnerWithdrawalNotificationEmail({
      orderNumber: order.orderNumber,
      withdrawalNumber,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      submittedAt,
    });
  } catch (err) {
    console.error('owner withdrawal notification failed:', err);
  }

  return NextResponse.json({ ok: true, withdrawalNumber, receiptSent });
}
