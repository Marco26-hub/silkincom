/**
 * Daily cron: push the published catalogue to Google Merchant Center via the
 * Content API (custombatch). Keeps the "Content API" data source fresh so it
 * never goes stale ("da aggiornare"). Triggered by Vercel Cron (vercel.json)
 * at 04:00 Europe/Rome; authenticated via CRON_SECRET (Bearer or x-vercel-cron).
 *
 * Pushes both content languages (it + en) for target country IT, with the
 * correct Google product category per brand line (shared mapping).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { merchantProductsBatch, merchantConfig, isMerchantConfigured } from '@/lib/google-merchant/client';
import { fetchPublishedProducts, buildContentApiProduct } from '@/lib/google-merchant/mapping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const LANGS: Array<'it' | 'en'> = ['it', 'en'];

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (req.headers.get('authorization') === `Bearer ${expected}`) return true;
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isMerchantConfigured()) {
    return NextResponse.json({ ok: false, error: 'Google Merchant non configurato.' }, { status: 400 });
  }

  try {
    const { merchantId } = merchantConfig();
    const supabase = createServiceClient();
    const products = await fetchPublishedProducts(supabase);

    // category_id -> slug, to emit the correct Google product category.
    const { data: cats } = await supabase.from('categories').select('id, slug');
    const catSlugById = new Map<string, string>((cats || []).map((c: any) => [c.id, c.slug]));

    const entries = products.flatMap((p: any, pi: number) =>
      LANGS.map((lang, li) => ({
        batchId: pi * LANGS.length + li,
        merchantId,
        method: 'insert' as const,
        product: buildContentApiProduct(p, lang, catSlugById.get(p.category_id)),
      })),
    );

    if (!entries.length) {
      return NextResponse.json({ ok: true, pushed: 0, failed: 0, errors: [] });
    }

    const result = await merchantProductsBatch(entries);
    const resEntries = result.entries ?? [];
    const errors = resEntries
      .filter((e: any) => e.errors?.errors?.length)
      .map((e: any) => ({ batchId: e.batchId, message: e.errors?.errors?.[0]?.message ?? 'errore sconosciuto' }));

    return NextResponse.json({
      ok: true,
      pushed: resEntries.length - errors.length,
      failed: errors.length,
      total: entries.length,
      errors: errors.slice(0, 20),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

export const POST = GET;
