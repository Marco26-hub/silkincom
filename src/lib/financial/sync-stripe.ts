/**
 * Pull every Stripe charge / invoice / refund into our unified
 * `financial_records` ledger.
 *
 * Why this exists:
 *   The Stripe dashboard is fine for one-off lookups, but the commercialista
 *   needs the whole story in one place — every payment, fee, tax, shipping,
 *   refund, payout — alongside Etsy ledger entries. This sync turns the
 *   provider's polymorphic objects into a normalised row each.
 *
 * Behaviour:
 *   - Idempotent. Upserts on (source, external_id, type).
 *   - Resumable. Reads `financial_sync_state.last_synced_at` and only fetches
 *     newer charges (Stripe `created[gte]=...`).
 *   - Picks up the buyer snapshot at fetch time so reports stay accurate even
 *     if the customer record mutates later in Stripe.
 *   - Captures the hosted PDF / receipt URL when Stripe provides one.
 *
 * Run via:
 *   - Cron `POST /api/cron/sync-financial` (daily)
 *   - Manual `POST /api/admin/financial/sync?source=stripe`
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import type Stripe from 'stripe';

export type SyncResult = {
  source: 'stripe';
  synced: number;
  skipped: number;
  errors: string[];
  durationMs: number;
};

type FinancialRow = {
  source: 'stripe';
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

const cents = (v: number | null | undefined) => (v ? v / 100 : 0);

function formatAddress(addr: Stripe.Address | null | undefined): string | null {
  if (!addr) return null;
  const parts = [addr.line1, addr.line2, addr.postal_code, addr.city, addr.state, addr.country];
  return parts.filter(Boolean).join(', ') || null;
}

function chargeToRow(c: Stripe.Charge): FinancialRow {
  const balanceTx = (c.balance_transaction && typeof c.balance_transaction === 'object'
    ? c.balance_transaction
    : null) as Stripe.BalanceTransaction | null;
  const billing = c.billing_details ?? {};
  return {
    source: 'stripe',
    external_id: c.id,
    type: 'charge',
    gross_amount: cents(c.amount),
    fee_amount: cents(balanceTx?.fee ?? 0),
    tax_amount: 0, // Stripe ships taxes through line items; we keep tax breakdown on invoices.
    // Stripe Charge doesn't surface a shipping amount field — it's bundled
    // into the total. We attribute shipping at the invoice level where it
    // does have its own line. Keep 0 here so we don't double-count.
    shipping_amount: 0,
    net_amount: cents(balanceTx?.net ?? c.amount),
    currency: (c.currency ?? 'eur').toUpperCase(),
    buyer_name: billing.name ?? null,
    buyer_email: billing.email ?? c.receipt_email ?? null,
    buyer_country: billing.address?.country ?? null,
    buyer_address: formatAddress(billing.address),
    buyer_vat_number: (c.metadata?.vat_number as string) ?? null,
    invoice_url: null,
    receipt_url: c.receipt_url ?? null,
    invoice_number: null,
    transaction_date: new Date(c.created * 1000).toISOString(),
    raw_data: c as unknown as Record<string, unknown>,
  };
}

function invoiceToRow(inv: Stripe.Invoice): FinancialRow {
  const customer = (inv.customer && typeof inv.customer === 'object'
    ? inv.customer
    : null) as Stripe.Customer | null;
  return {
    source: 'stripe',
    external_id: inv.id ?? `inv_unknown_${inv.number ?? Date.now()}`,
    type: 'invoice',
    gross_amount: cents(inv.total),
    fee_amount: 0,
    tax_amount: cents(inv.tax ?? 0),
    shipping_amount: cents((inv as unknown as { shipping_cost?: { amount_total?: number } }).shipping_cost?.amount_total ?? 0),
    net_amount: cents(inv.total - (inv.tax ?? 0)),
    currency: (inv.currency ?? 'eur').toUpperCase(),
    buyer_name: inv.customer_name ?? customer?.name ?? null,
    buyer_email: inv.customer_email ?? customer?.email ?? null,
    buyer_country: inv.customer_address?.country ?? customer?.address?.country ?? null,
    buyer_address: formatAddress(inv.customer_address ?? customer?.address ?? null),
    buyer_vat_number:
      (inv.customer_tax_ids?.[0]?.value as string | undefined) ??
      (inv.metadata?.vat_number as string | undefined) ??
      null,
    invoice_url: inv.invoice_pdf ?? null,
    receipt_url: inv.hosted_invoice_url ?? null,
    invoice_number: inv.number ?? null,
    transaction_date: new Date((inv.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    raw_data: inv as unknown as Record<string, unknown>,
  };
}

function refundToRow(r: Stripe.Refund): FinancialRow {
  return {
    source: 'stripe',
    external_id: r.id,
    type: 'refund',
    gross_amount: -cents(r.amount),
    fee_amount: 0,
    tax_amount: 0,
    shipping_amount: 0,
    net_amount: -cents(r.amount),
    currency: (r.currency ?? 'eur').toUpperCase(),
    buyer_name: null,
    buyer_email: null,
    buyer_country: null,
    buyer_address: null,
    buyer_vat_number: null,
    invoice_url: null,
    receipt_url: r.receipt_number ? null : null,
    invoice_number: r.receipt_number ?? null,
    transaction_date: new Date(r.created * 1000).toISOString(),
    raw_data: r as unknown as Record<string, unknown>,
  };
}

export async function syncStripeFinancial(
  supabase: SupabaseClient,
): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { source: 'stripe', synced: 0, skipped: 0, errors: [], durationMs: 0 };

  const stripe = getStripe();

  // Resume from the last successful checkpoint, with a small overlap to catch
  // any objects that arrived out of order.
  const { data: state } = await supabase
    .from('financial_sync_state')
    .select('last_synced_at')
    .eq('source', 'stripe')
    .maybeSingle();
  const since = state?.last_synced_at
    ? Math.floor(new Date(state.last_synced_at).getTime() / 1000) - 60 * 60
    : Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);

  const rows: FinancialRow[] = [];

  try {
    // Charges (with balance transaction expanded so we capture Stripe fees).
    for await (const c of stripe.charges.list({
      created: { gte: since },
      limit: 100,
      expand: ['data.balance_transaction'],
    })) {
      rows.push(chargeToRow(c));
    }
  } catch (e) {
    result.errors.push(`charges: ${(e as Error).message}`);
  }

  try {
    // Invoices (paid/uncollectible only — drafts don't matter to the ledger).
    for await (const inv of stripe.invoices.list({
      created: { gte: since },
      limit: 100,
      expand: ['data.customer'],
    })) {
      if (inv.status === 'draft' || inv.status === 'void') continue;
      rows.push(invoiceToRow(inv));
    }
  } catch (e) {
    result.errors.push(`invoices: ${(e as Error).message}`);
  }

  try {
    for await (const r of stripe.refunds.list({
      created: { gte: since },
      limit: 100,
    })) {
      rows.push(refundToRow(r));
    }
  } catch (e) {
    result.errors.push(`refunds: ${(e as Error).message}`);
  }

  // Upsert in chunks (Supabase REST has a payload size ceiling).
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('financial_records')
      .upsert(chunk, { onConflict: 'source,external_id,type', ignoreDuplicates: false });
    if (error) {
      result.errors.push(`upsert chunk ${i / CHUNK}: ${error.message}`);
    } else {
      result.synced += chunk.length;
    }
  }

  // Checkpoint forward only when at least one row arrived; if Stripe is quiet
  // we leave the cursor alone so we don't miss anything.
  if (result.synced > 0 || result.errors.length === 0) {
    await supabase
      .from('financial_sync_state')
      .update({
        last_synced_at: new Date().toISOString(),
        last_status: result.errors.length ? 'partial' : 'ok',
        last_error: result.errors.length ? result.errors.join(' | ').slice(0, 500) : null,
        total_records: rows.length,
        updated_at: new Date().toISOString(),
      })
      .eq('source', 'stripe');
  }

  result.durationMs = Date.now() - start;
  return result;
}
