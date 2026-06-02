/**
 * Export financial_records for a given month as a single CSV file. This is
 * the format the commercialista actually wants — Excel-friendly, columns in
 * the order they print on their report (Data, ID, Canale, Tipo, Cliente,
 * Paese, P.IVA, Imponibile, IVA, Spedizione, Fee, Totale, Netto, Link).
 *
 * Query params:
 *   month=YYYY-MM   (default current month)
 *   source=stripe|etsy|all
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

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

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Quote anything containing commas, quotes or newlines per RFC 4180.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const url = new URL(req.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const source = url.searchParams.get('source') || 'all';
  const format = url.searchParams.get('format') || 'csv';
  // `adsOnly=1` restricts to Etsy advertising ledger entries (Etsy Ads spend).
  const adsOnly = url.searchParams.get('adsOnly') === '1';

  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();

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
  const AD_RE = /\b(ads?|advertis|marketing|offsite|promoted)\b/i;
  const isEtsyAd = (r: { raw_data?: Record<string, unknown> | null }) => {
    const d = r.raw_data || {};
    return AD_RE.test(String(d.entry_type ?? '')) || AD_RE.test(String(d.description ?? ''));
  };
  const rows = adsOnly ? (rowsRaw ?? []).filter(isEtsyAd) : (rowsRaw ?? []);

  // ---- PDF (print-optimised HTML; opening it triggers the browser's "Save as
  // PDF" dialog — no PDF dependency, works on Vercel serverless). ----
  if (format === 'pdf') {
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const eur = (n: number) => '€' + n.toFixed(2);
    const sum = (k: string) => (rows as Array<Record<string, unknown>>).reduce((s, r) => s + Number(r[k] || 0), 0);
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const title = adsOnly ? 'Spesa Etsy Ads' : 'Riepilogo finanziario';
    const trs = (rows as Array<Record<string, any>>).map((r) => `<tr>
        <td>${esc(new Date(r.transaction_date).toLocaleDateString('it-IT'))}</td>
        <td>${esc(String(r.source).toUpperCase())}</td>
        <td>${esc(r.type)}</td>
        <td>${esc(r.buyer_name ?? r.buyer_email ?? '—')}</td>
        <td class="r">${eur(Number(r.gross_amount))}</td>
        <td class="r">${eur(Number(r.tax_amount))}</td>
        <td class="r">${eur(Number(r.fee_amount))}</td>
        <td class="r">${eur(Number(r.net_amount))}</td>
      </tr>`).join('');
    const kpis = adsOnly
      ? `<div class="kpi"><div class="l">Spesa Etsy Ads</div><div class="v">${eur(Math.abs(sum('net_amount')))}</div></div>`
      : `<div class="kpi"><div class="l">Incassato lordo</div><div class="v">${eur(sum('gross_amount'))}</div></div>
         <div class="kpi"><div class="l">Commissioni</div><div class="v">${eur(sum('fee_amount'))}</div></div>
         <div class="kpi"><div class="l">IVA/Tasse</div><div class="v">${eur(sum('tax_amount'))}</div></div>
         <div class="kpi"><div class="l">Netto</div><div class="v">${eur(sum('net_amount'))}</div></div>`;
    const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>SILKinCOM — ${esc(title)} ${esc(month)}</title>
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
        <p class="sub">${esc(monthName)}${source !== 'all' && !adsOnly ? ' · canale ' + esc(source.toUpperCase()) : ''} · ${rows.length} movimenti</p>
        <div class="kpis">${kpis}</div>
        <table>
          <thead><tr><th>Data</th><th>Canale</th><th>Tipo</th><th>Cliente</th><th class="r">Lordo</th><th class="r">IVA</th><th class="r">Fee</th><th class="r">Netto</th></tr></thead>
          <tbody>${trs || '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:24px;">Nessun movimento nel periodo</td></tr>'}</tbody>
          <tfoot><tr><td colspan="4">Totali</td><td class="r">${eur(sum('gross_amount'))}</td><td class="r">${eur(sum('tax_amount'))}</td><td class="r">${eur(sum('fee_amount'))}</td><td class="r">${eur(sum('net_amount'))}</td></tr></tfoot>
        </table>
        <p class="ft">SILKinCOM · P.IVA 03786790133 · generato ${esc(new Date().toLocaleString('it-IT'))}</p>
      </body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  const header = [
    'Data',
    'Canale',
    'Tipo',
    'ID transazione',
    'Numero documento',
    'Cliente',
    'Email',
    'Paese',
    'P.IVA',
    'Imponibile',
    'IVA',
    'Spedizione',
    'Fee',
    'Totale',
    'Netto',
    'Valuta',
    'Link fattura/ricevuta',
  ];

  const lines = [header.join(',')];
  for (const r of rows ?? []) {
    const imponibile = Number(r.gross_amount) - Number(r.tax_amount) - Number(r.shipping_amount);
    lines.push(
      [
        new Date(r.transaction_date).toISOString().slice(0, 10),
        r.source.toUpperCase(),
        r.type,
        r.external_id,
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
        r.currency,
        r.invoice_url ?? r.receipt_url ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }

  const body = '﻿' + lines.join('\n'); // BOM so Excel opens UTF-8 cleanly.
  const filename = `silkincom-finanziario-${month}${source !== 'all' ? `-${source}` : ''}.csv`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
