import { createServiceClient } from '@/lib/supabase/server';
import { isTikTokConfigured } from '@/lib/tiktok-shop/client';
import { TikTokAdmin } from '@/components/admin/TikTokAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'TikTok Shop — Admin SILKinCOM', robots: { index: false } };

export default async function AdminTikTokPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const sp = await searchParams;
  const supabase = createServiceClient();

  const { data: integ } = await supabase
    .from('integrations')
    .select('connected_at, metadata')
    .eq('provider', 'tiktok_shop')
    .maybeSingle();

  const [{ data: orders, count: orderCount }, { data: products, count: productCount }] = await Promise.all([
    supabase.from('tiktok_orders')
      .select('order_id, status, buyer_name, total_amount, currency, create_time', { count: 'exact' })
      .order('create_time', { ascending: false, nullsFirst: false }).limit(50),
    supabase.from('tiktok_products')
      .select('product_id, title, status, price, currency', { count: 'exact' })
      .order('synced_at', { ascending: false }).limit(50),
  ]);

  const meta = (integ?.metadata as Record<string, string | null> | null) ?? {};

  return (
    <TikTokAdmin
      configured={isTikTokConfigured()}
      connected={Boolean(integ)}
      sellerName={meta.seller_name ?? null}
      shopName={meta.shop_name ?? null}
      shopRegion={meta.shop_region ?? null}
      counts={{ products: productCount ?? 0, orders: orderCount ?? 0 }}
      orders={(orders ?? []) as never[]}
      products={(products ?? []) as never[]}
      error={sp.error}
    />
  );
}
