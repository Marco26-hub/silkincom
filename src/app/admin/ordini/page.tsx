import { createServiceClient } from '@/lib/supabase/server';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';
import { OrderFilters } from '@/components/admin/OrderFilters';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;


export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status && STATUS_FILTERS.includes(params.status as any) ? params.status : 'all';
  const q = params.q ?? '';

  const supabase = createServiceClient();
  let query = supabase
    .from('orders')
    .select('id, order_number, customer_email, total_amount, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter !== 'all') query = query.eq('status', filter);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%`);

  const { data: orders } = await query;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Ordini</h1>
        <p className="text-soft-grey text-sm">{orders?.length ?? 0} ordini</p>
      </div>

      <OrderFilters />

      <AdminOrdersTable orders={orders ?? []} />
    </div>
  );
}
