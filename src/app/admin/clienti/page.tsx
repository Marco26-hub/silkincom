import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function AdminCustomersPage() {
  const supabase = await createServerClient();
  const { data: customers } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at, customers(lifetime_value, total_orders, last_order_at)')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Clienti</h1>
        <p className="text-soft-grey text-sm">{customers?.length ?? 0} clienti registrati</p>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium text-right">Ordini</th>
              <th className="px-5 py-3 font-medium text-right">LTV</th>
              <th className="px-5 py-3 font-medium">Ultimo ordine</th>
              <th className="px-5 py-3 font-medium">Iscritto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(customers ?? []).map((c: any) => {
              const stats = Array.isArray(c.customers) ? c.customers[0] : c.customers;
              return (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{c.full_name ?? '—'}</p>
                    {c.phone && <p className="text-xs text-soft-grey">{c.phone}</p>}
                  </td>
                  <td className="px-5 py-3 text-soft-black/80">{c.email}</td>
                  <td className="px-5 py-3 text-right">{stats?.total_orders ?? 0}</td>
                  <td className="px-5 py-3 text-right font-medium">{formatPrice(Number(stats?.lifetime_value ?? 0))}</td>
                  <td className="px-5 py-3 text-xs text-soft-grey">
                    {stats?.last_order_at ? new Date(stats.last_order_at).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-soft-grey">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                </tr>
              );
            })}
            {!customers?.length && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Nessun cliente registrato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
