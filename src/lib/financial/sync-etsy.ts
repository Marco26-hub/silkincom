/**
 * Pull every Etsy receipt + payment-ledger entry into our unified
 * `financial_records` ledger.
 *
 * Why this exists:
 *   Etsy doesn't issue Italian tax invoices, but it exposes two endpoints
 *   that together describe every transaction we need for closing the books:
 *     1. `/application/shops/{shop_id}/receipts` — every sale, with totals,
 *        buyer info, shipping/tax breakdowns, and a receipt URL.
 *     2. `/application/shops/{shop_id}/payment-account/ledger-entries` —
 *        every cash movement on our Etsy balance: charges, fees, taxes,
 *        refunds, payouts.
 *
 * Behaviour:
 *   - Skips silently when OAuth isn't connected (no integrations.etsy row).
 *     This lets the cron run before the app is approved without crashing.
 *   - Idempotent. Upserts on (source, external_id, type).
 *   - Resumable. Reads `financial_sync_state.last_synced_at` and only fetches
 *     newer entries (Etsy `min_created`).
 *   - Splits each receipt into a single `charge` row + N `fee/tax/shipping`
 *     ledger rows so the commercialista sees the full breakdown.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { etsyFetch, resolveShopId } from '@/lib/etsy/client';
import { logSyncError } from '@/lib/financial/log-error';

export type SyncResult = {
  source: 'etsy';
  synced: number;
  skipped: number;
  errors: string[];
  durationMs: number;
};

type FinancialRow = {
  source: 'etsy';
  external_id: string;
  type: 'charge' | 'invoice' | 'refund' | 'fee' | 'payout' | 'tax';
  gross_amount: number;
  fee_amount: number;
  tax_amount: number;
  shipping_amount: number;
  net_amount: number;
  currency: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_country: string | null;
  buyer_address: string | null;
  buyer_vat_number: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
  invoice_number: string | null;
  transaction_date: string;
  raw_data: Record<string, unknown>;
};

type EtsyMoney = { amount: number; divisor: number; currency_code: string };
const money = (m: EtsyMoney | undefined): number =>
  m && m.divisor > 0 ? Number((m.amount / m.divisor).toFixed(2)) : 0;
const cur = (m: EtsyMoney | undefined): string =>
  m?.currency_code?.toUpperCase() ?? 'EUR';

type EtsyReceipt = {
  receipt_id: number;
  create_timestamp: number;
  name: string | null;
  buyer_email: string | null;
  formatted_address: string | null;
  country_iso: string | null;
  grandtotal: EtsyMoney;
  subtotal: EtsyMoney;
  total_shipping_cost: EtsyMoney;
  total_tax_cost: EtsyMoney;
  total_vat_cost: EtsyMoney;
  receipt_url?: string;
  status: string;
};

type EtsyLedgerEntry = {
  entry_id: number;
  ledger_id: number;
  sequence_number: number;
  amount: number;
  currency: string;
  description: string;
  balance: number;
  create_date: number;
  entry_type: string;
  reference_id?: string | null;
};

function receiptToRow(r: EtsyReceipt): FinancialRow {
  return {
    source: 'etsy',
    external_id: String(r.receipt_id),
    type: 'charge',
    gross_amount: money(r.grandtotal),
    fee_amount: 0, // Etsy fees come through the ledger, not the receipt.
    tax_amount: money(r.total_tax_cost) + money(r.total_vat_cost),
    shipping_amount: money(r.total_shipping_cost),
    net_amount: money(r.grandtotal),
    currency: cur(r.grandtotal),
    buyer_name: r.name,
    buyer_email: r.buyer_email,
    buyer_country: r.country_iso,
    buyer_address: r.formatted_address,
    buyer_vat_number: null,
    invoice_url: null,
    receipt_url:
      r.receipt_url ?? `https://www.etsy.com/your/orders/sold/orders/${r.receipt_id}`,
    invoice_number: `ETSY-${r.receipt_id}`,
    transaction_date: new Date(r.create_timestamp * 1000).toISOString(),
    raw_data: r as unknown as Record<string, unknown>,
  };
}

function ledgerEntryToRow(e: EtsyLedgerEntry): FinancialRow {
  // Etsy ledger entries carry signed amounts already (positive = credit,
  // negative = debit). We split them by `entry_type` so the report can group
  // sales-vs-fees-vs-refunds-vs-payouts.
  const t = (e.entry_type || '').toLowerCase();
  let type: FinancialRow['type'] = 'fee';
  if (t.includes('payment') || t.includes('sale')) type = 'charge';
  else if (t.includes('refund') || t.includes('reversal')) type = 'refund';
  else if (t.includes('tax') || t.includes('vat')) type = 'tax';
  else if (t.includes('payout') || t.includes('transfer')) type = 'payout';

  return {
    source: 'etsy',
    external_id: `ledger_${e.entry_id}`,
    type,
    gross_amount: e.amount,
    fee_amount: type === 'fee' ? Math.abs(e.amount) : 0,
    tax_amount: type === 'tax' ? Math.abs(e.amount) : 0,
    shipping_amount: 0,
    net_amount: e.amount,
    currency: (e.currency ?? 'EUR').toUpperCase(),
    buyer_name: null,
    buyer_email: null,
    buyer_country: null,
    buyer_address: null,
    buyer_vat_number: null,
    invoice_url: null,
    receipt_url: null,
    invoice_number: null,
    transaction_date: new Date(e.create_date * 1000).toISOString(),
    raw_data: e as unknown as Record<string, unknown>,
  };
}

export async function syncEtsyFinancial(
  supabase: SupabaseClient,
): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { source: 'etsy', synced: 0, skipped: 0, errors: [], durationMs: 0 };

  // Bail out cleanly when Etsy isn't connected — the cron still wants a
  // structured result instead of an exception.
  const { data: integration } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('provider', 'etsy')
    .maybeSingle();
  if (!integration?.access_token) {
    result.errors.push('etsy not connected');
    result.durationMs = Date.now() - start;
    return result;
  }

  let shopId: string;
  try {
    shopId = await resolveShopId();
  } catch (e) {
    result.errors.push((e as Error).message);
    result.durationMs = Date.now() - start;
    return result;
  }

  const { data: state } = await supabase
    .from('financial_sync_state')
    .select('last_synced_at')
    .eq('source', 'etsy')
    .maybeSingle();
  const since = state?.last_synced_at
    ? Math.floor(new Date(state.last_synced_at).getTime() / 1000) - 60 * 60
    : Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);

  const rows: FinancialRow[] = [];

  try {
    let offset = 0;
    const limit = 100;
    while (true) {
      const page = await etsyFetch<{ results: EtsyReceipt[]; count: number }>(
        `/application/shops/${shopId}/receipts?was_paid=true&min_created=${since}&limit=${limit}&offset=${offset}`,
      );
      const receipts = page.results ?? [];
      for (const r of receipts) rows.push(receiptToRow(r));
      if (receipts.length < limit) break;
      offset += limit;
      if (offset >= 1000) {
        const msg = 'safety cap reached: more than 1000 receipts in window';
        result.errors.push(`receipts: ${msg}`);
        await logSyncError(supabase, { source: 'etsy', operation: 'receipts', message: msg });
        break;
      }
    }
  } catch (e) {
    const msg = (e as Error).message;
    result.errors.push(`receipts: ${msg}`);
    await logSyncError(supabase, { source: 'etsy', operation: 'receipts', message: msg });
  }

  try {
    // Etsy's ledger-entries endpoint requires BOTH min_created and max_created,
    // AND caps the window span ("400: Time window between min_created and
    // max_created is too large"). So we walk the range from `since` to now in
    // 30-day chunks, paginating offset within each chunk.
    const nowSec = Math.floor(Date.now() / 1000);
    const CHUNK = 30 * 24 * 60 * 60; // 30 days in seconds
    const limit = 100;
    let stop = false;
    for (let winStart = since; winStart < nowSec && !stop; winStart += CHUNK) {
      const winEnd = Math.min(winStart + CHUNK, nowSec);
      let offset = 0;
      while (true) {
        const page = await etsyFetch<{ results: EtsyLedgerEntry[]; count: number }>(
          `/application/shops/${shopId}/payment-account/ledger-entries?min_created=${winStart}&max_created=${winEnd}&limit=${limit}&offset=${offset}`,
        );
        const entries = page.results ?? [];
        for (const e of entries) rows.push(ledgerEntryToRow(e));
        if (entries.length < limit) break;
        offset += limit;
        if (offset >= 2000) {
          const msg = `safety cap reached: >2000 ledger entries in window ${winStart}-${winEnd}`;
          result.errors.push(`ledger: ${msg}`);
          await logSyncError(supabase, { source: 'etsy', operation: 'ledger', message: msg });
          stop = true;
          break;
        }
      }
    }
  } catch (e) {
    const msg = (e as Error).message;
    result.errors.push(`ledger: ${msg}`);
    await logSyncError(supabase, { source: 'etsy', operation: 'ledger', message: msg });
  }

  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('financial_records')
      .upsert(chunk, { onConflict: 'source,external_id,type', ignoreDuplicates: false });
    if (error) {
      result.errors.push(`upsert ${i / CHUNK}: ${error.message}`);
      await logSyncError(supabase, { source: 'etsy', operation: 'upsert', message: error.message });
    } else {
      result.synced += chunk.length;
    }
  }

  // See sync-stripe.ts for rationale: only advance the cursor when the run
  // was fully clean, otherwise we'd silently drop the unfetched tail.
  const patch: Record<string, unknown> = {
    last_status: result.errors.length ? 'partial' : 'ok',
    last_error: result.errors.length ? result.errors.join(' | ').slice(0, 500) : null,
    total_records: rows.length,
    updated_at: new Date().toISOString(),
  };
  if (result.errors.length === 0) {
    patch.last_synced_at = new Date().toISOString();
  }
  await supabase.from('financial_sync_state').update(patch).eq('source', 'etsy');

  result.durationMs = Date.now() - start;
  return result;
}
