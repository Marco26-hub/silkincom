/**
 * Pull Google Ads invoices into the unified financial_records ledger.
 *
 * Google Ads invoices customers monthly, in arrears. The Ads REST API exposes
 * the same PDFs you see in the billing UI:
 *
 *   GET /v18/customers/{customer_id}/invoices
 *       ?billingSetupId={billing_setup_id}
 *       &issueYear={YYYY}
 *       &issueMonth={MONTH_ENUM}
 *
 * Each invoice carries:
 *   - id                        — invoice number
 *   - type                      — INVOICE / PROFORMA / etc.
 *   - billing_setup             — which billing profile billed it
 *   - issue_date                — when Google issued it (Italy timezone)
 *   - due_date                  — payment due
 *   - currency_code             — usually EUR for IT accounts
 *   - subtotal_amount_micros    — pre-tax in micros (÷1_000_000)
 *   - tax_amount_micros         — VAT in micros
 *   - total_amount_micros       — gross
 *   - pdf_url                   — Google-hosted PDF link
 *
 * We map one Google Ads invoice → one financial_records row of type='invoice'
 * with source='google_ads' so /admin/fatture and the CSV export pick it up
 * alongside Stripe + Etsy without any source-specific branching.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { gadsFetch, getCustomerId } from '@/lib/google-ads/client';
import { logSyncError } from '@/lib/financial/log-error';

export type SyncResult = {
  source: 'google_ads';
  synced: number;
  skipped: number;
  errors: string[];
  durationMs: number;
};

type FinancialRow = {
  source: 'google_ads';
  external_id: string;
  type: 'invoice';
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

type GadsInvoice = {
  resourceName?: string;
  id: string;
  type?: string;
  billingSetup?: string;
  paymentsAccountId?: string;
  paymentsProfileId?: string;
  issueDate?: string; // "YYYY-MM-DD"
  dueDate?: string;
  serviceDateRange?: { startDate: string; endDate: string };
  currencyCode?: string;
  subtotalAmountMicros?: string;
  taxAmountMicros?: string;
  totalAmountMicros?: string;
  pdfUrl?: string;
  htmlUrl?: string;
  correctedInvoice?: string;
  replacedInvoices?: string[];
};

const MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
] as const;

const fromMicros = (v: string | number | undefined): number =>
  v === undefined || v === null ? 0 : Number(v) / 1_000_000;

function invoiceToRow(inv: GadsInvoice): FinancialRow {
  const subtotal = fromMicros(inv.subtotalAmountMicros);
  const tax = fromMicros(inv.taxAmountMicros);
  const total = fromMicros(inv.totalAmountMicros);
  return {
    source: 'google_ads',
    external_id: inv.id,
    type: 'invoice',
    gross_amount: total,
    fee_amount: 0,
    tax_amount: tax,
    shipping_amount: 0,
    // For ads spend, "net" is the imponibile (pre-tax) — that's what the
    // commercialista expenses against revenue. VAT is detraibile separately.
    net_amount: subtotal,
    currency: (inv.currencyCode ?? 'EUR').toUpperCase(),
    buyer_name: 'Google Ireland Ltd (fornitore)',
    buyer_email: null,
    buyer_country: 'IE',
    buyer_address: null,
    buyer_vat_number: null,
    invoice_url: inv.pdfUrl ?? null,
    receipt_url: inv.htmlUrl ?? null,
    invoice_number: inv.id,
    transaction_date: inv.issueDate
      ? new Date(inv.issueDate).toISOString()
      : new Date().toISOString(),
    raw_data: inv as unknown as Record<string, unknown>,
  };
}

async function listBillingSetups(customerId: string): Promise<string[]> {
  // The invoices endpoint is keyed by a billing_setup id. Most accounts have
  // exactly one; we query whatever's active so the sync keeps working if the
  // account swaps payment profiles.
  const res = await gadsFetch<{ results?: Array<{ billingSetup: { id: string; status: string } }> }>(
    `/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      body: JSON.stringify({
        query:
          "SELECT billing_setup.id, billing_setup.status FROM billing_setup WHERE billing_setup.status IN ('APPROVED', 'PENDING')",
      }),
    },
  );
  const ids = (res.results ?? []).map((r) => r.billingSetup.id);
  return Array.from(new Set(ids));
}

export async function syncGoogleAdsFinancial(
  supabase: SupabaseClient,
): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    source: 'google_ads',
    synced: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  // Graceful skip when not connected — same pattern as Etsy.
  const { data: integration } = await supabase
    .from('integrations')
    .select('access_token, refresh_token')
    .eq('provider', 'google_ads')
    .maybeSingle();
  if (!integration?.refresh_token) {
    result.errors.push('google_ads not connected');
    result.durationMs = Date.now() - start;
    return result;
  }

  let customerId: string;
  try {
    customerId = getCustomerId();
  } catch (e) {
    result.errors.push((e as Error).message);
    result.durationMs = Date.now() - start;
    return result;
  }

  // Resume window. The Ads invoice endpoint can't filter by date, only by
  // issueYear+issueMonth, so we re-fetch the last 4 months every run. Upsert
  // on (source, external_id, type) makes that idempotent.
  const now = new Date();
  const months: { year: number; monthEnum: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), monthEnum: MONTHS[d.getMonth()] });
  }

  let billingSetups: string[] = [];
  try {
    billingSetups = await listBillingSetups(customerId);
  } catch (e) {
    const msg = (e as Error).message;
    result.errors.push(`billing_setups: ${msg}`);
    await logSyncError(supabase, { source: 'google_ads', operation: 'billing_setups', message: msg });
  }

  const rows: FinancialRow[] = [];

  for (const setupId of billingSetups) {
    for (const m of months) {
      try {
        const url =
          `/customers/${customerId}/invoices?billingSetupId=${setupId}` +
          `&issueYear=${m.year}&issueMonth=${m.monthEnum}`;
        const res = await gadsFetch<{ invoices?: GadsInvoice[] }>(url);
        for (const inv of res.invoices ?? []) {
          rows.push(invoiceToRow(inv));
        }
      } catch (e) {
        // 404s for months without invoices are normal — surface only real errors.
        // The previous substring `includes('404')` was too loose; match the
        // exact HTTP status from gadsFetch's "google-ads 404 …" prefix.
        const msg = (e as Error).message;
        if (/^google-ads 404 /.test(msg)) continue;
        result.errors.push(`${m.year}-${m.monthEnum}: ${msg}`);
        await logSyncError(supabase, {
          source: 'google_ads',
          operation: 'invoices.list',
          message: msg,
          context: { year: m.year, month: m.monthEnum, setupId },
        });
      }
    }
  }

  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('financial_records')
      .upsert(chunk, { onConflict: 'source,external_id,type', ignoreDuplicates: false });
    if (error) {
      result.errors.push(`upsert ${i / CHUNK}: ${error.message}`);
      await logSyncError(supabase, { source: 'google_ads', operation: 'upsert', message: error.message });
    } else {
      result.synced += chunk.length;
    }
  }

  // Only advance the cursor when clean — see sync-stripe for rationale.
  const patch: Record<string, unknown> = {
    last_status: result.errors.length ? 'partial' : 'ok',
    last_error: result.errors.length ? result.errors.join(' | ').slice(0, 500) : null,
    total_records: rows.length,
    updated_at: new Date().toISOString(),
  };
  if (result.errors.length === 0) {
    patch.last_synced_at = new Date().toISOString();
  }
  await supabase.from('financial_sync_state').update(patch).eq('source', 'google_ads');
  result.durationMs = Date.now() - start;
  return result;
}
