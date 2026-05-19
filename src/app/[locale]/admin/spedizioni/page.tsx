'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Truck, RefreshCw, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';

type Shipment = {
  id: string;
  order_id: string;
  carrier: string | null;
  service_name: string | null;
  packlink_reference: string | null;
  tracking_number: string | null;
  status: string | null;
  price: number | null;
  label_url: string | null;
  orders: { order_number: string; customer_email: string } | null;
};

type ToShip = {
  id: string;
  order_number: string;
  customer_email: string;
  total_amount: number;
  created_at: string;
};

type ReorderAlert = {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_available: number;
  reorder_threshold: number;
  reorder_quantity: number;
  supplier_name: string | null;
  estimated_cost: number | null;
};

export default function SpedizioniPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [toShip, setToShip] = useState<ToShip[]>([]);
  const [reorder, setReorder] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/admin/shipments');
      const data = await res.json();
      setShipments(data.shipments || []);
      setToShip(data.toShip || []);
      setReorder(data.reorder || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function syncAll() {
    setSyncing(true);
    const withRef = shipments.filter((s) => s.packlink_reference);
    for (const s of withRef) {
      try {
        await fetch(`/api/admin/orders/${s.order_id}/packlink-ship`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync' }),
        });
      } catch {
        /* continue with the rest */
      }
    }
    await load();
    setSyncing(false);
  }

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Truck className="w-6 h-6 text-gold-primary" />
        <div>
          <h1 className="font-display text-4xl">Spedizioni & Riordini</h1>
          <p className="text-soft-grey text-sm">Packlink PRO + alert magazzino</p>
        </div>
      </div>

      {/* Packlink shipments */}
      <section className="border border-pearl-grey bg-white">
        <div className="px-6 py-4 border-b border-pearl-grey flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em]">
            Spedizioni Packlink ({shipments.length})
          </h2>
          <button
            onClick={syncAll}
            disabled={syncing || shipments.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-soft-black/30 text-[10px] uppercase tracking-[0.2em] hover:bg-pearl-grey/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizzo...' : 'Sincronizza tutte'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-white border-b border-pearl-grey">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                <th className="px-5 py-3 font-medium">Ordine</th>
                <th className="px-5 py-3 font-medium">Corriere</th>
                <th className="px-5 py-3 font-medium">Riferimento</th>
                <th className="px-5 py-3 font-medium">Stato</th>
                <th className="px-5 py-3 font-medium">Tracking</th>
                <th className="px-5 py-3 font-medium text-right">Etichetta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pearl-grey/60">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-soft-grey">Caricamento...</td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-soft-grey">Nessuna spedizione Packlink. Creale dalla pagina del singolo ordine.</td></tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-ivory/50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/ordini/${s.order_id}`} className="text-gold-dark hover:text-gold-primary font-medium">
                        {s.orders?.order_number ?? s.order_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs">{s.carrier ?? '—'}</td>
                    <td className="px-5 py-3 text-xs font-mono">{s.packlink_reference ?? '—'}</td>
                    <td className="px-5 py-3 text-xs">{s.status ?? '—'}</td>
                    <td className="px-5 py-3 text-xs">{s.tracking_number ?? 'in attesa'}</td>
                    <td className="px-5 py-3 text-right">
                      {s.label_url ? (
                        <a href={s.label_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold-dark hover:text-gold-primary text-xs">
                          <ExternalLink className="w-3 h-3" /> PDF
                        </a>
                      ) : (
                        <span className="text-xs text-soft-grey">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="px-6 py-3 text-[11px] text-soft-grey border-t border-pearl-grey/60">
          Crea le spedizioni dal dettaglio ordine. Dopo aver pagato la spedizione su Packlink,
          usa &quot;Sincronizza tutte&quot; per importare tracking ed etichette.
        </p>
      </section>

      {/* Orders awaiting a shipment */}
      <section className="border border-pearl-grey bg-white">
        <div className="px-6 py-4 border-b border-pearl-grey">
          <h2 className="text-sm font-medium uppercase tracking-[0.15em]">
            Ordini da spedire ({toShip.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-white border-b border-pearl-grey">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                <th className="px-5 py-3 font-medium">Ordine</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium text-right">Totale</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium text-right">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pearl-grey/60">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-soft-grey">Caricamento...</td></tr>
              ) : toShip.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-soft-grey">Nessun ordine in attesa di spedizione.</td></tr>
              ) : (
                toShip.map((o) => (
                  <tr key={o.id} className="hover:bg-ivory/50">
                    <td className="px-5 py-3 font-medium">{o.order_number}</td>
                    <td className="px-5 py-3 text-xs">{o.customer_email}</td>
                    <td className="px-5 py-3 text-right">€{Number(o.total_amount).toFixed(2)}</td>
                    <td className="px-5 py-3 text-xs text-soft-grey">{new Date(o.created_at).toLocaleDateString('it-IT')}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/ordini/${o.id}`} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-gold-dark hover:text-gold-primary">
                        Crea spedizione <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reorder alerts */}
      <section className="border border-pearl-grey bg-white">
        <div className="px-6 py-4 border-b border-pearl-grey flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <h2 className="text-sm font-medium uppercase tracking-[0.15em]">
            Riordini necessari ({reorder.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-white border-b border-pearl-grey">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                <th className="px-5 py-3 font-medium">Prodotto</th>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
                <th className="px-5 py-3 font-medium text-right">Soglia</th>
                <th className="px-5 py-3 font-medium text-right">Riordino</th>
                <th className="px-5 py-3 font-medium">Fornitore</th>
                <th className="px-5 py-3 font-medium text-right">Costo stimato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pearl-grey/60">
              {reorder.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-soft-grey text-sm">Tutti i prodotti hanno stock sufficiente.</td></tr>
              ) : (
                reorder.map((a) => (
                  <tr key={a.product_id}>
                    <td className="px-5 py-3">{a.product_name}</td>
                    <td className="px-5 py-3 text-xs font-mono">{a.sku}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`px-2 py-0.5 text-xs ${a.quantity_available === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {a.quantity_available}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-soft-grey">{a.reorder_threshold}</td>
                    <td className="px-5 py-3 text-right">{a.reorder_quantity}</td>
                    <td className="px-5 py-3 text-xs">{a.supplier_name || '—'}</td>
                    <td className="px-5 py-3 text-right">{a.estimated_cost ? `€${Number(a.estimated_cost).toFixed(2)}` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
