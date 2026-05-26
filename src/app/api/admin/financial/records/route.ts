/**
 * Read endpoint for the /admin/fatture page. Returns financial_records
 * filtered by month + source, with totals already aggregated server-side
 * so the UI doesn't reduce huge arrays in the browser.
 *
 * Query params:
 *   month=YYYY-MM      (default: current month)
 *   source=stripe|etsy|all  (default: all)
 *   type=charge|invoice|refund|fee|payout|tax|all (default: all)
 *   page=1, perPage=50 (pagination)
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
  return { ok: true as const, userId: user.id };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const url = new URL(req.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  const source = url.searchParams.get('source') || 'all';
  const type = url.searchParams.get('type') || 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const perPage = Math.min(200, Math.max(1, parseInt(url.searchParams.get('perPage') || '50', 10)));

  // Month → [start, end) range in UTC. We want every transaction whose
  // transaction_date falls inside the calendar month for the active timezone
  // (Europe/Rome). Storing in UTC, we just intersect the UTC month — close
  // enough for accounting, and the commercialista filters by calendar month
  // anyway.
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();

  const supabase = createServiceClient();
  let q = supabase
    .from('financial_records')
    .select('*', { count: 'exact' })
    .gte('transaction_date', start)
    .lt('transaction_date', end)
    .order('transaction_date', { ascending: false });
  if (source !== 'all') q = q.eq('source', source);
  if (type !== 'all') q = q.eq('type', type);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data: rows, error, count } = await q.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Totals across the WHOLE filtered set (not just this page).
  const totalsQ = supabase
    .from('financial_records')
    .select('source, type, gross_amount, fee_amount, tax_amount, shipping_amount, net_amount, currency')
    .gte('transaction_date', start)
    .lt('transaction_date', end);
  if (source !== 'all') totalsQ.eq('source', source);
  if (type !== 'all') totalsQ.eq('type', type);
  const { data: totalsRows } = await totalsQ;

  const totals = (totalsRows ?? []).reduce(
    (acc, r) => {
      acc.gross += Number(r.gross_amount);
      acc.fees += Number(r.fee_amount);
      acc.tax += Number(r.tax_amount);
      acc.shipping += Number(r.shipping_amount);
      acc.net += Number(r.net_amount);
      acc.bySource[r.source] = (acc.bySource[r.source] ?? 0) + Number(r.net_amount);
      acc.byType[r.type] = (acc.byType[r.type] ?? 0) + Number(r.gross_amount);
      return acc;
    },
    {
      gross: 0,
      fees: 0,
      tax: 0,
      shipping: 0,
      net: 0,
      bySource: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    },
  );

  // Sync state per-source so the UI can show "last synced at" + last error.
  const { data: syncStates } = await supabase
    .from('financial_sync_state')
    .select('source, last_synced_at, last_status, last_error');

  return NextResponse.json({
    month,
    source,
    type,
    page,
    perPage,
    total: count ?? 0,
    rows: rows ?? [],
    totals,
    syncStates: syncStates ?? [],
  });
}
