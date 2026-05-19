import { Link } from '@/i18n/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InventoryMovementsPage() {
  const supabase = createServiceClient();

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('id, movement_type, quantity_change, quantity_before, quantity_after, reason, performed_at, reference_order_id, products(name, slug)')
    .order('performed_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Link href="/admin/magazzino" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" />
        Magazzino
      </Link>

      <div>
        <h1 className="font-display text-4xl mb-1">Movimenti magazzino</h1>
        <p className="text-soft-grey text-sm">{movements?.length ?? 0} movimenti recenti</p>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Quando</th>
              <th className="px-5 py-3 font-medium">Prodotto</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium text-right">Δ</th>
              <th className="px-5 py-3 font-medium text-right">Prima → Dopo</th>
              <th className="px-5 py-3 font-medium">Motivo</th>
              <th className="px-5 py-3 font-medium">Ordine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(movements ?? []).map((m: any) => (
              <tr key={m.id}>
                <td className="px-5 py-3 text-xs text-soft-grey">{new Date(m.performed_at).toLocaleString('it-IT')}</td>
                <td className="px-5 py-3">{m.products?.name ?? '—'}</td>
                <td className="px-5 py-3"><span className="text-[10px] uppercase tracking-[0.15em] bg-pearl-grey px-2 py-0.5">{m.movement_type}</span></td>
                <td className={`px-5 py-3 text-right font-medium ${m.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                </td>
                <td className="px-5 py-3 text-right text-soft-grey">{m.quantity_before} → {m.quantity_after}</td>
                <td className="px-5 py-3 text-xs">{m.reason ?? '—'}</td>
                <td className="px-5 py-3 text-xs">
                  {m.reference_order_id ? (
                    <Link href={`/admin/ordini/${m.reference_order_id}`} className="text-gold-primary hover:underline">vedi</Link>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {!movements?.length && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessun movimento</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
