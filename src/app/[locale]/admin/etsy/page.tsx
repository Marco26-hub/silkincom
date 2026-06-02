'use client';

/**
 * Admin /etsy — Etsy as a SEPARATE read-only mirror.
 *
 * Default action is PULL (download Etsy listings + orders into the etsy_*
 * mirror tables — never touches site products/orders/inventory). The PUSH
 * actions (write the site catalogue / stock onto Etsy) live in a separate
 * "Modifica su Etsy" card and require an explicit confirmation, because they
 * can overwrite or duplicate the existing Etsy listings.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import {
  Store, Download, ShoppingBag, Boxes, Package, RefreshCw, Link2,
  CheckCircle, ExternalLink, ArrowRight, AlertTriangle,
} from 'lucide-react';

type SyncLog = {
  id: string;
  action: string;
  product_count: number | null;
  error_message: string | null;
  created_at: string;
};

type Status = {
  connected: boolean;
  connectedAt: string | null;
  shopId: string | null;
  listingsCount: number;
  ordersCount: number;
  lastPullAt: string | null;
  logs: SyncLog[];
};

export default function AdminEtsyPage() {
  const params = useSearchParams();
  const justConnected = params.get('connected') === 'true';
  const authError = params.get('error');

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/etsy/status');
      setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function pull() {
    setPulling(true);
    setMsg(null);
    try {
      const res = await fetch('/api/etsy/pull?what=all', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        const l = data.pull_listings?.synced ?? 0;
        const o = data.pull_orders?.synced ?? 0;
        const errs = [...(data.pull_listings?.errors ?? []), ...(data.pull_orders?.errors ?? [])];
        setMsg({
          type: errs.length ? 'err' : 'ok',
          text: `Scaricati ${l} listing e ${o} ordini da Etsy${errs.length ? ` — ${errs.length} avvisi` : ''}.`,
        });
      } else {
        setMsg({ type: 'err', text: data.error || 'Errore download' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setPulling(false);
      load();
    }
  }

  async function push(kind: 'products' | 'inventory') {
    const label = kind === 'products' ? 'i LISTING' : 'lo STOCK';
    if (!confirm(
      `Stai per MODIFICARE ${label} su Etsy con i dati del sito.\n\n` +
      `Questo può sovrascrivere o duplicare le inserzioni esistenti su Etsy. ` +
      `Procedere solo se sei sicuro.\n\nContinuare?`,
    )) return;
    setPushing(kind);
    setMsg(null);
    try {
      const res = await fetch(`/api/etsy/sync-${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'ok', text: `Push ${kind}: ${data.synced ?? 0} aggiornati, ${data.skipped ?? 0} saltati.` });
      } else {
        setMsg({ type: 'err', text: data.error || `Errore push ${kind}` });
      }
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setPushing(null);
      load();
    }
  }

  const connected = !!status?.connected;

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-[#F1641E]" />
        <div>
          <h1 className="font-display text-4xl">Etsy</h1>
          <p className="text-soft-grey text-sm">Mirror sola lettura — separato dal catalogo del sito</p>
        </div>
      </div>

      {authError && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Connessione: {authError}{params.get('reason') ? ` — ${params.get('reason')}` : ''}
        </div>
      )}
      {justConnected && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Etsy connesso con successo!
        </div>
      )}
      {msg && (
        <div className={`border px-4 py-3 text-sm ${msg.type === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Connection */}
      <div className="border border-pearl-grey bg-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm font-medium">{connected ? 'Connesso' : loading ? 'Verifica…' : 'Non connesso'}</span>
            {connected && status?.shopId && (
              <span className="text-xs text-soft-grey">· shop {status.shopId}</span>
            )}
          </div>
          {!connected && !loading && (
            <a href="/api/etsy/auth" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F1641E] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4551a] transition-colors">
              <Link2 className="w-3.5 h-3.5" /> Connetti Etsy
            </a>
          )}
          {connected && (
            <button
              onClick={pull}
              disabled={pulling}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40"
            >
              <Download className={`w-3.5 h-3.5 ${pulling ? 'animate-pulse' : ''}`} />
              {pulling ? 'Scarico da Etsy…' : 'Scarica da Etsy'}
            </button>
          )}
        </div>
        {connected && (
          <p className="mt-3 text-xs text-soft-grey">
            {status?.listingsCount ?? 0} inserzioni · {status?.ordersCount ?? 0} ordini nel mirror ·
            ultimo download: {status?.lastPullAt ? new Date(status.lastPullAt).toLocaleString('it-IT') : 'mai'}
          </p>
        )}
      </div>

      {connected && (
        <>
          {/* Read-only mirror sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/etsy/catalogo" className="border border-pearl-grey bg-white p-5 hover:border-soft-black transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gold-primary" />
                  <span className="text-sm font-medium">Catalogo Etsy</span>
                </div>
                <ArrowRight className="w-4 h-4 text-soft-grey group-hover:text-soft-black group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-display text-3xl mt-3">{status?.listingsCount ?? 0}</p>
              <p className="text-xs text-soft-grey mt-1">inserzioni Etsy (sola lettura)</p>
            </Link>
            <Link href="/admin/etsy/ordini" className="border border-pearl-grey bg-white p-5 hover:border-soft-black transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gold-primary" />
                  <span className="text-sm font-medium">Ordini Etsy</span>
                </div>
                <ArrowRight className="w-4 h-4 text-soft-grey group-hover:text-soft-black group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-display text-3xl mt-3">{status?.ordersCount ?? 0}</p>
              <p className="text-xs text-soft-grey mt-1">ordini Etsy (sola lettura)</p>
            </Link>
          </div>

          {/* PUSH — gated behind confirmation */}
          <div className="border border-amber-200 bg-amber-50/40 p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-medium text-amber-900">Modifica su Etsy (avanzato)</h3>
            </div>
            <p className="text-xs text-amber-800 mb-4 max-w-[640px]">
              Queste azioni scrivono i dati del SITO sulle inserzioni Etsy. Possono
              sovrascrivere o duplicare i listing esistenti — usare solo con cognizione.
              Ogni azione chiede conferma.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => push('products')}
                disabled={!!pushing}
                className="inline-flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-900 text-[10px] uppercase tracking-[0.2em] hover:bg-amber-100 transition-colors disabled:opacity-40"
              >
                <Package className="w-3.5 h-3.5" />
                {pushing === 'products' ? 'Invio…' : 'Push catalogo → Etsy'}
              </button>
              <button
                onClick={() => push('inventory')}
                disabled={!!pushing}
                className="inline-flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-900 text-[10px] uppercase tracking-[0.2em] hover:bg-amber-100 transition-colors disabled:opacity-40"
              >
                <Boxes className="w-3.5 h-3.5" />
                {pushing === 'inventory' ? 'Invio…' : 'Push stock → Etsy'}
              </button>
            </div>
          </div>

          {/* Sync log */}
          {(status?.logs.length ?? 0) > 0 && (
            <div className="border border-pearl-grey bg-white overflow-x-auto">
              <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">Storico operazioni</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-pearl-grey">
                  <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                    <th className="px-5 py-2 font-medium">Azione</th>
                    <th className="px-5 py-2 font-medium text-right">Record</th>
                    <th className="px-5 py-2 font-medium">Errore</th>
                    <th className="px-5 py-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-grey/60">
                  {status!.logs.map((l) => (
                    <tr key={l.id}>
                      <td className="px-5 py-2">{l.action}</td>
                      <td className="px-5 py-2 text-right text-green-700">{l.product_count ?? 0}</td>
                      <td className="px-5 py-2 text-xs text-red-600 max-w-[300px] truncate">{l.error_message || '—'}</td>
                      <td className="px-5 py-2 text-xs text-soft-grey">{new Date(l.created_at).toLocaleString('it-IT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="bg-ivory border border-pearl-grey/60 p-4 text-xs text-soft-grey space-y-1">
        <p>
          <strong>Mirror separato:</strong> "Scarica da Etsy" copia inserzioni e ordini
          nelle tabelle Etsy dedicate, senza mai toccare prodotti, ordini o magazzino del sito.
          I due cataloghi restano indipendenti.
        </p>
        <p className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          <a href="https://www.etsy.com/your/shops/me/dashboard" target="_blank" rel="noopener noreferrer" className="hover:text-gold-primary">
            Apri dashboard Etsy
          </a>
        </p>
      </div>
    </div>
  );
}
