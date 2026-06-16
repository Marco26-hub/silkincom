/**
 * POST /api/recesso/lookup  (public, no auth)
 *
 * Step 1 of the withdrawal flow: identify the order by number + email and
 * return a summary so the customer can review before confirming. No write.
 * Body: { orderNumber, email }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { findOrderForWithdrawal, isRecessoEnabled } from '@/lib/recesso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 8, 60_000);
  if (limited) return limited;

  // Admin kill-switch: behave as a non-existent endpoint when disabled.
  if (!(await isRecessoEnabled('api-lookup'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const orderNumber = String(body?.orderNumber || '');
  const email = String(body?.email || '');
  if (!orderNumber.trim() || !email.trim()) {
    return NextResponse.json({ error: 'Inserisci numero ordine ed email.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const order = await findOrderForWithdrawal(supabase, orderNumber, email);
  // Generic message: never reveal whether the order number or the email is the
  // part that didn't match (anti-enumeration).
  if (!order) {
    return NextResponse.json({ error: 'Nessun ordine trovato con questi dati.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: order.items,
      total: order.total,
      currency: order.currency,
      withinWindow: order.withinWindow,
      alreadyRequested: order.alreadyRequested,
      existingNumber: order.existingNumber,
    },
  });
}
