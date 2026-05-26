/**
 * Daily cron: pull Stripe + Etsy transactions into financial_records.
 *
 * Triggered by Vercel Cron (vercel.json) at 03:00 Europe/Rome. Authenticated
 * via CRON_SECRET (Bearer header or x-vercel-cron). Writes a row per source
 * into financial_sync_log so admin can see history.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { syncStripeFinancial } from '@/lib/financial/sync-stripe';
import { syncEtsyFinancial } from '@/lib/financial/sync-etsy';
import { syncGoogleAdsFinancial } from '@/lib/financial/sync-google-ads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  if (header === `Bearer ${expected}`) return true;
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const out: Record<string, unknown> = {};

  async function runOne(name: 'stripe' | 'etsy' | 'google_ads', fn: () => Promise<unknown>) {
    const { data: logRow } = await supabase
      .from('financial_sync_log')
      .insert({ source: name, triggered_by: 'cron' })
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
      out[name] = res;
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
      out[name] = { synced: 0, errors: [msg] };
    }
  }

  await runOne('stripe', () => syncStripeFinancial(supabase));
  await runOne('etsy', () => syncEtsyFinancial(supabase));
  await runOne('google_ads', () => syncGoogleAdsFinancial(supabase));

  return NextResponse.json({ ok: true, results: out });
}

export const POST = GET;
