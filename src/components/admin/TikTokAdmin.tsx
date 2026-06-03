'use client';

/**
 * TikTok Shop admin — connection + read-only mirror (orders + products), same
 * shape as the Etsy admin. "Collega" runs the OAuth; "Sincronizza" pulls into
 * the mirror tables. Engagement/selling management comes once the pull is
 * verified live.
 */
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Music2, RefreshCw, Loader2, Plug, CheckCircle2, AlertTriangle } from 'lucide-react';

type Order = { order_id: string; status: string | null; buyer_name: string | null; total_amount: number | null; currency: string | null; create_time: string | null };
type Product = { product_id: string; title: string | null; status: string | null; price: number | null; currency: string | null };

export function TikTokAdmin({
  configured, connected, sellerName, shopName, shopRegion, counts, orders, products, error,
}: {
  configured: boolean;
  connected: boolean;
  sellerName: string | null;
  shopName: string | null;
  shopRegion: string | null;
  counts: { products: number; orders: number };
  orders: Order[];
  products: Product[];
  error?: string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pull() {
    setSyncing(true); setMsg(null);
    try {
      const res = await fetch('/api/tiktok-shop/pull?what=all', { method: 'POST' });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg(`Sincronizzato: ${j.products?.count ?? 0} prodotti · ${j.orders?.count ?? 0} ordini`);
      router.refresh();
    } catch (e) { setMsg((e as Error).message); } finally { setSyncing(false); }
  }

  const eur = (v: number | null, c: string | null) =>
    v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: c || 'EUR' }).format(v);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Music2 className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">TikTok Shop</h1>
            <p className="text-soft-grey text-sm">Mirror ordini + prodotti (sola lettura) · vendite nel tuo admin come Etsy</p>
          </div>
        </div>
        {connected && (
          <button onClick={pull} disabled={syncing} className="inline-flex items-center gap-2 px-5 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizzo…' : 'Sincronizza ora'}
          </button>
        )}
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">Errore: {error}</div>}
      {msg && <div className="border border-pearl-grey bg-ivory px-4 py-2 text-xs text-soft-black">{msg}</div>}

      {!configured ? (
        <div className="border border-amber-200 bg-amber-50/50 p-6">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-600" /><h2 className="text-sm font-medium text-amber-900">App non configurata</h2></div>
          <p className="text-sm text-amber-800">Imposta su Vercel <code className="bg-amber-100 px-1.5 py-0.5 text-xs">TIKTOK_SHOP_APP_KEY</code> e <code className="bg-amber-100 px-1.5 py-0.5 text-xs">TIKTOK_SHOP_APP_SECRET</code> (+ <code className="bg-amber-100 px-1.5 py-0.5 text-xs">TIKTOK_SHOP_SERVICE_ID</code> per il bottone Collega), poi redeploy.</p>
        </div>
      ) : !connected ? (
        <div className="border border-pearl-grey bg-white p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl mb-1">Non collegato</h2>
            <p className="text-sm text-soft-grey">Autorizza il tuo TikTok Shop per leggere ordini e prodotti nell'admin.</p>
          </div>
          <a href="/api/tiktok-shop/auth" className="inline-flex items-center gap-2 px-5 py-2.5 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plug className="w-3.5 h-3.5" /> Collega TikTok Shop
          </a>
        </div>
      ) : (
        <>
          <div className="border border-pearl-grey bg-white p-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div className="text-sm">
              <span className="font-medium">Collegato</span>
              {(shopName || sellerName) && <span className="text-soft-grey"> · {shopName || sellerName}</span>}
              {shopRegion && <span className="text-soft-grey"> · {shopRegion}</span>}
              <span className="text-soft-grey"> · {counts.orders} ordini · {counts.products} prodotti</span>
            </div>
          </div>

          <Section title={`Ordini (${counts.orders})`}>
            {orders.length === 0 ? <Empty text="Nessun ordine. Clicca «Sincronizza ora»." /> : (
              <table className="w-full text-sm">
                <thead className="border-b border-pearl-grey bg-warm-white"><tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                  <th className="px-5 py-2 font-medium">Ordine</th><th className="px-5 py-2 font-medium">Stato</th><th className="px-5 py-2 font-medium">Cliente</th><th className="px-5 py-2 font-medium text-right">Totale</th><th className="px-5 py-2 font-medium">Data</th>
                </tr></thead>
                <tbody className="divide-y divide-pearl-grey/60">
                  {orders.map((o) => (
                    <tr key={o.order_id} className="hover:bg-ivory/40">
                      <td className="px-5 py-2 font-mono text-xs">{o.order_id}</td>
                      <td className="px-5 py-2 text-soft-grey">{o.status ?? '—'}</td>
                      <td className="px-5 py-2">{o.buyer_name ?? '—'}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{eur(o.total_amount, o.currency)}</td>
                      <td className="px-5 py-2 text-soft-grey whitespace-nowrap">{o.create_time ? new Date(o.create_time).toLocaleDateString('it-IT') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={`Prodotti (${counts.products})`}>
            {products.length === 0 ? <Empty text="Nessun prodotto. Clicca «Sincronizza ora»." /> : (
              <table className="w-full text-sm">
                <thead className="border-b border-pearl-grey bg-warm-white"><tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                  <th className="px-5 py-2 font-medium">Prodotto</th><th className="px-5 py-2 font-medium">Stato</th><th className="px-5 py-2 font-medium text-right">Prezzo</th>
                </tr></thead>
                <tbody className="divide-y divide-pearl-grey/60">
                  {products.map((p) => (
                    <tr key={p.product_id} className="hover:bg-ivory/40">
                      <td className="px-5 py-2">{p.title ?? p.product_id}</td>
                      <td className="px-5 py-2 text-soft-grey">{p.status ?? '—'}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{eur(p.price, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-pearl-grey bg-white overflow-x-auto">
      <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white"><h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">{title}</h3></div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-soft-grey text-sm">{text}</p>;
}
