/**
 * POST /api/google-merchant/push  (admin, GATED)
 *
 * Inserts/updates the published catalogue into Google Merchant Center via the
 * Content API custombatch. Outward-facing → requires { confirm: true } in the
 * body (400 otherwise), exactly like the gated Etsy push.
 *
 * Pushes both content languages (it + en) for target country IT, reusing the
 * same field mapping as the RSS feed. After a push, run the pull to refresh
 * the approval-status mirror.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { merchantProductsBatch, merchantConfig, isMerchantConfigured } from '@/lib/google-merchant/client';
import { fetchPublishedProducts, buildContentApiProduct } from '@/lib/google-merchant/mapping';

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

const LANGS: Array<'it' | 'en'> = ['it', 'en'];

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  if (!isMerchantConfigured()) {
    return NextResponse.json({ ok: false, error: 'Google Merchant non configurato.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json({ ok: false, error: 'Conferma richiesta: invia { confirm: true } per pubblicare su Google Merchant.' }, { status: 400 });
  }

  try {
    const { merchantId } = merchantConfig();
    const supabase = createServiceClient();
    const products = await fetchPublishedProducts(supabase);

    const entries = products.flatMap((p, pi) =>
      LANGS.map((lang, li) => ({
        batchId: pi * LANGS.length + li,
        merchantId,
        method: 'insert' as const,
        product: buildContentApiProduct(p, lang),
      })),
    );

    if (!entries.length) {
      return NextResponse.json({ ok: true, pushed: 0, failed: 0, errors: [] });
    }

    const result = await merchantProductsBatch(entries);
    const resEntries = result.entries ?? [];
    const errors = resEntries
      .filter((e) => e.errors?.errors?.length)
      .map((e) => ({ batchId: e.batchId, message: e.errors?.errors?.[0]?.message ?? 'errore sconosciuto' }));
    const pushed = resEntries.length - errors.length;

    return NextResponse.json({
      ok: true,
      pushed,
      failed: errors.length,
      total: entries.length,
      errors: errors.slice(0, 20),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
