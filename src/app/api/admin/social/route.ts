/**
 * GET /api/admin/social?days=30
 *
 * Admin-only. Two integrated layers:
 *  1. Publishing activity from Blotato (connected accounts + scheduled /
 *     published / failed posts). Degrades to { configured:false } without
 *     BLOTATO_API_KEY.
 *  2. Site-side social analytics (`siteSocial`): the funnel + revenue each
 *     social platform drives on the website, from first-party analytics_events
 *     attributed by referrer host. Independent of Blotato — always returned.
 *
 * NOTE: native engagement (followers, reach, likes, views ON the posts) still
 * requires each platform's own API and is not included here.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import {
  isBlotatoConfigured,
  listBlotatoAccounts,
  listBlotatoPosts,
  type BlotatoPost,
} from '@/lib/blotato/client';
import { socialPlatformOf } from '@/lib/social/referrers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

type SocialFunnel = { visits: number; productViews: number; addToCart: number; purchases: number; revenue: number };
const emptyFunnel = (): SocialFunnel => ({ visits: 0, productViews: 0, addToCart: 0, purchases: 0, revenue: 0 });

async function computeSiteSocial(days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('analytics_events')
    .select('event_type, referrer_host, value')
    .gte('created_at', since)
    .not('referrer_host', 'is', null)
    .limit(20_000);

  const byPlatform: Record<string, SocialFunnel> = {};
  const totals = emptyFunnel();
  for (const e of (data ?? []) as Array<{ event_type: string; referrer_host: string | null; value: number | null }>) {
    const p = socialPlatformOf(e.referrer_host);
    if (!p) continue;
    byPlatform[p] ??= emptyFunnel();
    for (const f of [byPlatform[p], totals]) {
      if (e.event_type === 'pageview') f.visits++;
      else if (e.event_type === 'product_view') f.productViews++;
      else if (e.event_type === 'add_to_cart') f.addToCart++;
      else if (e.event_type === 'purchase') { f.purchases++; f.revenue += Number(e.value || 0); }
    }
  }
  return { days, byPlatform, totals };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
  const siteSocial = await computeSiteSocial(days);

  if (!isBlotatoConfigured()) {
    return NextResponse.json({ configured: false, siteSocial });
  }

  try {
    const [accounts, posts] = await Promise.all([
      listBlotatoAccounts(),
      listBlotatoPosts({ limit: 250, maxPages: 3 }),
    ]);

    const bucket = (t: BlotatoPost['state']['type']) =>
      posts.filter((p) => p.state?.type === t);

    const scheduled = bucket('scheduled').sort((a, b) => a.postTime.localeCompare(b.postTime));
    const published = bucket('published').sort((a, b) => b.postTime.localeCompare(a.postTime));
    const failed = bucket('failed').sort((a, b) => b.postTime.localeCompare(a.postTime));

    const byPlatform: Record<string, { scheduled: number; published: number; failed: number }> = {};
    for (const p of posts) {
      const k = p.platform;
      byPlatform[k] ??= { scheduled: 0, published: 0, failed: 0 };
      const t = p.state?.type;
      if (t === 'scheduled' || t === 'published' || t === 'failed') byPlatform[k][t]++;
    }

    return NextResponse.json({
      configured: true,
      accounts,
      counts: { scheduled: scheduled.length, published: published.length, failed: failed.length, byPlatform },
      scheduled,
      published,
      failed,
      siteSocial,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message, siteSocial }, { status: 502 });
  }
}
