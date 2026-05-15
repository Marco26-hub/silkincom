import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { sendShippingNotificationEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/audit';

const ADMIN_ROLES = ['admin', 'super_admin', 'order_manager'];

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const, userId: user.id };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();
  const { status, tracking_number, carrier, notes } = body;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('orders')
    .select('id, status, customer_email, order_number, total_amount, shipped_at')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (status && status !== existing.status) update.status = status;
  if (tracking_number !== undefined) update.tracking_number = tracking_number;
  if (status === 'shipped' && !existing.status.includes('shipped')) update.shipped_at = new Date().toISOString();
  if (status === 'delivered') update.delivered_at = new Date().toISOString();
  if (notes) update.admin_notes = notes;

  const { error } = await supabase.from('orders').update(update).eq('id', id);
  if (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Email cliente quando spedito — solo al primo passaggio in shipped (idempotente)
  if (status === 'shipped' && tracking_number && process.env.RESEND_API_KEY && !existing.shipped_at) {
    try {
      await sendShippingNotificationEmail(
        existing.customer_email,
        existing.order_number,
        tracking_number,
        carrier ?? 'DHL'
      );
    } catch (e) {
      console.error('Shipping email failed:', e);
    }
  }

  // Schedule review request email +14 days when order delivered (idempotent: skip if already scheduled)
  if (status === 'delivered' && existing.customer_email) {
    try {
      // Skip if already scheduled for this order
      const { data: existingJob } = await supabase
        .from('email_lifecycle_jobs')
        .select('id')
        .eq('email_type', 'review_request')
        .eq('recipient_email', existing.customer_email)
        .contains('payload', { order_id: id })
        .limit(1);

      if (!existingJob || existingJob.length === 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, product_slug, products(images)')
          .eq('order_id', id);

        const reviewItems = (items || []).slice(0, 4).map((it: any) => ({
          name: it.product_name,
          slug: it.product_slug,
          image: Array.isArray(it.products?.images) ? it.products.images[0] : undefined,
        }));

        const scheduledAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('email_lifecycle_jobs').insert({
          recipient_email: existing.customer_email,
          email_type: 'review_request',
          scheduled_at: scheduledAt,
          status: 'pending',
          payload: {
            order_id: id,
            order_number: existing.order_number,
            items: reviewItems,
          },
        });
      }
    } catch (e) {
      console.error('Review request scheduling failed:', e);
    }
  }

  await logAdminAction(auth.userId, 'update_order', 'order', id, { status, tracking_number, carrier, notes });

  return NextResponse.json({ ok: true });
}
