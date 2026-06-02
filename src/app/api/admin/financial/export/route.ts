/**
 * Export financial_records for a given month as a single CSV file. This is
 * the format the commercialista actually wants — Excel-friendly, columns in
 * the order they print on their report (Data, ID, Canale, Tipo, Cliente,
 * Paese, P.IVA, Imponibile, IVA, Spedizione, Fee, Totale, Netto, Link).
 *
 * Query params (period — pick one):
 *   month=YYYY-MM        (default: current month)
 *   quarter=YYYY-Qn      (e.g. 2026-Q2 — for the commercialista's quarterly report)
 *   start=YYYY-MM-DD&end=YYYY-MM-DD   (custom range)
 * Plus: source=stripe|etsy|all · format=csv|pdf|json · adsOnly=1
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { computeTotals, resolvePeriod, buildCsv, signedNet, signedGross, type FinRow, type CsvRow } from '@/lib/financial/summary';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const url = new URL(req.url);
  const source = url.searchParams.get('source') || 'all';
  const format = url.searchParams.get('format') || 'csv';
  // `adsOnly=1` restricts to Etsy advertising ledger entries (Etsy Ads spend).
  const adsOnly = url.searchParams.get('adsOnly') === '1';

  // Period: month=YYYY-MM (default) · quarter=YYYY-Qn · start/end range.
  const { start, end, label: periodLabel, key: periodKey } = resolvePeriod(url.searchParams);

  const supabase = createServiceClient();
  let q = supabase
    .from('financial_records')
    .select(
      'transaction_date, source, type, external_id, invoice_number, buyer_name, buyer_email, buyer_country, buyer_vat_number, gross_amount, fee_amount, tax_amount, shipping_amount, net_amount, currency, invoice_url, receipt_url, raw_data',
    )
    .gte('transaction_date', start)
    .lt('transaction_date', end)
    .order('transaction_date', { ascending: true });
  if (source !== 'all' || adsOnly) q = q.eq('source', adsOnly ? 'etsy' : source);
  const { data: rowsRaw, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Etsy Ads = ledger entries whose entry_type/description mention advertising.
  // (Etsy lumps these into the generic "fee" type; this isolates the ad spend.)
  // Etsy Ads = "prolist" (Promoted Listings) ledger entries; also catch generic
  // ad/marketing wording for safety. Field is ledger_type (entry_type fallback).
  const AD_RE = /\b(ads?|advertis|marketing|offsite|promoted|prolist)\b/i;
  const isEtsyAd = (r: { raw_data?: Record<string, unknown> | null }) => {
    const d = r.raw_data || {};
    return AD_RE.test(String(d.ledger_type ?? d.entry_type ?? '')) || AD_RE.test(String(d.description ?? ''));
  };
  const rows = adsOnly ? (rowsRaw ?? []).filter(isEtsyAd) : (rowsRaw ?? []);

  // ---- JSON summary. adsOnly keeps the raw-sum shape the Etsy Ads card reads;
  // otherwise return the full entrate/uscite/saldo aggregation for the period
  // (used by the quarterly-report preview). ----
  if (format === 'json') {
    if (adsOnly) {
      const s = (k: string) => (rows as Array<Record<string, unknown>>).reduce((acc, r) => acc + Number(r[k] || 0), 0);
      return NextResponse.json({
        count: rows.length,
        totals: { gross: s('gross_amount'), fee: s('fee_amount'), tax: s('tax_amount'), net: s('net_amount') },
      });
    }
    return NextResponse.json({
      count: rows.length,
      period: { label: periodLabel, key: periodKey },
      totals: computeTotals(rows as unknown as FinRow[]),
    });
  }

  // ---- PDF (print-optimised HTML; opening it triggers the browser's "Save as
  // PDF" dialog — no PDF dependency, works on Vercel serverless). ----
  if (format === 'pdf') {
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const eur = (n: number) => '€' + n.toFixed(2);
    const sum = (k: string) => (rows as Array<Record<string, unknown>>).reduce((s, r) => s + Number(r[k] || 0), 0);
    const totals = computeTotals(rows as unknown as FinRow[]);
    const title = adsOnly ? 'Spesa Etsy Ads' : 'Riepilogo finanziario';
    const trs = (rows as Array<Record<string, any>>).map((r) => `<tr>
        <td>${esc(new Date(r.transaction_date).toLocaleDateString('it-IT'))}</td>
        <td>${esc(String(r.source).toUpperCase())}</td>
        <td>${esc(r.type)}</td>
        <td>${esc(r.buyer_name ?? r.buyer_email ?? '—')}</td>
        <td class="r">${eur(signedGross(r as unknown as FinRow))}</td>
        <td class="r">${eur(Number(r.tax_amount))}</td>
        <td class="r">${eur(Number(r.fee_amount))}</td>
        <td class="r">${eur(signedNet(r as unknown as FinRow))}</td>
      </tr>`).join('');
    const kpis = adsOnly
      ? `<div class="kpi"><div class="l">Spesa Etsy Ads</div><div class="v">${eur(Math.abs(sum('net_amount')))}</div></div>`
      : `<div class="kpi"><div class="l">Entrate (vendite)</div><div class="v">${eur(totals.income)}</div></div>
         <div class="kpi"><div class="l">Spese totali</div><div class="v">−${eur(totals.expense)}</div></div>
         <div class="kpi"><div class="l">Saldo</div><div class="v">${eur(totals.net)}</div></div>
         <div class="kpi"><div class="l">Vendite lorde</div><div class="v">${eur(totals.grossSales)}</div></div>`;
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>SILKinCOM — ${esc(title)} ${esc(periodKey)}</title>
      <style>
        @page { size: A4; margin: 18mm 14mm; }
        body { font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a; }
        h1 { font-size:22px; font-weight:400; margin:0 0 2px; }
        .sub { color:#888; font-size:12px; margin:0 0 20px; }
        .kpis { display:flex; gap:16px; margin:0 0 22px; flex-wrap:wrap; }
        .kpi { border:1px solid #e5e0d8; padding:9px 14px; }
        .kpi .l { font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#a87f1e; }
        .kpi .v { font-size:18px; }
        table { width:100%; border-collapse:collapse; font-size:11px; }
        th,td { border-bottom:1px solid #eee; padding:6px 8px; text-align:left; }
        th { font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:#888; }
        td.r, th.r { text-align:right; }
        tfoot td { font-weight:bold; border-top:2px solid #1a1a1a; }
        .ft { margin-top:24px; font-size:10px; color:#aaa; }
      </style></head><body onload="window.print()">
        <h1>SILKinCOM — ${esc(title)}</h1>
        <p class="sub">${esc(periodLabel)}${source !== 'all' && !adsOnly ? ' · canale ' + esc(source.toUpperCase()) : ''} · ${rows.length} movimenti</p>
        <div class="kpis">${kpis}</div>
        <table>
          <thead><tr><th>Data</th><th>Canale</th><th>Tipo</th><th>Cliente</th><th class="r">Lordo</th><th class="r">IVA</th><th class="r">Fee</th><th class="r">Netto</th></tr></thead>
          <tbody>${trs || '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:24px;">Nessun movimento nel periodo</td></tr>'}</tbody>
          <tfoot><tr><td colspan="4">Totali</td><td class="r">${eur((rows as unknown as FinRow[]).reduce((s, r) => s + signedGross(r), 0))}</td><td class="r">${eur(sum('tax_amount'))}</td><td class="r">${eur(sum('fee_amount'))}</td><td class="r">${eur((rows as unknown as FinRow[]).reduce((s, r) => s + signedNet(r), 0))}</td></tr></tfoot>
        </table>
        <p class="ft">SILKinCOM · P.IVA 03786790133 · generato ${esc(new Date().toLocaleString('it-IT'))}</p>
      </body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  const body = buildCsv(rows as unknown as CsvRow[]);
  const filename = `silkincom-finanziario-${periodKey}${source !== 'all' ? `-${source}` : ''}.csv`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
