/**
 * Customer return request.
 *
 * POST /api/returns
 * Body: { order_id, reason, customer_notes? }
 *
 * Rules:
 * - Auth required, must be order owner
 * - Order must be 'delivered' (or shipped, configurable)
 * - Within 14 days of delivered_at
 * - One open return per order
 * - Return number auto-generated (RT-YYYYMMDD-NNNN)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETURN_WINDOW_DAYS = 14;
const VALID_REASONS = [
  'defective',
  'wrong_item',
  'not_as_described',
  'changed_mind',
  'damaged_shipping',
  'too_small',
  'too_large',
  'other',
] as const;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = body?.order_id;
  const reason = body?.reason;
  const customerNotes = body?.customer_notes ? String(body.customer_notes).slice(0, 2000) : null;

  if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Motivo non valido' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify order ownership + state + window
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, customer_id, delivered_at, total_amount')
    .eq('id', orderId)
    .single();

  if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  if (order.status !== 'delivered') {
    return NextResponse.json({ error: 'Reso disponibile solo per ordini consegnati' }, { status: 409 });
  }
  if (!order.delivered_at) {
    return NextResponse.json({ error: 'Data di consegna mancante' }, { status: 409 });
  }
  const daysSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
    return NextResponse.json(
      { error: `Finestra di reso scaduta (${RETURN_WINDOW_DAYS} giorni dalla consegna)` },
      { status: 409 }
    );
  }

  // Check for existing open return
  const { data: existing } = await supabase
    .from('returns')
    .select('id, return_number, status')
    .eq('order_id', orderId)
    .not('status', 'in', '(rejected,cancelled,refunded)')
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'Reso già in corso per questo ordine', return_number: existing[0].return_number },
      { status: 409 }
    );
  }

  // Generate return number
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await supabase
    .from('returns')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const returnNumber = `RT-${datePart}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data: created, error: insertError } = await supabase
    .from('returns')
    .insert({
      return_number: returnNumber,
      order_id: orderId,
      customer_id: user.id,
      status: 'requested',
      reason,
      customer_notes: customerNotes,
      refund_amount: order.total_amount,
    })
    .select('id, return_number')
    .single();

  if (insertError || !created) {
    console.error('Return insert failed:', insertError);
    return NextResponse.json({ error: 'Errore creazione reso' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    return_id: created.id,
    return_number: created.return_number,
    message: 'Richiesta di reso inviata. Riceverà istruzioni via email.',
  });
}
