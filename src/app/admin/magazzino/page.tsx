import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { InventoryAdjustForm } from '@/components/admin/InventoryAdjustForm';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? 'all';

  const supabase = await createServerClient();
  let query = supabase
    .from('inventory')
    .select('id, product_id, quantity_total, quantity_available, quantity_reserved, last_restocked_at, products(name, slug, sku, status)')
    .order('quantity_available', { ascending: true })
    .limit(200);

  if (filter === 'low') query = query.lt('quantity_available', 5);
  if (filter === 'out') query = query.eq('quantity_available', 0);

  const { data: rows } = await query;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Magazzino</h1>
        <p className="text-soft-grey text-sm">{rows?.length ?? 0} prodotti</p>
      </div>

      <div className="flex gap-2 text-xs uppercase tracking-[0.2em]">
        {[['all', 'Tutti'], ['low', 'Scorta bassa (<5)'], ['out', 'Esauriti']].map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/magazzino?filter=${k}`}
            className={`px-4 py-2 border ${filter === k ? 'bg-soft-black text-warm-white border-soft-black' : 'border-pearl-grey hover:border-soft-black'}`}
          >
            {label}
          </Link>
        ))}
        <Link href="/admin/magazzino/movimenti" className="px-4 py-2 border border-pearl-grey hover:border-soft-black ml-auto">
          Storico movimenti
        </Link>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Prodotto</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium text-right">Disponibile</th>
              <th className="px-5 py-3 font-medium text-right">Riservato</th>
              <th className="px-5 py-3 font-medium text-right">Totale</th>
              <th className="px-5 py-3 font-medium">Rettifica</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(rows ?? []).map((r: any) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium">{r.products?.name ?? '—'}</td>
                <td className="px-5 py-3 font-mono text-xs text-soft-grey">{r.products?.sku}</td>
                <td className={`px-5 py-3 text-right font-medium ${r.quantity_available < 5 ? 'text-amber-600' : ''} ${r.quantity_available === 0 ? 'text-red-600' : ''}`}>
                  {r.quantity_available}
                </td>
                <td className="px-5 py-3 text-right text-soft-grey">{r.quantity_reserved}</td>
                <td className="px-5 py-3 text-right text-soft-grey">{r.quantity_total}</td>
                <td className="px-5 py-3">
                  <InventoryAdjustForm productId={r.product_id} currentQty={r.quantity_available} />
                </td>
              </tr>
            ))}
            {!rows?.length && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Nessun prodotto</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
