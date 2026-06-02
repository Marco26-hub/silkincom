/**
 * POST /api/etsy/pull?what=all|listings|orders
 *
 * Read-only pull of Etsy data into the dedicated mirror tables
 * (etsy_listings / etsy_orders). Never writes to site products / orders /
 * inventory. Admin / super_admin only. Logs each pull to etsy_sync_log.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { pullEtsyListings } from '@/lib/etsy/pull-listings';
import { pullEtsyOrders } from '@/lib/etsy/pull-orders';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const what = new URL(req.url).searchParams.get('what') ?? 'all';
  const supabase = createServiceClient();
  const out: Record<string, unknown> = {};

  async function run(action: 'pull_listings' | 'pull_orders', fn: () => Promise<{ synced: number; errors: string[] }>) {
    const res = await fn();
    await supabase.from('etsy_sync_log').insert({
      action,
      product_count: res.synced,
      error_message: res.errors.length ? res.errors.join(' | ').slice(0, 1000) : null,
    });
    out[action] = res;
  }

  try {
    if (what === 'all' || what === 'listings') {
      await run('pull_listings', () => pullEtsyListings(supabase));
    }
    if (what === 'all' || what === 'orders') {
      await run('pull_orders', () => pullEtsyOrders(supabase));
    }
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
