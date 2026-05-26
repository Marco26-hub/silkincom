'use client';

/**
 * Admin /fatture — premium ledger view aggregating every transaction from
 * Stripe (website) and Etsy (marketplace) for the commercialista.
 *
 * What lives here:
 *   - Month picker + channel filter
 *   - Aggregate KPIs (gross, net, fees, taxes, shipping)
 *   - Per-channel breakdown
 *   - Detailed transaction table with direct PDF / receipt links
 *   - "Sync ora" button (admin can force a pull off-cron)
 *   - "Esporta CSV" button (downloads a commercialista-friendly file)
 *
 * The page reads `/api/admin/financial/records?month=...` so all aggregation
 * happens server-side. The cron job at /api/cron/sync-financial fills the
 * underlying table automatically every night.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Receipt,
  RefreshCw,
  Download,
  ExternalLink,
  TrendingUp,
  PiggyBank,
  Receipt as ReceiptIcon,
  Wallet,
  AlertTriangle,
} from 'lucide-react';

type Row = {
  id: string;
  source: 'stripe' | 'etsy' | 'google_ads';
  type: string;
  external_id: string;
  invoice_number: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_country: string | null;
  buyer_vat_number: string | null;
  gross_amount: string;
  fee_amount: string;
  tax_amount: string;
  shipping_amount: string;
  net_amount: string;
  currency: string;
  invoice_url: string | null;
  receipt_url: string | null;
  transaction_date: string;
};

type Totals = {
  gross: number;
  fees: number;
  tax: number;
  shipping: number;
  net: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
};

type SyncState = {
  source: string;
  last_synced_at: string | null;
  last_status: string | null;
  last_error: string | null;
};

type RecordsResponse = {
  month: string;
  source: string;
  type: string;
  rows: Row[];
  total: number;
  page: number;
  perPage: number;
  totals: Totals;
  syncStates: SyncState[];
};

const fmt = (v: number, cur = 'EUR') =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(v);

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

export default function AdminFattureePage() {
  const [month, setMonth] = useState<string>(currentMonth());
  const [source, setSource] = useState<'all' | 'stripe' | 'etsy' | 'google_ads'>('all');
  const [type, setType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<Array<{ source: string; errors: string[] }>>([]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ month, source, type, page: String(page), perPage: '50' });
      const res = await fetch(`/api/admin/financial/records?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as RecordsResponse;
      setData(json);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [month, source, type, page]);

  async function runSync() {
    setSyncing(true);
    setSyncMsg(null);
    setSyncErrors([]);
    try {
      const res = await fetch('/api/admin/financial/sync?source=all', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        const ok = (json.results as Array<{ source: string; synced: number; errors: string[] }>) ?? [];
        setSyncMsg(
          ok
            .map((r) => `${r.source}: ${r.synced} record${r.errors.length ? ` (${r.errors.length} errori)` : ''}`)
            .join(' · '),
        );
        // Surface the actual error strings — the previous version only
        // counted them, leaving admins to dig through network logs.
        setSyncErrors(ok.filter((r) => r.errors.length > 0).map((r) => ({ source: r.source, errors: r.errors })));
      } else {
        setSyncMsg(json.error || 'Errore sync');
      }
    } catch (e) {
      setSyncMsg((e as Error).message);
    } finally {
      setSyncing(false);
      load();
    }
  }

  function exportCsv() {
    const params = new URLSearchParams({ month, source });
    window.open(`/api/admin/financial/export?${params.toString()}`, '_blank');
  }

  const totals = data?.totals;
  const monthOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  }, []);

  return (
    <div className="space-y-6 max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">Fatture &amp; Pagamenti</h1>
            <p className="text-soft-grey text-sm">Stripe (sito) + Etsy — vista unica per il commercialista</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!data || data.rows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-pearl-grey hover:border-soft-black text-[11px] uppercase tracking-[0.2em] transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Esporta CSV
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizzo…' : 'Sincronizza ora'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="border border-pearl-grey bg-ivory px-4 py-2 text-xs text-soft-black">{syncMsg}</div>
      )}

      {syncErrors.length > 0 && (
        <details className="border border-red-200 bg-red-50/50 px-4 py-2 text-xs text-red-800">
          <summary className="cursor-pointer font-medium">
            Dettagli errori sync ({syncErrors.reduce((n, r) => n + r.errors.length, 0)})
          </summary>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {syncErrors.flatMap((r) =>
              r.errors.map((e, i) => (
                <li key={`${r.source}-${i}`}>
                  <span className="uppercase tracking-[0.15em] text-[10px]">{r.source}</span> · {e}
                </li>
              )),
            )}
          </ul>
        </details>
      )}

      {loadError && (
        <div className="border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          Errore caricamento dati: {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="border border-pearl-grey bg-white p-4 flex gap-3 flex-wrap items-end">
        <Field label="Mese">
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            className="border border-pearl-grey bg-white px-3 py-2 text-sm capitalize"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Canale">
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as 'all' | 'stripe' | 'etsy' | 'google_ads');
              setPage(1);
            }}
            className="border border-pearl-grey bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tutti</option>
            <option value="stripe">Stripe (sito)</option>
            <option value="etsy">Etsy</option>
            <option value="google_ads">Google Ads (spese)</option>
          </select>
        </Field>
        <Field label="Tipo">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="border border-pearl-grey bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tutti</option>
            <option value="charge">Vendite</option>
            <option value="invoice">Fatture</option>
            <option value="refund">Rimborsi</option>
            <option value="fee">Commissioni</option>
            <option value="tax">Tasse</option>
            <option value="payout">Bonifici</option>
          </select>
        </Field>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Incassato lordo" value={fmt(totals?.gross ?? 0)} icon={TrendingUp} accent />
        <Kpi label="Commissioni" value={fmt(totals?.fees ?? 0)} icon={ReceiptIcon} muted />
        <Kpi label="IVA / Tasse" value={fmt(totals?.tax ?? 0)} icon={AlertTriangle} muted />
        <Kpi label="Spedizione" value={fmt(totals?.shipping ?? 0)} icon={Wallet} muted />
        <Kpi label="Netto" value={fmt(totals?.net ?? 0)} icon={PiggyBank} accent />
      </div>

      {/* Channel breakdown */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['stripe', 'etsy', 'google_ads'] as const).map((s) => {
            const label =
              s === 'stripe' ? 'Sito (Stripe)' : s === 'etsy' ? 'Etsy' : 'Google Ads (spesa)';
            const isCost = s === 'google_ads';
            const state = data?.syncStates?.find((st) => st.source === s);
            const lastSyncedAt = state?.last_synced_at
              ? new Date(state.last_synced_at).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'mai';
            const isStale =
              state?.last_synced_at &&
              Date.now() - new Date(state.last_synced_at).getTime() > 36 * 60 * 60 * 1000;
            return (
              <div
                key={s}
                className={`border p-5 ${
                  isCost ? 'border-red-200 bg-red-50/30' : 'border-pearl-grey bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] uppercase tracking-[0.3em] ${
                      isCost ? 'text-red-600' : 'text-soft-grey'
                    }`}
                  >
                    {label}
                  </span>
                  {state?.last_status === 'partial' && (
                    <span className="text-[9px] uppercase tracking-[0.2em] text-amber-600">parziale</span>
                  )}
                </div>
                <p className={`font-display text-3xl ${isCost ? 'text-red-700' : ''}`}>
                  {isCost ? '−' : ''}
                  {fmt(Math.abs(totals.bySource[s] ?? 0))}
                </p>
                <p className="text-xs text-soft-grey mt-1">
                  {isCost ? 'spesa pubblicità del mese' : 'netto del mese'}
                </p>
                <p className={`text-[10px] mt-2 ${isStale ? 'text-amber-600' : 'text-soft-grey/70'}`}>
                  Ultimo sync: {lastSyncedAt}
                  {isStale && ' · obsoleto'}
                </p>
                {state?.last_error && (
                  <p className="text-[10px] text-red-600 mt-1 truncate" title={state.last_error}>
                    ⚠ {state.last_error.slice(0, 80)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">Movimenti</h3>
          {loading && <span className="text-xs text-soft-grey">Caricamento…</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-pearl-grey bg-warm-white/60">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-5 py-2 font-medium">Canale</th>
              <th className="px-5 py-2 font-medium">Tipo</th>
              <th className="px-5 py-2 font-medium">Cliente</th>
              <th className="px-5 py-2 font-medium">Paese</th>
              <th className="px-5 py-2 font-medium text-right">Lordo</th>
              <th className="px-5 py-2 font-medium text-right">IVA</th>
              <th className="px-5 py-2 font-medium text-right">Fee</th>
              <th className="px-5 py-2 font-medium text-right">Netto</th>
              <th className="px-5 py-2 font-medium">Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(data?.rows ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-ivory/40">
                <td className="px-5 py-2 whitespace-nowrap">
                  {new Date(r.transaction_date).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                </td>
                <td className="px-5 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                      r.source === 'stripe'
                        ? 'bg-soft-black text-warm-white'
                        : r.source === 'etsy'
                        ? 'bg-[#F1641E]/15 text-[#F1641E]'
                        : 'bg-[#4285F4]/15 text-[#1a73e8]'
                    }`}
                  >
                    {r.source === 'google_ads' ? 'g.ads' : r.source}
                  </span>
                </td>
                <td className="px-5 py-2 capitalize text-soft-grey">{r.type}</td>
                <td className="px-5 py-2 max-w-[200px] truncate">
                  {r.buyer_name || <span className="text-soft-grey">—</span>}
                </td>
                <td className="px-5 py-2 text-soft-grey">{r.buyer_country || '—'}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmt(Number(r.gross_amount), r.currency)}</td>
                <td className="px-5 py-2 text-right tabular-nums text-soft-grey">
                  {Number(r.tax_amount) > 0 ? fmt(Number(r.tax_amount), r.currency) : '—'}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-soft-grey">
                  {Number(r.fee_amount) > 0 ? fmt(Number(r.fee_amount), r.currency) : '—'}
                </td>
                <td className="px-5 py-2 text-right tabular-nums font-medium">
                  {fmt(Number(r.net_amount), r.currency)}
                </td>
                <td className="px-5 py-2">
                  {r.invoice_url ? (
                    <a
                      href={r.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-soft-black hover:text-gold-primary"
                    >
                      PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : r.receipt_url ? (
                    <a
                      href={r.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-soft-grey hover:text-gold-primary"
                    >
                      Ricevuta <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-soft-grey">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && (data?.rows.length ?? 0) === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-10 text-center text-soft-grey text-sm">
                  Nessun movimento per {monthLabel(month)}. Clicca «Sincronizza ora» per prelevare i dati.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data && data.total > data.perPage && (
          <div className="border-t border-pearl-grey px-5 py-2 flex items-center justify-between text-xs text-soft-grey">
            <span>
              {data.rows.length} di {data.total} righe
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-pearl-grey disabled:opacity-40 hover:border-soft-black"
              >
                ← Indietro
              </button>
              <button
                disabled={page * data.perPage >= data.total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-pearl-grey disabled:opacity-40 hover:border-soft-black"
              >
                Avanti →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-ivory border border-pearl-grey/60 p-4 text-xs text-soft-grey space-y-1">
        <p>
          <strong>Sync automatico:</strong> ogni notte alle 03:00 Europe/Rome (cron Vercel). Stripe è
          attivo subito; Etsy si attiva quando approva l'app developer.
        </p>
        <p>
          <strong>Per il commercialista:</strong> seleziona il mese e clicca «Esporta CSV» — apre un file
          Excel-compatibile con tutte le righe (lordo, IVA, fee, netto, link PDF). Le fatture Stripe
          ufficiali sono linkate nella colonna «Documento».
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent = false,
  muted = false,
}: {
  label: string;
  value: string;
  icon: typeof Receipt;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`border p-4 ${
        accent ? 'border-gold-primary/60 bg-ivory/40' : muted ? 'border-pearl-grey bg-warm-white/40' : 'border-pearl-grey bg-white'
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-soft-grey">
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-gold-primary' : 'text-soft-grey'}`} />
        {label}
      </div>
      <p className={`font-display text-2xl mt-2 ${accent ? 'text-soft-black' : 'text-soft-black/80'}`}>{value}</p>
    </div>
  );
}
