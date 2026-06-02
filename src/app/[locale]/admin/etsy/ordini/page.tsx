import { Link } from '@/i18n/navigation';
import { ArrowLeft, ExternalLink, Store } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type EtsyOrder = {
  receipt_id: number;
  buyer_name: string | null;
  buyer_email: string | null;
  status: string | null;
  is_paid: boolean | null;
  is_shipped: boolean | null;
  grandtotal: number | null;
  currency: string | null;
  num_items: number | null;
  etsy_created_at: string | null;
};

function fmt(v: number | null, cur: string | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur || 'EUR' }).format(v);
}

export default async function AdminEtsyOrdiniPage() {
  const supabase = createServiceClient();
  const { data: orders } = await supabase
    .from('etsy_orders')
    .select('receipt_id, buyer_name, buyer_email, status, is_paid, is_shipped, grandtotal, currency, num_items, etsy_created_at')
    .order('etsy_created_at', { ascending: false })
    .limit(500);

  const rows = (orders ?? []) as EtsyOrder[];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Link href="/admin/etsy" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" /> Etsy
      </Link>

      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-[#F1641E]" />
        <div>
          <h1 className="font-display text-4xl">Ordini Etsy</h1>
          <p className="text-soft-grey text-sm">{rows.length} ordini · sola lettura, non toccano stock/ordini del sito</p>
        </div>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-pearl-grey bg-warm-white/60">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-5 py-2 font-medium">Cliente</th>
              <th className="px-5 py-2 font-medium">Stato</th>
              <th className="px-5 py-2 font-medium text-right">Articoli</th>
              <th className="px-5 py-2 font-medium text-right">Totale</th>
              <th className="px-5 py-2 font-medium">Pagato</th>
              <th className="px-5 py-2 font-medium">Spedito</th>
              <th className="px-5 py-2 font-medium">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {rows.map((o) => (
              <tr key={o.receipt_id} className="hover:bg-ivory/40">
                <td className="px-5 py-2 whitespace-nowrap">
                  {o.etsy_created_at ? new Date(o.etsy_created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                </td>
                <td className="px-5 py-2 max-w-[260px] truncate">{o.buyer_name || o.buyer_email || `#${o.receipt_id}`}</td>
                <td className="px-5 py-2 text-soft-grey">{o.status || '—'}</td>
                <td className="px-5 py-2 text-right tabular-nums">{o.num_items ?? 0}</td>
                <td className="px-5 py-2 text-right tabular-nums font-medium">{fmt(o.grandtotal, o.currency)}</td>
                <td className="px-5 py-2">{o.is_paid ? '✓' : '—'}</td>
                <td className="px-5 py-2">{o.is_shipped ? '✓' : '—'}</td>
                <td className="px-5 py-2">
                  <a href={`https://www.etsy.com/your/orders/sold/orders/${o.receipt_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-soft-grey hover:text-gold-primary">
                    Etsy <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-soft-grey text-sm">
                  Nessun ordine. Vai su Etsy → «Scarica da Etsy» per popolare il mirror.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
