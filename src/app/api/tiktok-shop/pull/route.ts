/**
 * POST /api/tiktok-shop/pull?what=all|orders|products  (admin)
 *
 * Read-only pull of the TikTok Shop catalogue + orders into the dedicated
 * mirror tables (tiktok_products / tiktok_orders), like the Etsy pull. Field
 * mappings are best-effort over the v2 search responses; the full payload is
 * always kept in `raw` so nothing is lost while we tune the mapping live.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { tiktokFetch } from '@/lib/tiktok-shop/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

const n = (v: unknown) => (v == null ? null : Number(v));

async function pullProducts(): Promise<{ count: number }> {
  const data = await tiktokFetch<{ products?: any[] }>('/product/202309/products/search', {
    method: 'POST',
    query: { page_size: '50' },
    body: {},
  });
  const products = data?.products ?? [];
  const supabase = createServiceClient();
  const rows = products.map((p) => ({
    product_id: String(p.id),
    title: p.title ?? null,
    status: p.status ?? null,
    price: n(p.skus?.[0]?.price?.sale_price ?? p.skus?.[0]?.price?.tax_exclusive_price),
    currency: p.skus?.[0]?.price?.currency ?? null,
    main_image_url: p.main_images?.[0]?.uri ?? p.main_images?.[0]?.url ?? null,
    description: p.description ?? null,
    category_id: p.category_id ? String(p.category_id) : null,
    skus: p.skus ?? null,
    raw: p,
    synced_at: new Date().toISOString(),
  }));
  if (rows.length) await supabase.from('tiktok_products').upsert(rows, { onConflict: 'product_id' });
  return { count: rows.length };
}

async function pullOrders(): Promise<{ count: number }> {
  const data = await tiktokFetch<{ orders?: any[] }>('/order/202309/orders/search', {
    method: 'POST',
    query: { page_size: '50' },
    body: {},
  });
  const orders = data?.orders ?? [];
  const supabase = createServiceClient();
  const rows = orders.map((o) => ({
    order_id: String(o.id),
    status: o.status ?? null,
    buyer_email: o.buyer_email ?? null,
    buyer_name: o.recipient_address?.name ?? null,
    total_amount: n(o.payment?.total_amount ?? o.payment?.sub_total),
    payment_amount: n(o.payment?.total_amount),
    currency: o.payment?.currency ?? null,
    create_time: o.create_time ? new Date(Number(o.create_time) * 1000).toISOString() : null,
    items: o.line_items ?? null,
    shipping: o.recipient_address ?? null,
    raw: o,
    synced_at: new Date().toISOString(),
  }));
  if (rows.length) await supabase.from('tiktok_orders').upsert(rows, { onConflict: 'order_id' });
  return { count: rows.length };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const what = new URL(req.url).searchParams.get('what') || 'all';
  const result: Record<string, unknown> = {};
  try {
    if (what === 'all' || what === 'products') result.products = await pullProducts();
    if (what === 'all' || what === 'orders') result.orders = await pullOrders();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message, ...result }, { status: 502 });
  }
}
