/**
 * Shared financial aggregation — used by the records API, the export route and
 * the commercialista email so they never drift.
 *
 * Direction model (ENTRATE vs USCITE):
 *  - Stripe / non-Etsy: income if net>0 (sales), expense if net<0 (refunds).
 *  - Etsy has no sales here, so it is pure cost. Its ledger lists fee accruals
 *    (prolist/listing/renew, negative) plus the monthly billing_payment that
 *    settles them (positive). The billing_payment is the Etsy invoice the owner
 *    actually pays by company card → THAT is the real cash expense. The fee
 *    accruals are excluded from the totals (the payment already covers them)
 *    but stay in the per-row export/table as the breakdown.
 */

export type FinRow = {
  source: string;
  type: string;
  gross_amount: number | string;
  fee_amount: number | string;
  tax_amount: number | string;
  shipping_amount: number | string;
  net_amount: number | string;
};

export type FinTotals = {
  gross: number;
  fees: number;
  tax: number;
  shipping: number;
  net: number;
  income: number;
  expense: number;
  grossSales: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
};

export function computeTotals(rows: FinRow[]): FinTotals {
  return rows.reduce<FinTotals>(
    (acc, r) => {
      const net = Number(r.net_amount);
      const gross = Number(r.gross_amount);
      acc.gross += gross;
      acc.fees += Number(r.fee_amount);
      acc.tax += Number(r.tax_amount);
      acc.shipping += Number(r.shipping_amount);

      if (r.source === 'etsy') {
        if (r.type === 'payout') {
          const paid = Math.abs(net);
          acc.expense += paid;
          acc.net -= paid;
          acc.bySource[r.source] = (acc.bySource[r.source] ?? 0) - paid;
        }
        // Etsy fee accruals: itemisation only — excluded from the totals.
        return acc;
      }

      acc.net += net;
      if (net >= 0) {
        acc.income += net;
        acc.grossSales += gross;
      } else {
        acc.expense += -net;
      }
      acc.bySource[r.source] = (acc.bySource[r.source] ?? 0) + net;
      acc.byType[r.type] = (acc.byType[r.type] ?? 0) + gross;
      return acc;
    },
    { gross: 0, fees: 0, tax: 0, shipping: 0, net: 0, income: 0, expense: 0, grossSales: 0, bySource: {}, byType: {} },
  );
}

/**
 * Resolves a UTC [start, end) range from query params. Supports:
 *   quarter=YYYY-Qn  (e.g. 2026-Q2)
 *   start=YYYY-MM-DD & end=YYYY-MM-DD   (end exclusive-ish: we add a day)
 *   month=YYYY-MM    (default: current month)
 * Returns ISO strings + a human label for the report header.
 */
export function resolvePeriod(params: URLSearchParams): { start: string; end: string; label: string; key: string } {
  const quarter = params.get('quarter');
  const start = params.get('start');
  const end = params.get('end');

  if (quarter && /^\d{4}-Q[1-4]$/i.test(quarter)) {
    const [yStr, qStr] = quarter.toUpperCase().split('-Q');
    const y = Number(yStr);
    const q = Number(qStr);
    const startMonth = (q - 1) * 3; // 0,3,6,9
    const s = new Date(Date.UTC(y, startMonth, 1));
    const e = new Date(Date.UTC(y, startMonth + 3, 1));
    return { start: s.toISOString(), end: e.toISOString(), label: `${q}º trimestre ${y}`, key: `${y}-Q${q}` };
  }

  if (start && end) {
    const s = new Date(`${start}T00:00:00.000Z`);
    const e = new Date(`${end}T00:00:00.000Z`);
    e.setUTCDate(e.getUTCDate() + 1); // make end inclusive of the chosen day
    return {
      start: s.toISOString(),
      end: e.toISOString(),
      label: `${start} → ${end}`,
      key: `${start}_${end}`,
    };
  }

  const month = params.get('month') || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, 1));
  const e = new Date(Date.UTC(y, m, 1));
  const label = s.toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { start: s.toISOString(), end: e.toISOString(), label, key: month };
}

export type CsvRow = {
  transaction_date: string;
  source: string;
  type: string;
  external_id: string | null;
  invoice_number: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_country: string | null;
  buyer_vat_number: string | null;
  gross_amount: number | string;
  fee_amount: number | string;
  tax_amount: number | string;
  shipping_amount: number | string;
  net_amount: number | string;
  currency: string | null;
  invoice_url: string | null;
  receipt_url: string | null;
};

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Excel-friendly CSV (BOM + RFC-4180 quoting) in the column order the
 *  commercialista prints — used by the export route and the email report. */
export function buildCsv(rows: CsvRow[]): string {
  const header = [
    'Data', 'Canale', 'Tipo', 'ID transazione', 'Numero documento', 'Cliente', 'Email',
    'Paese', 'P.IVA', 'Imponibile', 'IVA', 'Spedizione', 'Fee', 'Totale', 'Netto', 'Valuta',
    'Link fattura/ricevuta',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    const imponibile = Number(r.gross_amount) - Number(r.tax_amount) - Number(r.shipping_amount);
    lines.push([
      new Date(r.transaction_date).toISOString().slice(0, 10),
      r.source.toUpperCase(),
      r.type,
      r.external_id ?? '',
      r.invoice_number ?? '',
      r.buyer_name ?? '',
      r.buyer_email ?? '',
      r.buyer_country ?? '',
      r.buyer_vat_number ?? '',
      imponibile.toFixed(2),
      Number(r.tax_amount).toFixed(2),
      Number(r.shipping_amount).toFixed(2),
      Number(r.fee_amount).toFixed(2),
      Number(r.gross_amount).toFixed(2),
      Number(r.net_amount).toFixed(2),
      r.currency ?? 'EUR',
      r.invoice_url ?? r.receipt_url ?? '',
    ].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\n');
}
