/**
 * Manual financial sync trigger. Admin opens /admin/fatture and clicks
 * "Sync now" — this endpoint runs the Stripe and/or Etsy pulls, writes a
 * row to financial_sync_log, and returns the per-source result.
 *
 * Query params:
 *   source=stripe|etsy|all   (default: all)
 *
 * Auth: super_admin or admin only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { syncStripeFinancial } from '@/lib/financial/sync-stripe';
import { syncEtsyFinancial } from '@/lib/financial/sync-etsy';
import { syncGoogleAdsFinancial } from '@/lib/financial/sync-google-ads';

export const runtime = 'nodejs';
export const maxDuration = 300;

const EDITOR_ROLES = ['admin', 'super_admin'];

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !EDITOR_ROLES.includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const, userId: user.id };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const source = (new URL(req.url).searchParams.get('source') || 'all') as
    | 'stripe'
    | 'etsy'
    | 'google_ads'
    | 'all';
  const supabase = createServiceClient();

  const results: Array<Record<string, unknown>> = [];

  async function runOne(name: 'stripe' | 'etsy' | 'google_ads', fn: () => Promise<unknown>) {
    const { data: logRow } = await supabase
      .from('financial_sync_log')
      .insert({ source: name, triggered_by: 'manual' })
      .select('id')
      .single();
    const startedAt = Date.now();
    try {
      const res = (await fn()) as {
        synced: number;
        skipped: number;
        errors: string[];
        durationMs: number;
      };
      await supabase
        .from('financial_sync_log')
        .update({
          synced_count: res.synced,
          skipped_count: res.skipped,
          error_count: res.errors.length,
          errors: res.errors,
          duration_ms: res.durationMs,
          ended_at: new Date().toISOString(),
        })
        .eq('id', logRow?.id);
      results.push({ source: name, ...res });
    } catch (e) {
      const msg = (e as Error).message;
      await supabase
        .from('financial_sync_log')
        .update({
          error_count: 1,
          errors: [msg],
          duration_ms: Date.now() - startedAt,
          ended_at: new Date().toISOString(),
        })
        .eq('id', logRow?.id);
      results.push({ source: name, synced: 0, skipped: 0, errors: [msg] });
    }
  }

  if (source === 'stripe' || source === 'all') {
    await runOne('stripe', () => syncStripeFinancial(supabase));
  }
  if (source === 'etsy' || source === 'all') {
    await runOne('etsy', () => syncEtsyFinancial(supabase));
  }
  if (source === 'google_ads' || source === 'all') {
    await runOne('google_ads', () => syncGoogleAdsFinancial(supabase));
  }

  return NextResponse.json({ ok: true, results });
}
