/**
 * Customer-initiated order cancellation.
 *
 * POST /api/orders/[id]/cancel
 *
 * Rules:
 * - Must be authenticated and own the order
 * - Order must be in 'pending' status (not paid yet)
 * - Order must be within 2-hour cancellation window from created_at
 * - Restores inventory (each order_items quantity returned to stock)
 * - Cancels related abandoned_cart job in email_lifecycle_jobs
 * - Marks order status='cancelled', payment_status='cancelled'
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  const { id: orderId } = await ctx.params;
  if (!orderId) {
    return NextResponse.json({ error: 'Missing order id' }, { status: 400 });
  }

  // Auth check
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Load order + verify ownership
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, customer_id, customer_email, created_at, order_items(product_id, quantity)')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: `Impossibile cancellare ordine in stato '${order.status}'` },
      { status: 409 }
    );
  }

  const ageMs = Date.now() - new Date(order.created_at).getTime();
  if (ageMs > CANCEL_WINDOW_MS) {
    return NextResponse.json(
      { error: 'Finestra di cancellazione scaduta (2 ore dal momento della creazione)' },
      { status: 409 }
    );
  }

  // Restore inventory
  for (const item of (order.order_items as Array<{ product_id: string; quantity: number }>) || []) {
    try {
      // Negative quantity adds back to stock via apply_inventory_movement
      await supabase.rpc('decrement_inventory', {
        p_product_id: item.product_id,
        p_quantity: -item.quantity,
      });
    } catch (e) {
      console.error('Inventory restore failed:', e);
      // Continue — inventory drift is preferable to leaving order pending
    }
  }

  // Mark order cancelled — atomic: only succeeds if status is still 'pending'
  const { data: updatedRows, error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id');

  if (updateErr) {
    console.error('Order cancel update failed:', updateErr);
    return NextResponse.json({ error: 'Errore aggiornamento ordine' }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: 'Ordine non più cancellabile (stato già modificato)' },
      { status: 409 }
    );
  }

  // Cancel pending abandoned_cart job(s) for this order
  await supabase
    .from('email_lifecycle_jobs')
    .update({ status: 'cancelled', last_error: 'order-cancelled-by-customer' })
    .eq('email_type', 'abandoned_cart')
    .eq('status', 'pending')
    .contains('payload', { order_id: orderId });

  return NextResponse.json({ ok: true, message: 'Ordine cancellato' });
}
