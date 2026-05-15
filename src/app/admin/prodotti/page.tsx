import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function AdminProductsPage() {
  const supabase = await createServerClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, sku, price, status, is_featured, inventory(quantity_available)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-4xl mb-1">Prodotti</h1>
          <p className="text-soft-grey text-sm">{products?.length ?? 0} prodotti</p>
        </div>
        <Link
          href="/admin/prodotti/nuovo"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuovo prodotto
        </Link>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium text-right">Prezzo</th>
              <th className="px-5 py-3 font-medium text-right">Stock</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(products ?? []).map((p: any) => {
              const stock = Array.isArray(p.inventory) ? p.inventory[0]?.quantity_available ?? 0 : 0;
              return (
                <tr key={p.id} className="hover:bg-warm-white">
                  <td className="px-5 py-3">
                    <Link href={`/admin/prodotti/${p.id}`} className="font-medium hover:text-gold-primary">{p.name}</Link>
                    <p className="text-[10px] text-soft-grey">{p.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-soft-grey font-mono text-xs">{p.sku}</td>
                  <td className="px-5 py-3 text-right">{formatPrice(Number(p.price))}</td>
                  <td className={`px-5 py-3 text-right ${stock < 5 ? 'text-amber-600 font-medium' : ''}`}>{stock}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 ${
                      p.status === 'published' ? 'bg-green-100 text-green-800' :
                      p.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/prodotti/${p.id}`} className="text-xs text-gold-primary hover:underline">Modifica</Link>
                  </td>
                </tr>
              );
            })}
            {!products?.length && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Nessun prodotto. Esegui <code>npm run seed:products</code></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
