/**
 * GET /api/admin/analytics/overview?range=7d|30d|90d
 *
 * Aggregates the first-party analytics_events via the SECURITY DEFINER SQL
 * helpers (one round-trip each) so the dashboard never pulls raw rows.
 * Returns: summary funnel + totals, daily series, top pages, top products,
 * referrers. Admin / super_admin only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

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

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const r = new URL(req.url).searchParams.get('range') ?? '30d';
  const days = r === '7d' ? 7 : r === '90d' ? 90 : 30;

  const supabase = createServiceClient();
  const [summary, daily, paths, products, referrers] = await Promise.all([
    supabase.rpc('analytics_summary', { days }),
    supabase.rpc('analytics_daily', { days }),
    supabase.rpc('analytics_top_paths', { days, lim: 12 }),
    supabase.rpc('analytics_top_products', { days, lim: 10 }),
    supabase.rpc('analytics_referrers', { days, lim: 10 }),
  ]);

  const s = summary.data?.[0] ?? {
    sessions: 0, pageviews: 0, product_views: 0, add_to_cart: 0,
    begin_checkout: 0, purchases: 0, revenue: 0, devices: {}, countries: {},
  };

  return NextResponse.json({
    range: { days },
    summary: s,
    daily: daily.data ?? [],
    topPaths: paths.data ?? [],
    topProducts: products.data ?? [],
    referrers: referrers.data ?? [],
    errors: [summary.error, daily.error, paths.error, products.error, referrers.error]
      .filter(Boolean)
      .map((e) => e!.message),
  });
}
