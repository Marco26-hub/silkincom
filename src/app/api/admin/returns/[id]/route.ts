import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { logAdminAction } from '@/lib/audit';
import { sendReturnStatusEmail } from '@/lib/email';

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin', 'order_manager'].includes(profile.role)) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, admin_notes, refund_amount } = body;

  const validStatuses = ['requested', 'approved', 'received', 'refunded', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Stato non valido' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (status) updates.status = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;
  if (refund_amount !== undefined) updates.refund_amount = Number(refund_amount);
  if (status === 'refunded') updates.refunded_at = new Date().toISOString();

  const supabase = createServiceClient();

  // Execute Stripe refund before marking as refunded
  if (status === 'refunded') {
    const { data: ret } = await supabase
      .from('returns')
      .select('order_id, refund_amount')
      .eq('id', id)
      .single();

    if (ret?.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('stripe_payment_intent_id, total_amount')
        .eq('id', ret.order_id)
        .single();

      if (order?.stripe_payment_intent_id) {
        const amountToRefund = Number(ret.refund_amount || order.total_amount);
        const amountCents = Math.round(amountToRefund * 100);
        try {
          await getStripe().refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: amountCents,
          });
        } catch (stripeErr: any) {
          console.error('Stripe refund failed:', stripeErr);
          return NextResponse.json(
            { error: `Rimborso Stripe fallito: ${stripeErr.message}` },
            { status: 502 }
          );
        }
      }

      await supabase.from('orders').update({ status: 'refunded' }).eq('id', ret.order_id);
    }
  }

  const { error } = await supabase.from('returns').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, `return_${status}`, 'return', id, { status, admin_notes, refund_amount });

  // Send customer email for actionable statuses
  if (status === 'approved' || status === 'refunded' || status === 'rejected') {
    try {
      const { data: ret } = await supabase
        .from('returns')
        .select('order_id')
        .eq('id', id)
        .single();
      if (ret?.order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('customer_email, order_number')
          .eq('id', ret.order_id)
          .single();
        if (order?.customer_email) {
          await sendReturnStatusEmail(
            order.customer_email,
            String(order.order_number),
            status as 'approved' | 'refunded' | 'rejected',
            status === 'refunded' ? Number(refund_amount || 0) : undefined
          );
        }
      }
    } catch (emailErr) {
      console.error('Return status email failed:', emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
