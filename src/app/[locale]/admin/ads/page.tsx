'use client';

/**
 * Admin /ads — Google Ads command center.
 *
 * What's here today (Phase 1):
 *   - Connection state + "Connetti Google Ads" CTA when not authorized.
 *   - 7d / 30d / 90d range picker.
 *   - KPI strip: Spesa, Impression, Clic, Conversioni, ROAS, CTR, CPA.
 *   - Spend / conversions trend (lightweight inline SVG, no chart lib).
 *   - Per-campaign table sortable by spend, with link to the detail page.
 *   - "Sincronizza ora" button to force a pull.
 *
 * Layout follows the SILKinCOM editorial palette to stay consistent with the
 * rest of /admin (Cormorant display, gold accents, ivory + pearl-grey
 * surfaces).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import {
  Megaphone,
  RefreshCw,
  Link2,
  TrendingUp,
  MousePointerClick,
  Eye,
  Target,
  PercentDiamond,
  Receipt as ReceiptIcon,
  PiggyBank,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

type Campaign = {
  id: string;
  external_id: string;
  name: string;
  status: string;
  channel_type: string | null;
  daily_budget: number | null;
  target_roas: number | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
};

type Overview = {
  connected: boolean;
  range: { days: number; since: string };
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  series: Array<{
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversion_value: number;
  }>;
  campaigns: Campaign[];
};

const fmtEUR = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
const fmtInt = (v: number) => new Intl.NumberFormat('it-IT').format(Math.round(v));
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;

function statusPill(s: string) {
  const t = (s || '').toLowerCase();
  const map: Record<string, string> = {
    enabled: 'bg-green-100 text-green-700',
    paused: 'bg-amber-100 text-amber-700',
    removed: 'bg-soft-grey/15 text-soft-grey',
    unknown: 'bg-pearl-grey/40 text-soft-grey',
  };
  return map[t] ?? map.unknown;
}

export default function AdminAdsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/ads/overview?range=${range}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as Overview;
      setData(json);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [range]);

  async function runSync() {
    setSyncing(true);
    setSyncMsg(null);
    setSyncErrors([]);
    try {
      const res = await fetch('/api/admin/ads/sync', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        setSyncMsg(
          `Aggiornato — ${json.synced} righe sincronizzate${json.errors?.length ? ` (${json.errors.length} avvisi)` : ''}`,
        );
        if (Array.isArray(json.errors)) setSyncErrors(json.errors);
        await load();
      } else {
        setSyncMsg(json.error || 'Errore di sincronizzazione');
      }
    } catch (e) {
      setSyncMsg((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">Pubblicità</h1>
            <p className="text-soft-grey text-sm">
              Google Ads — performance, copy AI, gestione campagne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ads/drafts"
            className="inline-flex items-center gap-2 px-4 py-2 border border-pearl-grey hover:border-soft-black text-[11px] uppercase tracking-[0.2em] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold-primary" /> Bozze AI
          </Link>
          <button
            onClick={runSync}
            disabled={syncing || !data?.connected}
            className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizzo…' : 'Sincronizza'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="border border-pearl-grey bg-ivory px-4 py-2 text-xs text-soft-black">{syncMsg}</div>
      )}

      {syncErrors.length > 0 && (
        <details className="border border-red-200 bg-red-50/50 px-4 py-2 text-xs text-red-800">
          <summary className="cursor-pointer font-medium">Dettagli avvisi sync ({syncErrors.length})</summary>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {syncErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      {loadError && (
        <div className="border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          Errore caricamento dati: {loadError}
        </div>
      )}

      {/* Connection state */}
      {!loading && data && !data.connected && (
        <div className="border border-amber-200 bg-amber-50 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-medium text-amber-900">Google Ads non collegato</p>
            <p className="text-sm text-amber-800 mt-1">
              Connetti l'account per importare campagne, metriche, e attivare il generatore di copy AI.
            </p>
          </div>
          <a
            href="/api/google-ads/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4285F4] text-white text-[11px] uppercase tracking-[0.2em] hover:bg-[#1a73e8] transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" /> Connetti Google Ads
          </a>
        </div>
      )}

      {/* Range picker */}
      <div className="border border-pearl-grey bg-white p-4 flex items-center gap-4 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.3em] text-soft-grey">Periodo</span>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${
                range === r
                  ? 'bg-soft-black text-warm-white'
                  : 'border border-pearl-grey hover:border-soft-black'
              }`}
            >
              {r === '7d' ? '7 giorni' : r === '30d' ? '30 giorni' : '90 giorni'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Kpi label="Spesa" value={fmtEUR(data?.totals.cost ?? 0)} icon={ReceiptIcon} accent />
        <Kpi label="ROAS" value={`${(data?.totals.roas ?? 0).toFixed(2)}×`} icon={PiggyBank} accent />
        <Kpi label="Conversioni" value={fmtInt(data?.totals.conversions ?? 0)} icon={Target} />
        <Kpi label="Valore conv." value={fmtEUR(data?.totals.conversion_value ?? 0)} icon={TrendingUp} />
        <Kpi label="Clic" value={fmtInt(data?.totals.clicks ?? 0)} icon={MousePointerClick} />
        <Kpi label="Impression" value={fmtInt(data?.totals.impressions ?? 0)} icon={Eye} />
        <Kpi label="CTR" value={fmtPct(data?.totals.ctr ?? 0)} icon={PercentDiamond} />
      </div>

      {/* Trend chart (lightweight inline SVG) */}
      {data && data.series.length > 0 && <TrendChart series={data.series} />}

      {/* Campaigns table */}
      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">
            Campagne ({data?.campaigns.length ?? 0})
          </h3>
          {loading && <span className="text-xs text-soft-grey">Caricamento…</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-pearl-grey bg-warm-white/60">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-2 font-medium">Nome</th>
              <th className="px-5 py-2 font-medium">Stato</th>
              <th className="px-5 py-2 font-medium">Tipo</th>
              <th className="px-5 py-2 font-medium text-right">Budget/g</th>
              <th className="px-5 py-2 font-medium text-right">Spesa</th>
              <th className="px-5 py-2 font-medium text-right">Clic</th>
              <th className="px-5 py-2 font-medium text-right">CTR</th>
              <th className="px-5 py-2 font-medium text-right">Conv.</th>
              <th className="px-5 py-2 font-medium text-right">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {(data?.campaigns ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-ivory/40">
                <td className="px-5 py-2 font-medium">{c.name}</td>
                <td className="px-5 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${statusPill(c.status)}`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-2 text-soft-grey">{c.channel_type ?? '—'}</td>
                <td className="px-5 py-2 text-right tabular-nums text-soft-grey">
                  {c.daily_budget ? fmtEUR(Number(c.daily_budget)) : '—'}
                </td>
                <td className="px-5 py-2 text-right tabular-nums font-medium">{fmtEUR(c.cost)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtInt(c.clicks)}</td>
                <td className="px-5 py-2 text-right tabular-nums text-soft-grey">{fmtPct(c.ctr)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtInt(c.conversions)}</td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {c.roas > 0 ? `${c.roas.toFixed(2)}×` : '—'}
                </td>
              </tr>
            ))}
            {!loading && (data?.campaigns.length ?? 0) === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-soft-grey text-sm">
                  Nessuna campagna sincronizzata.{' '}
                  {data?.connected
                    ? 'Clicca «Sincronizza» per importare da Google Ads.'
                    : 'Connetti Google Ads per iniziare.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-ivory border border-pearl-grey/60 p-4 text-xs text-soft-grey space-y-1">
        <p>
          <strong>Sync automatico:</strong> ogni notte alle 03:30 Europe/Rome.
        </p>
        <p>
          <strong>Bozze AI:</strong> «Bozze AI» genera headline, descrizioni e keyword da uno o più
          prodotti del catalogo, pronti da pubblicare come Responsive Search Ad.
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: typeof Megaphone;
  accent?: boolean;
}) {
  return (
    <div
      className={`border p-4 ${
        accent ? 'border-gold-primary/60 bg-ivory/40' : 'border-pearl-grey bg-white'
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-soft-grey">
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-gold-primary' : 'text-soft-grey'}`} />
        {label}
      </div>
      <p className="font-display text-2xl mt-2">{value}</p>
    </div>
  );
}

