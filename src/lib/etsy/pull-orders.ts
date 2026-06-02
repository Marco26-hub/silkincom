/**
 * Pull Etsy receipts into the read-only `etsy_orders` mirror.
 *
 * READ ONLY and deliberately ISOLATED: unlike the old sync-orders.ts, this
 * does NOT map items to site product_ids and does NOT call
 * apply_inventory_movement. An Etsy sale must never touch the site's stock —
 * the two catalogues are independent. This is purely a mirror so the admin
 * can see Etsy orders in the dedicated Etsy section.
 *
 * The money side (fees / tax / payouts) is handled separately by
 * src/lib/financial/sync-etsy.ts → financial_records.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { etsyFetch, resolveShopId } from './client';

export type PullResult = {
  synced: number;
  errors: string[];
  durationMs: number;
};

type EtsyMoney = { amount: number; divisor: number; currency_code: string };
const money = (m: EtsyMoney | undefined): number =>
  m && m.divisor > 0 ? Number((m.amount / m.divisor).toFixed(2)) : 0;
const cur = (m: EtsyMoney | undefined): string => m?.currency_code?.toUpperCase() ?? 'EUR';

type EtsyTransaction = {
  title?: string;
  quantity?: number;
  listing_id?: number;
  sku?: string;
  price?: EtsyMoney;
};

type EtsyReceipt = {
  receipt_id: number;
  name?: string;
  buyer_email?: string;
  status?: string;
  is_paid?: boolean;
  is_shipped?: boolean;
  grandtotal?: EtsyMoney;
  subtotal?: EtsyMoney;
  total_shipping_cost?: EtsyMoney;
  total_tax_cost?: EtsyMoney;
  total_vat_cost?: EtsyMoney;
  currency_code?: string;
  create_timestamp?: number;
  created_timestamp?: number;
  formatted_address?: string;
  first_line?: string;
  city?: string;
  zip?: string;
  country_iso?: string;
  transactions?: EtsyTransaction[];
};

function toRow(r: EtsyReceipt) {
  const items = (r.transactions ?? []).map((t) => ({
    title: t.title ?? null,
    quantity: t.quantity ?? 0,
    listing_id: t.listing_id ?? null,
    sku: t.sku ?? null,
    price: money(t.price),
  }));
  const createdTs = r.create_timestamp ?? r.created_timestamp;
  return {
    receipt_id: r.receipt_id,
    buyer_name: r.name ?? null,
    buyer_email: r.buyer_email ?? null,
    status: r.status ?? null,
    is_paid: !!r.is_paid,
    is_shipped: !!r.is_shipped,
    grandtotal: money(r.grandtotal),
    subtotal: money(r.subtotal),
    shipping_total: money(r.total_shipping_cost),
    tax_total: money(r.total_tax_cost) + money(r.total_vat_cost),
    currency: cur(r.grandtotal) || (r.currency_code ?? 'EUR').toUpperCase(),
    num_items: items.reduce((n, i) => n + (i.quantity || 0), 0),
    items,
    shipping_address: {
      formatted: r.formatted_address ?? null,
      line1: r.first_line ?? null,
      city: r.city ?? null,
      zip: r.zip ?? null,
      country: r.country_iso ?? null,
    },
    etsy_created_at: createdTs ? new Date(createdTs * 1000).toISOString() : null,
    last_synced_at: new Date().toISOString(),
    raw: r as unknown as Record<string, unknown>,
  };
}

export async function pullEtsyOrders(supabase: SupabaseClient): Promise<PullResult> {
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
  let offset = 0;
  const limit = 100;
  try {
    while (true) {
      const page = await etsyFetch<{ results: EtsyReceipt[]; count: number }>(
        `/application/shops/${shopId}/receipts?limit=${limit}&offset=${offset}`,
      );
      const items = page.results ?? [];
      for (const r of items) rows.push(toRow(r));
      if (items.length < limit) break;
      offset += limit;
      if (offset >= 2000) break; // safety
    }
  } catch (e) {
    result.errors.push((e as Error).message);
  }

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('etsy_orders')
      .upsert(chunk, { onConflict: 'receipt_id', ignoreDuplicates: false });
    if (error) result.errors.push(`upsert ${i / CHUNK}: ${error.message}`);
    else result.synced += chunk.length;
  }

  result.durationMs = Date.now() - start;
  return result;
}
