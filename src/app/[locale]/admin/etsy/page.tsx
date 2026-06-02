'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Store, Package, ShoppingBag, Boxes, RefreshCw, Link2, CheckCircle, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type SyncLog = {
  id: string;
  sync_type: string;
  synced_count: number;
  skipped_count: number;
  errors: string[];
  created_at: string;
};

export default function AdminEtsyPage() {
  const params = useSearchParams();
  const justConnected = params.get('connected') === 'true';
  const authError = params.get('error');

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [mappingCount, setMappingCount] = useState(0);

  async function checkConnection() {
    // Read connection state via the server (service client) — the integrations
    // row holds OAuth tokens and is correctly hidden from the browser by RLS,
    // so a direct browser query always returned "not connected".
    try {
      const res = await fetch('/api/etsy/status');
      const data = await res.json();
      setConnected(!!data.connected);
      setMappingCount(data.mappingCount || 0);
      setLogs((data.logs as SyncLog[]) || []);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkConnection(); }, []);

  async function runSync(type: 'products' | 'orders' | 'inventory') {
    setSyncing(type);
    setLastResult(null);
    try {
      const res = await fetch(`/api/etsy/sync-${type}`, { method: 'POST' });
      const data = await res.json();
      setLastResult({ type, ...data });

      const supabase = createBrowserClient();
      await supabase.from('etsy_sync_log').insert({
        sync_type: type,
        synced_count: data.synced || 0,
        skipped_count: data.skipped || 0,
        errors: data.errors || [],
      });

      checkConnection();
    } catch (err: any) {
      setLastResult({ type, error: err.message });
    }
    setSyncing(null);
  }

  return (
    <div className="space-y-6 max-w-[1000px]">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-[#F1641E]" />
        <div>
          <h1 className="font-display text-4xl">Etsy</h1>
          <p className="text-soft-grey text-sm">Integrazione marketplace</p>
        </div>
      </div>

      {authError && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Connessione fallita: {authError}
        </div>
      )}
      {justConnected && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Etsy connesso con successo!
        </div>
      )}

      <div className="border border-pearl-grey bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm font-medium">{connected ? 'Connesso' : 'Non connesso'}</span>
          </div>
          {!connected && !loading && (
            <a
              href="/api/etsy/auth"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F1641E] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4551a] transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" /> Connetti Etsy
            </a>
          )}
        </div>
        {connected && (
          <p className="mt-2 text-xs text-soft-grey">{mappingCount} prodotti mappati su Etsy</p>
        )}
      </div>

      {connected && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SyncCard
              icon={Package}
              title="Prodotti"
              desc="Push catalogo → Etsy"
              syncing={syncing === 'products'}
              disabled={!!syncing}
              onSync={() => runSync('products')}
            />
            <SyncCard
              icon={ShoppingBag}
              title="Ordini"
              desc="Pull ordini Etsy → admin"
              syncing={syncing === 'orders'}
              disabled={!!syncing}
              onSync={() => runSync('orders')}
            />
            <SyncCard
              icon={Boxes}
              title="Inventario"
              desc="Sync stock → Etsy"
              syncing={syncing === 'inventory'}
              disabled={!!syncing}
              onSync={() => runSync('inventory')}
            />
          </div>

          {lastResult && (
            <div className={`border px-4 py-3 text-sm ${lastResult.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-800'}`}>
              {lastResult.error ? (
                <p>Errore: {lastResult.error}</p>
              ) : (
                <>
                  <p><strong>{lastResult.type}</strong>: {lastResult.synced} sincronizzati, {lastResult.skipped} saltati</p>
                  {lastResult.errors?.length > 0 && (
                    <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                      {lastResult.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          {logs.length > 0 && (
            <div className="border border-pearl-grey bg-white overflow-x-auto">
              <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">Storico sincronizzazioni</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-pearl-grey">
                  <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                    <th className="px-5 py-2 font-medium">Tipo</th>
                    <th className="px-5 py-2 font-medium text-right">Sync</th>
                    <th className="px-5 py-2 font-medium text-right">Skip</th>
                    <th className="px-5 py-2 font-medium text-right">Errori</th>
                    <th className="px-5 py-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pearl-grey/60">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="px-5 py-2 capitalize">{l.sync_type}</td>
                      <td className="px-5 py-2 text-right text-green-700">{l.synced_count}</td>
                      <td className="px-5 py-2 text-right text-soft-grey">{l.skipped_count}</td>
                      <td className="px-5 py-2 text-right">
                        {l.errors?.length > 0 ? (
                          <span className="text-red-600">{l.errors.length}</span>
                        ) : (
                          <span className="text-soft-grey">0</span>
                        )}
                      </td>
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
        <p><strong>Setup:</strong></p>
        <ol className="list-decimal list-inside space-y-0.5 ml-2">
          <li>Registra app su developers.etsy.com</li>
          <li>Aggiungi env vars: ETSY_API_KEY, ETSY_SHARED_SECRET, ETSY_SHOP_ID</li>
          <li>Clicca "Connetti Etsy" sopra per autorizzare</li>
          <li>Sincronizza prodotti, ordini e inventario</li>
        </ol>
      </div>
    </div>
  );
}

function SyncCard({ icon: Icon, title, desc, syncing, disabled, onSync }: {
  icon: any; title: string; desc: string; syncing: boolean; disabled: boolean; onSync: () => void;
}) {
  return (
    <div className="border border-pearl-grey bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gold-primary" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-soft-grey">{desc}</p>
      <button
        onClick={onSync}
        disabled={disabled}
        className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40"
      >
        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Sincronizzazione...' : 'Sincronizza'}
      </button>
    </div>
  );
}
