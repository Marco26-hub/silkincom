/**
 * POST /api/admin/orders/[id]/resend-confirmation  (admin)
 *
 * Manually (re)sends the customer order-confirmation email. Normally the Stripe
 * webhook sends it on payment success; this is the fallback when the webhook
 * didn't fire (e.g. the misconfigured-URL incident on SK-20260602-0038) or when
 * the admin just wants to resend it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { sendOrderConfirmationEmail } from '@/lib/email';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id } = await params;
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('customer_email, order_number, total_amount')
    .eq('id', id)
    .single();

  if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

  try {
    await sendOrderConfirmationEmail(order.customer_email, order.order_number, Number(order.total_amount));
    return NextResponse.json({ ok: true, to: order.customer_email });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
