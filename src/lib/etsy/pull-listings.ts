/**
 * Pull Etsy listings into the read-only `etsy_listings` mirror.
 *
 * READ ONLY. This never writes to the site's `products`, `inventory` or any
 * other site table — it only mirrors what already exists on Etsy so the admin
 * can view the Etsy catalogue in a separate section without any risk of the
 * two catalogues contaminating each other.
 *
 * Pulls every state (active / inactive / draft / sold_out / expired) so the
 * mirror reflects the whole shop, then upserts on listing_id.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { etsyFetch, resolveShopId } from './client';

export type PullResult = {
  synced: number;
  errors: string[];
  durationMs: number;
};

type EtsyMoney = { amount: number; divisor: number; currency_code: string };

type EtsyListing = {
  listing_id: number;
  title?: string;
  description?: string;
  state?: string;
  url?: string;
  price?: EtsyMoney;
  quantity?: number;
  skus?: string[];
  tags?: string[];
  materials?: string[];
  taxonomy_id?: number;
  views?: number;
  num_favorers?: number;
  featured_rank?: number;
  created_timestamp?: number;
  last_modified_timestamp?: number;
  images?: { url_fullxfull?: string; url_570xN?: string }[];
};

const money = (m: EtsyMoney | undefined): number =>
  m && m.divisor > 0 ? Number((m.amount / m.divisor).toFixed(2)) : 0;
const cur = (m: EtsyMoney | undefined): string => m?.currency_code?.toUpperCase() ?? 'EUR';
const ts = (s: number | undefined): string | null => (s ? new Date(s * 1000).toISOString() : null);

const STATES = ['active', 'inactive', 'draft', 'sold_out', 'expired'] as const;

function toRow(l: EtsyListing) {
  return {
    listing_id: l.listing_id,
    title: l.title ?? null,
    description: l.description ?? null,
    state: l.state ?? null,
    url: l.url ?? null,
    price: money(l.price),
    currency: cur(l.price),
    quantity: l.quantity ?? 0,
    sku: l.skus?.[0] ?? null,
    tags: l.tags ?? [],
    materials: l.materials ?? [],
    taxonomy_id: l.taxonomy_id ?? null,
    views: l.views ?? 0,
    num_favorers: l.num_favorers ?? 0,
    featured_rank: l.featured_rank ?? null,
    image_urls: (l.images ?? [])
      .map((i) => i.url_fullxfull ?? i.url_570xN ?? '')
      .filter(Boolean),
    etsy_created_at: ts(l.created_timestamp),
    etsy_updated_at: ts(l.last_modified_timestamp),
    last_synced_at: new Date().toISOString(),
    raw: l as unknown as Record<string, unknown>,
  };
}

export async function pullEtsyListings(supabase: SupabaseClient): Promise<PullResult> {
  const start = Date.now();
  const result: PullResult = { synced: 0, errors: [], durationMs: 0 };

  let shopId: string;
  try {
    shopId = await resolveShopId();
  } catch (e) {
    result.errors.push((e as Error).message);
    result.durationMs = Date.now() - start;
    return result;
  }

  const rows: ReturnType<typeof toRow>[] = [];
  for (const state of STATES) {
    let offset = 0;
    const limit = 100;
    try {
      while (true) {
        const page = await etsyFetch<{ results: EtsyListing[]; count: number }>(
          `/application/shops/${shopId}/listings?state=${state}&limit=${limit}&offset=${offset}&includes=Images`,
        );
        const items = page.results ?? [];
        for (const l of items) rows.push(toRow(l));
        if (items.length < limit) break;
        offset += limit;
        if (offset >= 1000) break; // safety
      }
    } catch (e) {
      const msg = (e as Error).message;
      // 404 / empty state is fine; surface only real errors.
      if (!/40[34]/.test(msg)) result.errors.push(`${state}: ${msg}`);
    }
  }

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('etsy_listings')
      .upsert(chunk, { onConflict: 'listing_id', ignoreDuplicates: false });
    if (error) result.errors.push(`upsert ${i / CHUNK}: ${error.message}`);
    else result.synced += chunk.length;
  }

  result.durationMs = Date.now() - start;
  return result;
}
