/**
 * GET /api/admin/ads/overview?range=7d|30d|90d
 *
 * Returns the data the dashboard needs:
 *   - Aggregate totals across the selected range (spend, impressions,
 *     clicks, conversions, conversion value, derived CTR/CPC/CPA/ROAS).
 *   - Daily series for the trend chart.
 *   - Per-campaign breakdown sorted by spend desc.
 *   - Connection state so the UI knows whether to show the "Connetti" CTA.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const range = new URL(req.url).searchParams.get('range') ?? '30d';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const supabase = createServiceClient();

  const [{ data: integration }, { data: metrics }, { data: campaigns }] = await Promise.all([
    supabase.from('integrations').select('connected_at').eq('provider', 'google_ads').maybeSingle(),
    supabase
      .from('ad_metrics_daily')
      .select('campaign_id, date, impressions, clicks, cost, conversions, conversion_value')
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('ad_campaigns')
      .select('id, external_id, name, status, channel_type, daily_budget, target_roas')
      .eq('source', 'google_ads')
      .order('name'),
  ]);

  const totals = (metrics ?? []).reduce(
    (acc, m) => {
      acc.impressions += Number(m.impressions);
      acc.clicks += Number(m.clicks);
      acc.cost += Number(m.cost);
      acc.conversions += Number(m.conversions);
      acc.conversion_value += Number(m.conversion_value);
      return acc;
    },
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 },
  );

  const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
  const cpc = totals.clicks ? totals.cost / totals.clicks : 0;
  const cpa = totals.conversions ? totals.cost / totals.conversions : 0;
  const roas = totals.cost ? totals.conversion_value / totals.cost : 0;

  // Daily series: collapse to one row per date.
  const byDate = new Map<
    string,
    { date: string; cost: number; conversions: number; clicks: number; impressions: number; conversion_value: number }
  >();
  for (const m of metrics ?? []) {
    const cur = byDate.get(m.date) ?? {
      date: m.date,
      cost: 0,
      conversions: 0,
      clicks: 0,
      impressions: 0,
      conversion_value: 0,
    };
    cur.cost += Number(m.cost);
    cur.conversions += Number(m.conversions);
    cur.clicks += Number(m.clicks);
    cur.impressions += Number(m.impressions);
    cur.conversion_value += Number(m.conversion_value);
    byDate.set(m.date, cur);
  }
  const series = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Per-campaign rollup.
  const byCampaign = new Map<
    string,
    {
      campaign_id: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversion_value: number;
    }
  >();
  for (const m of metrics ?? []) {
    const cur = byCampaign.get(m.campaign_id) ?? {
      campaign_id: m.campaign_id,
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversion_value: 0,
    };
    cur.impressions += Number(m.impressions);
    cur.clicks += Number(m.clicks);
    cur.cost += Number(m.cost);
    cur.conversions += Number(m.conversions);
    cur.conversion_value += Number(m.conversion_value);
    byCampaign.set(m.campaign_id, cur);
  }

  const campaignRows = (campaigns ?? []).map((c) => {
    const stat = byCampaign.get(c.id) ?? {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversion_value: 0,
    };
    return {
      ...c,
      ...stat,
      ctr: stat.impressions ? stat.clicks / stat.impressions : 0,
      cpc: stat.clicks ? stat.cost / stat.clicks : 0,
      cpa: stat.conversions ? stat.cost / stat.conversions : 0,
      roas: stat.cost ? stat.conversion_value / stat.cost : 0,
    };
  }).sort((a, b) => b.cost - a.cost);

  return NextResponse.json({
    connected: !!integration,
    range: { days, since },
    totals: { ...totals, ctr, cpc, cpa, roas },
    series,
    campaigns: campaignRows,
  });
}
