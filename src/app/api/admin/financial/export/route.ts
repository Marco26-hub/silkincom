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

  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();

  const supabase = createServiceClient();
  let q = supabase
    .from('financial_records')
    .select(
      'transaction_date, source, type, external_id, invoice_number, buyer_name, buyer_email, buyer_country, buyer_vat_number, gross_amount, fee_amount, tax_amount, shipping_amount, net_amount, currency, invoice_url, receipt_url',
    )
    .gte('transaction_date', start)
    .lt('transaction_date', end)
    .order('transaction_date', { ascending: true });
  if (source !== 'all') q = q.eq('source', source);
  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
