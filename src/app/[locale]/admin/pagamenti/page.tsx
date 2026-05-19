import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function fmtEur(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'succeeded' || s === 'paid') return 'bg-green-100 text-green-700';
  if (s.includes('refund')) return 'bg-amber-100 text-amber-700';
  if (s === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-pearl-grey text-soft-grey';
}

export default async function AdminPagamentiPage() {
  const supabase = createServiceClient();
  const { data: payments } = await supabase
    .from('payments')
    .select('*, orders(order_number, customer_email)')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (payments as any[]) ?? [];
  const totalIncassato = rows
    .filter((p) => ['succeeded', 'paid'].includes((p.status || '').toLowerCase()))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalRimborsato = rows.reduce((sum, p) => sum + (Number(p.refund_amount) || 0), 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Pagamenti</h1>
        <p className="text-soft-grey text-sm">{rows.length} transazioni recenti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-pearl-grey bg-white p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Totale incassato</p>
          <p className="font-display text-3xl text-green-700">{fmtEur(totalIncassato)}</p>
        </div>
        <div className="border border-pearl-grey bg-white p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Numero transazioni</p>
          <p className="font-display text-3xl">{rows.length}</p>
        </div>
        <div className="border border-pearl-grey bg-white p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Totale rimborsato</p>
          <p className="font-display text-3xl text-amber-700">{fmtEur(totalRimborsato)}</p>
        </div>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Ordine</th>
              <th className="px-5 py-3 font-medium">Email cliente</th>
              <th className="px-5 py-3 font-medium text-right">Importo</th>
              <th className="px-5 py-3 font-medium">Metodo</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Rimborso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3 text-xs text-soft-grey">{new Date(p.created_at).toLocaleString('it-IT')}</td>
                <td className="px-5 py-3 text-xs font-medium">{p.orders?.order_number ?? '—'}</td>
                <td className="px-5 py-3 text-xs">{p.orders?.customer_email ?? '—'}</td>
                <td className="px-5 py-3 text-right">{fmtEur(p.amount)}</td>
                <td className="px-5 py-3 text-xs">{p.payment_method ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded ${statusBadge(p.status)}`}>
                    {p.status ?? '—'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-xs">
                  {p.refund_amount ? (
                    <span className="text-amber-700" title={p.refund_reason || ''}>{fmtEur(p.refund_amount)}</span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessuna transazione</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
