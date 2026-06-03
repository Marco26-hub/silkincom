/**
 * POST /api/google-merchant/pull  (admin)
 *
 * Read-only pull of the Merchant Center catalogue + approval status into the
 * dedicated mirror table (google_merchant_products), like the Etsy/TikTok
 * pulls. Merges `products.list` (offer fields) with `productstatuses.list`
 * (destination status + item-level issues) by REST id. Full payload kept in
 * `raw` so nothing is lost while we tune the mapping live.
 */
import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { merchantFetch } from '@/lib/google-merchant/client';

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

const n = (v: unknown) => (v == null ? null : Number(v));

/** Page through a Content API list endpoint, following nextPageToken. */
async function listAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  do {
    const query: Record<string, string> = { maxResults: '250' };
    if (pageToken) query.pageToken = pageToken;
    const page = await merchantFetch<{ resources?: T[]; nextPageToken?: string }>(path, { query });
    if (page.resources) out.push(...page.resources);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

type GmcProduct = {
  id: string; offerId?: string; title?: string; link?: string; imageLink?: string;
  contentLanguage?: string; availability?: string; price?: { value?: string; currency?: string };
};
type GmcStatus = {
  productId: string; title?: string;
  destinationStatuses?: Array<{ destination?: string; status?: string }>;
  itemLevelIssues?: unknown[];
};

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const [products, statuses] = await Promise.all([
      listAll<GmcProduct>('/products'),
      listAll<GmcStatus>('/productstatuses'),
    ]);

    const statusById = new Map(statuses.map((s) => [s.productId, s]));
    const supabase = createServiceClient();

    const rows = products.map((p) => {
      const st = statusById.get(p.id);
      const dest = st?.destinationStatuses ?? [];
      const shopping = dest.find((d) => (d.destination || '').toLowerCase() === 'shopping') ?? dest[0];
      return {
        rest_id: p.id,
        offer_id: p.offerId ?? null,
        content_language: p.contentLanguage ?? null,
        title: p.title ?? st?.title ?? null,
        link: p.link ?? null,
        image_link: p.imageLink ?? null,
        price: n(p.price?.value),
        currency: p.price?.currency ?? null,
        availability: p.availability ?? null,
        destination_status: shopping?.status ?? null,
        issues: st?.itemLevelIssues ?? null,
        raw: { product: p, status: st ?? null },
        synced_at: new Date().toISOString(),
      };
    });

    if (rows.length) {
      const { error } = await supabase.from('google_merchant_products').upsert(rows, { onConflict: 'rest_id' });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, count: rows.length, statuses: statuses.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
