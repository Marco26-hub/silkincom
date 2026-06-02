/**
 * POST /api/admin/financial/email-report  (admin)
 *
 * Emails the accounting report for a period (quarter/month/range) to the
 * commercialista: an entrate/uscite/spese-totali/saldo summary in the body
 * plus the full per-transaction detail (Etsy + Stripe) attached as CSV.
 *
 * Body: { to: string, quarter?: 'YYYY-Qn', month?: 'YYYY-MM',
 *         start?: 'YYYY-MM-DD', end?: 'YYYY-MM-DD', source?: 'stripe'|'etsy'|'all' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { computeTotals, resolvePeriod, buildCsv, type FinRow, type CsvRow } from '@/lib/financial/summary';
import { sendFinancialReport } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, email: null };
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403, email: null };
  }
  return { ok: true as const, email: user.email ?? null };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as {
    to?: string; quarter?: string; month?: string; start?: string; end?: string; source?: string;
  };

  const to = String(body.to ?? '').trim();
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'Email destinatario non valida' }, { status: 400 });

  const source = body.source && ['stripe', 'etsy'].includes(body.source) ? body.source : 'all';

  // Build the same query params resolvePeriod understands.
  const sp = new URLSearchParams();
  if (body.quarter) sp.set('quarter', body.quarter);
  else if (body.start && body.end) { sp.set('start', body.start); sp.set('end', body.end); }
  else if (body.month) sp.set('month', body.month);
  const { start, end, label, key } = resolvePeriod(sp);

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

  const totals = computeTotals((rows ?? []) as unknown as FinRow[]);
  const csv = buildCsv((rows ?? []) as unknown as CsvRow[]);
  const csvFilename = `silkincom-contabile-${key}.csv`;

  try {
    await sendFinancialReport({
      to,
      periodLabel: label,
      totals,
      count: rows?.length ?? 0,
      csv,
      csvFilename,
      replyTo: auth.email ?? undefined,
    });
    return NextResponse.json({ ok: true, to, period: label, count: rows?.length ?? 0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
