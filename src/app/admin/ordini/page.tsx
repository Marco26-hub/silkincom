import { createServiceClient } from '@/lib/supabase/server';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';

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

      <form method="GET" className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cerca per numero o email..."
          className="border border-pearl-grey px-4 py-2 text-sm font-light w-72 focus:outline-none focus:border-soft-black"
        />
        <select
          name="status"
          defaultValue={filter}
          className="border border-pearl-grey px-4 py-2 text-sm font-light bg-white focus:outline-none focus:border-soft-black"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'Tutti gli stati' : s}</option>
          ))}
        </select>
        <button type="submit" className="px-5 py-2 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em]">
          Filtra
        </button>
      </form>

      <AdminOrdersTable orders={orders ?? []} />
    </div>
  );
}
