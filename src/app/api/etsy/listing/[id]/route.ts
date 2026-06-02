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
// Returns listing row from local DB + IT translation from Etsy API
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

  let translation: { title?: string; description?: string; tags?: string[] } = {};
  try {
    const shopId = await resolveShopId();
    translation = await etsyFetch<{ title?: string; description?: string; tags?: string[] }>(
      `/application/shops/${shopId}/listings/${id}/translations/it`,
    );
  } catch {
    // No translation yet — return empty
  }

  return NextResponse.json({ listing, translation });
}

// PATCH /api/etsy/listing/[id]
// Body: { lang?: 'it', fields: { title?, description?, price?, quantity?, ... } }
// lang=it → update Italian translation on Etsy
// lang omitted → update main listing (EN/default) on Etsy + mirror to DB
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

    if (lang === 'it') {
      const payload: Record<string, unknown> = {};
      if (fields.title !== undefined) payload.title = fields.title;
      if (fields.description !== undefined) payload.description = fields.description;
      if (fields.tags !== undefined) payload.tags = fields.tags;

      await etsyFetch(`/application/shops/${shopId}/listings/${id}/translations/it`, {
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
