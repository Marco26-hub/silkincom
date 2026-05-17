import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PAID_STATES = ['paid', 'processing', 'shipped', 'delivered'];

function fmt(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function AdminCustomersPage() {
  const supabase = createServiceClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(500);

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id, total_amount, status, created_at')
    .not('customer_id', 'is', null)
    .limit(2000);

  // Per-customer order stats computed live from the orders table.
  const stats = new Map<string, { orders: number; spent: number; last: string | null }>();
  for (const o of orders ?? []) {
    const cid = o.customer_id as string;
    const s = stats.get(cid) ?? { orders: 0, spent: 0, last: null };
    if (PAID_STATES.includes(o.status)) {
      s.orders += 1;
      s.spent += Number(o.total_amount) || 0;
    }
    if (!s.last || o.created_at > s.last) s.last = o.created_at;
    stats.set(cid, s);
  }

  const rows = (profiles ?? []).map((p) => ({
    ...p,
    s: stats.get(p.id) ?? { orders: 0, spent: 0, last: null },
  }));

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Clienti</h1>
        <p className="text-soft-grey text-sm">{rows.length} clienti registrati</p>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium text-right">Ordini</th>
              <th className="px-5 py-3 font-medium text-right">Speso</th>
              <th className="px-5 py-3 font-medium">Ultimo ordine</th>
              <th className="px-5 py-3 font-medium">Iscritto</th>
              <th className="px-5 py-3 font-medium text-right">Scheda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3">
                  <p className="font-medium">{c.full_name ?? '—'}</p>
                  {c.phone && <p className="text-xs text-soft-grey">{c.phone}</p>}
                </td>
                <td className="px-5 py-3 text-soft-black/80">{c.email}</td>
                <td className="px-5 py-3 text-right">{c.s.orders}</td>
                <td className="px-5 py-3 text-right font-medium">{fmt(c.s.spent)}</td>
                <td className="px-5 py-3 text-xs text-soft-grey">
                  {c.s.last ? new Date(c.s.last).toLocaleDateString('it-IT') : '—'}
                </td>
                <td className="px-5 py-3 text-xs text-soft-grey">
                  {new Date(c.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/clienti/${c.id}`}
                    className="text-[10px] uppercase tracking-[0.2em] text-gold-dark hover:text-gold-primary"
                  >
                    Apri
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-soft-grey">
                  Nessun cliente registrato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
