import { NextRequest, NextResponse } from 'next/server';
import { etsyFetch, resolveShopId } from '@/lib/etsy/client';
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

// GET /api/etsy/listing/[id]
// Returns:
//   listing          — the main listing row from the local mirror. Its title/
//                      description/tags are in the listing's PRIMARY language
//                      (for this shop: Italian — raw.language === 'it').
//   primaryLanguage  — that primary language code, so the UI labels the main
//                      tab correctly instead of mislabeling it "English".
//   translation      — the EN translation pulled live from Etsy (empty if none
//                      exists yet). English is a TRANSLATION here, not the master.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: listing } = await supabase
    .from('etsy_listings')
    .select('*')
    .eq('listing_id', id)
    .single();

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const primaryLanguage =
    (listing.raw as { language?: string } | null)?.language ?? 'it';

  let translation: { title?: string; description?: string; tags?: string[] } = {};
  try {
    const shopId = await resolveShopId();
    translation = await etsyFetch<{ title?: string; description?: string; tags?: string[] }>(
      `/application/shops/${shopId}/listings/${id}/translations/en`,
    );
  } catch {
    // No EN translation yet — return empty so the UI shows blank fields to fill.
  }

  return NextResponse.json({ listing, primaryLanguage, translation });
}

// PATCH /api/etsy/listing/[id]
// Body: { lang?: string, fields: {...} }
//   lang omitted  → edit the MAIN listing (primary language, all fields) on Etsy
//                   + mirror to the local DB.
//   lang = 'en'   → upsert the English TRANSLATION on Etsy (title/description/
//                   tags only — the only translatable fields). Etsy requires
//                   BOTH title and description on a translation PUT.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id } = await params;
  const body = await req.json() as { lang?: string; fields: Record<string, unknown> };
  const { lang, fields } = body;

  try {
    const shopId = await resolveShopId();

    if (lang) {
      // Translation upsert (e.g. 'en'). Etsy requires title + description.
      const title = fields.title;
      const description = fields.description;
      if (!title || !description) {
        return NextResponse.json(
          { error: 'Titolo e descrizione sono obbligatori per la traduzione Etsy.' },
          { status: 400 },
        );
      }
      const payload: Record<string, unknown> = { title, description };
      if (fields.tags !== undefined) payload.tags = fields.tags;

      await etsyFetch(`/application/shops/${shopId}/listings/${id}/translations/${lang}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      const ALLOWED = [
        'title', 'description', 'price', 'quantity', 'state',
        'tags', 'materials', 'sku', 'taxonomy_id',
        'who_made', 'when_made', 'is_supply', 'shipping_profile_id',
      ] as const;
      const payload: Record<string, unknown> = {};
      for (const k of ALLOWED) {
        if (k in fields && fields[k] !== undefined) payload[k] = fields[k];
      }

      await etsyFetch(`/application/shops/${shopId}/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // Mirror to local DB
      const supabase = createServiceClient();
      const dbUpdate: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
      const DB_FIELDS = ['title', 'description', 'price', 'quantity', 'state', 'tags', 'materials', 'sku', 'taxonomy_id'] as const;
      for (const k of DB_FIELDS) {
        if (k in fields) dbUpdate[k] = fields[k];
      }
      await supabase.from('etsy_listings').update(dbUpdate).eq('listing_id', id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
