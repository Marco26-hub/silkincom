/**
 * GET /api/tiktok-shop/status  (admin) — connection state + mirror counts.
 */
import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { isTikTokConfigured } from '@/lib/tiktok-shop/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const supabase = createServiceClient();
  const { data: integ } = await supabase
    .from('integrations')
    .select('connected_at, expires_at, metadata')
    .eq('provider', 'tiktok_shop')
    .maybeSingle();

  const [{ count: products }, { count: orders }] = await Promise.all([
    supabase.from('tiktok_products').select('product_id', { count: 'exact', head: true }),
    supabase.from('tiktok_orders').select('order_id', { count: 'exact', head: true }),
  ]);

  const meta = (integ?.metadata as Record<string, unknown> | null) ?? {};
  return NextResponse.json({
    configured: isTikTokConfigured(),
    connected: Boolean(integ),
    connectedAt: integ?.connected_at ?? null,
    sellerName: meta.seller_name ?? null,
    shopName: meta.shop_name ?? null,
    shopRegion: meta.shop_region ?? null,
    counts: { products: products ?? 0, orders: orders ?? 0 },
  });
}