function TrendChart({ series }: { series: Overview['series'] }) {
  const { points, conversionPoints, max } = useMemo(() => {
    const max = Math.max(1, ...series.map((s) => s.cost));
    const w = 100;
    const h = 30;
    const step = series.length > 1 ? w / (series.length - 1) : 0;
    const pts = series.map((s, i) => ({
      x: i * step,
      y: h - (s.cost / max) * h,
      cost: s.cost,
      conv: s.conversions,
      conv_value: s.conversion_value,
      date: s.date,
    }));
    const convMax = Math.max(1, ...series.map((s) => s.conversion_value));
    const convPts = series.map((s, i) => ({ x: i * step, y: h - (s.conversion_value / convMax) * h }));
    return { points: pts, conversionPoints: convPts, max };
  }, [series]);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const convPath = conversionPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${path} L100,30 L0,30 Z`;

  return (
    <div className="border border-pearl-grey bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey">Andamento spesa / valore conversione</h3>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-soft-grey">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-soft-black" /> Spesa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-gold-primary" /> Conv. valore
          </span>
        </div>
      </div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-24">
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#171717" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#171717" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#costGrad)" />
        <path d={path} fill="none" stroke="#171717" strokeWidth="0.4" strokeLinejoin="round" />
        <path d={convPath} fill="none" stroke="#C9A961" strokeWidth="0.4" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-soft-grey/70">
        <span>{series[0]?.date}</span>
        <span>picco €{max.toFixed(0)}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
