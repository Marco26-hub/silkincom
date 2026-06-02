/**
 * POST /api/etsy/translate-en  (admin, confirm-gated)
 *
 * Generates an SEO/GEO-optimised English translation of one Etsy listing's
 * Italian master and pushes it as the Etsy `en` translation
 * (PUT /listings/{id}/translations/en). English is a TRANSLATION — the Italian
 * master listing is never overwritten.
 *
 * One listing per call (body.listingId): the client loops over all listings so
 * no single request risks the serverless timeout. WRITE to Etsy → requires
 * { confirm: true }.
 *
 * Body: { confirm: true, listingId: number }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { etsyFetch, resolveShopId } from '@/lib/etsy/client';
import { translateListing, ETSY_TRANSLATION_LANGS } from '@/lib/etsy/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  const body = await req.json().catch(() => ({})) as { confirm?: boolean; listingId?: number; lang?: string };
  const lang = (body.lang || 'en').toLowerCase();
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'Conferma richiesta: questa operazione pubblica la traduzione su Etsy.' },
      { status: 400 },
    );
  }
  if (!body.listingId) {
    return NextResponse.json({ error: 'listingId richiesto' }, { status: 400 });
  }
  if (!ETSY_TRANSLATION_LANGS[lang]) {
    return NextResponse.json({ error: `Lingua non supportata: ${lang}` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: listing } = await supabase
    .from('etsy_listings')
    .select('listing_id, title, description, tags, materials')
    .eq('listing_id', body.listingId)
    .single();
  if (!listing) return NextResponse.json({ error: 'Listing non trovato' }, { status: 404 });

  try {
    const tr = await translateListing({
      title: listing.title ?? '',
      description: listing.description ?? '',
      tags: listing.tags ?? [],
      materials: listing.materials ?? [],
    }, lang);

    const shopId = await resolveShopId();
    await etsyFetch(`/application/shops/${shopId}/listings/${listing.listing_id}/translations/${lang}`, {
      method: 'PUT',
      body: JSON.stringify({ title: tr.title, description: tr.description, tags: tr.tags }),
    });

    return NextResponse.json({ ok: true, listing_id: listing.listing_id, lang, title: tr.title });
  } catch (e) {
    return NextResponse.json(
      { ok: false, listing_id: listing.listing_id, lang, error: (e as Error).message },
      { status: 502 },
    );
  }
}
