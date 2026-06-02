import { createServiceClient } from '@/lib/supabase/server';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';
import { OrderFilters } from '@/components/admin/OrderFilters';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;


export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; test?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status && STATUS_FILTERS.includes(params.status as any) ? params.status : 'all';
  const q = params.q ?? '';
  const showTest = params.test === '1';

  const supabase = createServiceClient();
  let query = supabase
    .from('orders')
    .select('id, order_number, customer_email, total_amount, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter !== 'all') query = query.eq('status', filter);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%`);
  // Hide test orders by default; ?test=1 reveals them for inspection.
  if (!showTest) query = query.eq('is_test', false);

  const { data: orders } = await query;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-4xl mb-1">Ordini</h1>
          <p className="text-soft-grey text-sm">{orders?.length ?? 0} ordini{showTest ? ' · inclusi i test' : ''}</p>
        </div>
        <a href={showTest ? '/admin/ordini' : '/admin/ordini?test=1'} className="text-xs text-soft-grey hover:text-soft-black underline">
          {showTest ? 'Nascondi test' : 'Mostra ordini test'}
        </a>
      </div>

      <OrderFilters />

      <AdminOrdersTable orders={orders ?? []} />
    </div>
  );
}
