'use client';

import { useEffect, useState } from 'react';
import { Truck, RefreshCw, ExternalLink } from 'lucide-react';

type Shipment = {
  id: string;
  carrier: string | null;
  service_name: string | null;
  packlink_reference: string | null;
  tracking_number: string | null;
  status: string | null;
  label_url: string | null;
  price: number | null;
};

export function PacklinkShipPanel({ orderId }: { orderId: string }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'create' | 'sync' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/packlink-ship`);
      const data = await res.json();
      setShipment(data.shipment ?? null);
    } catch {
      /* ignore — panel just shows the create button */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function run(action: 'create' | 'sync') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/packlink-ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Errore Packlink');
      else await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore di rete');
    }
    setBusy(null);
  }

  return (
    <section className="border border-pearl-grey bg-white p-6">
      <h2 className="font-medium mb-3 text-sm flex items-center gap-2">
        <Truck className="w-4 h-4 text-gold-primary" /> Spedizione Packlink
      </h2>

      {loading ? (
        <p className="text-xs text-soft-grey">Caricamento...</p>
      ) : shipment?.packlink_reference ? (
        <dl className="text-xs space-y-2">
          <div className="flex justify-between gap-3">
            <dt className="text-soft-grey">Riferimento</dt>
            <dd className="font-mono truncate">{shipment.packlink_reference}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-soft-grey">Corriere</dt>
            <dd>{shipment.carrier ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-soft-grey">Stato</dt>
            <dd>{shipment.status ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-soft-grey">Tracking</dt>
            <dd>{shipment.tracking_number ?? 'in attesa'}</dd>
          </div>
          {shipment.price != null && (
            <div className="flex justify-between">
              <dt className="text-soft-grey">Costo</dt>
              <dd>€{Number(shipment.price).toFixed(2)}</dd>
            </div>
          )}
          {shipment.label_url && (
            <a
              href={shipment.label_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gold-dark hover:text-gold-primary"
            >
              <ExternalLink className="w-3 h-3" /> Etichetta PDF
            </a>
          )}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => run('sync')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-soft-black/30 text-[10px] uppercase tracking-[0.2em] hover:bg-pearl-grey/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${busy === 'sync' ? 'animate-spin' : ''}`} />
              {busy === 'sync' ? 'Sincronizzo...' : 'Sincronizza'}
            </button>
            <a
              href="https://pro.packlink.com/private/shipments/all"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black"
            >
              Apri Packlink
            </a>
          </div>
          <p className="text-[10px] text-soft-grey leading-relaxed pt-1">
            Paga la spedizione dal tuo account Packlink per ottenere etichetta e tracking,
            poi premi &quot;Sincronizza&quot;.
          </p>
        </dl>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-soft-grey">Nessuna spedizione creata per questo ordine.</p>
          <button
            onClick={() => run('create')}
            disabled={busy !== null}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
          >
            <Truck className="w-3.5 h-3.5" />
            {busy === 'create' ? 'Creazione...' : 'Crea spedizione Packlink'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mt-3 break-words">
          {error}
        </p>
      )}
    </section>
  );
}
