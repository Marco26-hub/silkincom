/**
 * POST /api/etsy/fix-materials  (admin, confirm-gated)
 *
 * One-shot SEO fix: every Etsy listing missing the `materials` attribute is
 * invisible in Etsy's material filters (silk / cashmere / wool / linen /
 * cotton) — a real discoverability gap. This derives the material(s) from the
 * listing title and writes them to Etsy via updateListing, then mirrors the
 * change locally.
 *
 * It's a WRITE to Etsy, so it requires { confirm: true } in the body. Uses the
 * same etsyFetch PATCH format as /api/etsy/listing/[id].
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { etsyFetch, resolveShopId } from '@/lib/etsy/client';

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

/**
 * Derive Etsy materials from a listing title. Order matters: precious fibres
 * first, then blends, then garment-type fallbacks. Returns [] when we can't
 * tell — we never push a guessed material that could be wrong.
 */
function deriveMaterials(title: string): string[] {
  // Strip the brand name BEFORE matching: "SILKinCOM" contains the substring
  // "silk", which previously mis-tagged every branded cotton/linen item as
  // Silk. Match on WORD BOUNDARIES too, so "cappellino" (cap) never matches
  // "lino" (linen) and similar substring traps.
  const t = title.toLowerCase().replace(/silk\s*in\s*com/g, ' ');
  const has = (...k: string[]) =>
    k.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t));

  if (has('cashmere', 'pashmina')) return ['Cashmere'];
  if (has('twilly', 'foulard', 'seta', 'silk')) return ['Silk'];
  if (has('lana', 'wool')) return ['Wool'];
  // Linen pieces — shirts are linen+cotton blends, shorts are pure linen.
  if (has('lino', 'linen')) {
    return has('cotton', 'cotone') ? ['Linen', 'Cotton'] : ['Linen'];
  }
  // Trucker caps = cotton front + polyester mesh.
  if (has('trucker', 'mesh', 'rete')) return ['Cotton', 'Polyester'];
  // Plain caps / tees / towels = cotton.
  if (has('cap', 'hat', 'cappellino', 'berretto', 'cappello', 't-shirt', 'tshirt', 'maglia', 'telo', 'towel')) {
    return ['Cotton'];
  }
  return [];
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'Conferma richiesta: questa operazione scrive i materiali sui listing Etsy.' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: listings, error } = await supabase
    .from('etsy_listings')
    .select('listing_id, title, materials')
    .or('materials.is.null,materials.eq.{}');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let shopId: string;
  try {
    shopId = await resolveShopId();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const results: Array<{ listing_id: number; materials: string[]; ok: boolean; error?: string }> = [];
  for (const l of listings ?? []) {
    const materials = deriveMaterials(l.title ?? '');
    if (materials.length === 0) {
      results.push({ listing_id: l.listing_id, materials: [], ok: false, error: 'materiale non derivabile dal titolo' });
      continue;
    }
    try {
      await etsyFetch(`/application/shops/${shopId}/listings/${l.listing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ materials }),
      });
      await supabase.from('etsy_listings')
        .update({ materials, last_synced_at: new Date().toISOString() })
        .eq('listing_id', l.listing_id);
      results.push({ listing_id: l.listing_id, materials, ok: true });
    } catch (e) {
      results.push({ listing_id: l.listing_id, materials, ok: false, error: (e as Error).message });
    }
  }

  await supabase.from('etsy_sync_log').insert({
    sync_type: 'fix_materials',
    synced_count: results.filter((r) => r.ok).length,
    errors: results.filter((r) => !r.ok).map((r) => `${r.listing_id}: ${r.error}`),
  });

  return NextResponse.json({
    ok: true,
    fixed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
