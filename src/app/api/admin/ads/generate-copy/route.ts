/**
 * POST /api/admin/ads/generate-copy
 * Body: { product_slugs: string[], locale?: 'it' | 'en', draft_id?: string }
 *
 * Runs the OpenRouter ad copy generator over the chosen products. If a
 * draft_id is provided, the resulting headlines/descriptions/keywords are
 * written into that ad_drafts row so the admin can edit them in-place.
 * Otherwise the copy is returned for preview.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateAdCopy } from '@/lib/ads/ai-copy';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
  return { ok: true as const, userId: user.id };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as {
    product_slugs?: string[];
    locale?: 'it' | 'en';
    draft_id?: string;
  };
  if (!Array.isArray(body.product_slugs) || body.product_slugs.length === 0) {
    return NextResponse.json({ error: 'product_slugs richiesto' }, { status: 400 });
  }

  try {
    const copy = await generateAdCopy(body.product_slugs, body.locale ?? 'it');

    if (body.draft_id) {
      const supabase = createServiceClient();
      await supabase
        .from('ad_drafts')
        .update({
          headlines: copy.headlines,
          descriptions: copy.descriptions,
          keywords: copy.keywords,
          product_slugs: body.product_slugs,
          generated_with_ai: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.draft_id);
    }

    return NextResponse.json({ ok: true, copy });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
