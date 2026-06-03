'use client';

/**
 * Google Merchant admin — read-only approval mirror + gated push, same shape as
 * the Etsy / TikTok admins. "Sincronizza" pulls product approval status from
 * Merchant Center; "Pubblica" pushes the published catalogue via the Content
 * API (gated behind an inline confirm). Connection is verified live on mount.
 */
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ShoppingCart, RefreshCw, Loader2, UploadCloud, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

type Product = {
  rest_id: string;
  offer_id: string | null;
  content_language: string | null;
  title: string | null;
  destination_status: string | null;
  issues: unknown[] | null;
  availability: string | null;
  price: number | null;
  currency: string | null;
};

type Status = { connected: boolean; accountName: string | null; websiteUrl: string | null; connectionError: string | null };

export function MerchantAdmin({
  configured, merchantId, counts, lastSync, products,
}: {
  configured: boolean;
  merchantId: string | null;
  counts: { total: number; approved: number; pending: number; disapproved: number };
  lastSync: string | null;
  products: Product[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [confirmPush, setConfirmPush] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!configured) return;
    fetch('/api/google-merchant/status')
      .then((r) => r.json())
      .then((j) => setStatus(j))
      .catch(() => {});
  }, [configured]);

  async function pull() {
    setSyncing(true); setMsg(null);
    try {
      const res = await fetch('/api/google-merchant/pull', { method: 'POST' });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg(`Sincronizzato: ${j.count} prodotti dal Merchant Center.`);
      router.refresh();
    } catch (e) { setMsg((e as Error).message); } finally { setSyncing(false); }
  }

  async function push() {
    setPushing(true); setMsg(null); setConfirmPush(false);
    try {
      const res = await fetch('/api/google-merchant/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg(`Pubblicati ${j.pushed}/${j.total} item${j.failed ? ` · ${j.failed} errori (${j.errors?.[0]?.message ?? ''})` : ''}. Clicca «Sincronizza» per leggere lo stato approvazione.`);
    } catch (e) { setMsg((e as Error).message); } finally { setPushing(false); }
  }

  const eur = (v: number | null, c: string | null) =>
    v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: c || 'EUR' }).format(v);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">Google Merchant</h1>
            <p className="text-soft-grey text-sm">Stato approvazione prodotti (sola lettura) + pubblicazione catalogo via Content API</p>
          </div>
        </div>
        {configured && (
          <div className="flex items-center gap-2">
            <button onClick={pull} disabled={syncing || pushing} className="inline-flex items-center gap-2 px-5 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizzo…' : 'Sincronizza'}
            </button>
            <button onClick={() => setConfirmPush(true)} disabled={pushing || syncing} className="inline-flex items-center gap-2 px-5 py-2 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.2em] hover:bg-soft-black hover:text-warm-white transition-colors disabled:opacity-40">
              {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />} {pushing ? 'Pubblico…' : 'Pubblica catalogo'}
            </button>
          </div>
        )}
      </div>

      {msg && <div className="border border-pearl-grey bg-ivory px-4 py-2 text-xs text-soft-black">{msg}</div>}

      {confirmPush && (
        <div className="border border-amber-300 bg-amber-50 p-5 space-y-3">
          <p className="text-sm text-amber-900">Pubblicare il catalogo pubblicato su Google Merchant Center (IT + EN)? Sovrascrive gli item esistenti con gli stessi SKU. Azione verso l'esterno.</p>
          <div className="flex gap-2">
            <button onClick={push} className="px-5 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">Conferma pubblicazione</button>
            <button onClick={() => setConfirmPush(false)} className="px-5 py-2 border border-pearl-grey text-soft-grey text-[11px] uppercase tracking-[0.2em] hover:bg-warm-white transition-colors">Annulla</button>
          </div>
        </div>
      )}

      {!configured ? (
        <div className="border border-amber-200 bg-amber-50/50 p-6">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber-600" /><h2 className="text-sm font-medium text-amber-900">Non configurato</h2></div>
          <p className="text-sm text-amber-800">Imposta su Vercel <code className="bg-amber-100 px-1.5 py-0.5 text-xs">GOOGLE_MERCHANT_SA_KEY</code> (JSON Service Account, raw o base64) e <code className="bg-amber-100 px-1.5 py-0.5 text-xs">GOOGLE_MERCHANT_ID</code>, poi redeploy. Aggiungi l'email del Service Account come utente nel Merchant Center.</p>
        </div>
      ) : (
        <>
          <div className={`border p-5 flex items-center gap-3 ${status?.connected ? 'border-pearl-grey bg-white' : 'border-amber-200 bg-amber-50/50'}`}>
            {status == null ? <Clock className="w-5 h-5 text-soft-grey" /> : status.connected ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            <div className="text-sm">
              {status == null ? <span className="text-soft-grey">Verifico connessione…</span> : status.connected ? (
                <>
                  <span className="font-medium">Collegato</span>
                  {status.accountName && <span className="text-soft-grey"> · {status.accountName}</span>}
                  {merchantId && <span className="text-soft-grey"> · ID {merchantId}</span>}
                </>
              ) : (
                <span className="text-amber-800">Configurato ma non raggiungibile: {status.connectionError || 'verifica SA / Merchant ID / accesso utente'}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Totale mirror" value={counts.total} />
            <Kpi label="Approvati" value={counts.approved} tone="emerald" />
            <Kpi label="In attesa" value={counts.pending} tone="amber" />
            <Kpi label="Rifiutati" value={counts.disapproved} tone="red" />
          </div>

          <div className="border border-pearl-grey bg-white overflow-x-auto">
            <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white flex items-center justify-between">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">Prodotti ({counts.total})</h3>
              {lastSync && <span className="text-[10px] text-soft-grey">ultima sync {new Date(lastSync).toLocaleString('it-IT')}</span>}
            </div>
            {products.length === 0 ? (
              <p className="px-5 py-10 text-center text-soft-grey text-sm">Nessun dato. Pubblica il catalogo, poi clicca «Sincronizza» per leggere lo stato.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-pearl-grey bg-warm-white"><tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                  <th className="px-5 py-2 font-medium">Prodotto</th><th className="px-5 py-2 font-medium">Lingua</th><th className="px-5 py-2 font-medium">Stato</th><th className="px-5 py-2 font-medium">Problemi</th><th className="px-5 py-2 font-medium text-right">Prezzo</th>
                </tr></thead>
                <tbody className="divide-y divide-pearl-grey/60">
                  {products.map((p) => {
                    const issueCount = Array.isArray(p.issues) ? p.issues.length : 0;
                    return (
                      <tr key={p.rest_id} className="hover:bg-ivory/40">
                        <td className="px-5 py-2">{p.title ?? p.offer_id ?? p.rest_id}</td>
                        <td className="px-5 py-2 text-soft-grey uppercase text-xs">{p.content_language ?? '—'}</td>
                        <td className="px-5 py-2"><StatusBadge status={p.destination_status} /></td>
                        <td className="px-5 py-2 text-soft-grey">{issueCount > 0 ? `${issueCount}` : '—'}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{eur(p.price, p.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'red' }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-soft-black';
  return (
    <div className="border border-pearl-grey bg-white px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">{label}</div>
      <div className={`text-2xl font-display ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Approvato</span>;
  if (s === 'disapproved') return <span className="inline-flex items-center gap-1 text-red-700 text-xs"><XCircle className="w-3.5 h-3.5" /> Rifiutato</span>;
  return <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><Clock className="w-3.5 h-3.5" /> {status || 'In attesa'}</span>;
}
