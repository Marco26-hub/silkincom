'use client';

/**
 * Admin /analytics — first-party traffic + conversion dashboard.
 *
 * Reads /api/admin/analytics/overview (aggregated server-side from
 * analytics_events). No Google dependency, no cookie-consent gate — the data
 * is first-party and non-identifying. Layout follows the SILKinCOM editorial
 * palette to match the rest of /admin.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Users, Eye, Eye as EyeIcon, ShoppingCart, CreditCard,
  TrendingUp, Globe, Smartphone, Monitor, Tablet, MousePointerClick,
} from 'lucide-react';

type Summary = {
  sessions: number; pageviews: number; product_views: number;
  add_to_cart: number; begin_checkout: number; purchases: number;
  revenue: number; devices: Record<string, number>; countries: Record<string, number>;
};
type Daily = { day: string; pageviews: number; sessions: number };
type Overview = {
  range: { days: number };
  summary: Summary;
  daily: Daily[];
  topPaths: { path: string; views: number }[];
  topProducts: { product_slug: string; views: number }[];
  referrers: { referrer_host: string; visits: number }[];
  sources: {
    utm_source: string; utm_medium: string; sessions: number;
    product_views: number; add_to_cart: number; purchases: number; revenue: number;
  }[];
  errors: string[];
};

const fmtInt = (v: number) => new Intl.NumberFormat('it-IT').format(Math.round(v || 0));
const fmtEUR = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—');

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/analytics/overview?range=${range}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [range]);

  const s = data?.summary;

  return (
    <div className="space-y-6 max-w-[1280px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">Analytics</h1>
            <p className="text-soft-grey text-sm">Traffico e conversioni — dati first-party, senza Google</p>
          </div>
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as const).map((rr) => (
            <button key={rr} onClick={() => setRange(rr)}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${
                range === rr ? 'bg-soft-black text-warm-white' : 'border border-pearl-grey hover:border-soft-black'
              }`}>
              {rr === '7d' ? '7 giorni' : rr === '30d' ? '30 giorni' : '90 giorni'}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">Errore: {err}</div>}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Visitatori" value={fmtInt(s?.sessions ?? 0)} icon={Users} accent />
        <Kpi label="Pagine viste" value={fmtInt(s?.pageviews ?? 0)} icon={Eye} />
        <Kpi label="Schede prodotto" value={fmtInt(s?.product_views ?? 0)} icon={EyeIcon} />
        <Kpi label="Aggiunte carrello" value={fmtInt(s?.add_to_cart ?? 0)} icon={ShoppingCart} />
        <Kpi label="Acquisti" value={fmtInt(s?.purchases ?? 0)} icon={CreditCard} accent />
        <Kpi label="Conversione" value={pct(s?.purchases ?? 0, s?.sessions ?? 0)} icon={TrendingUp} accent />
      </div>

      {/* Traffic trend */}
      {data && data.daily.length > 0 && <TrendChart daily={data.daily} />}

      {/* Funnel */}
      {s && (
        <div className="border border-pearl-grey bg-white p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-4">Funnel di conversione</h3>
          <div className="space-y-2">
            {[
              { label: 'Visite', n: s.sessions },
              { label: 'Schede prodotto', n: s.product_views },
              { label: 'Aggiunte al carrello', n: s.add_to_cart },
              { label: 'Checkout avviati', n: s.begin_checkout },
              { label: 'Acquisti', n: s.purchases },
            ].map((step, i, arr) => {
              const max = arr[0].n || 1;
              const w = Math.max(2, (step.n / max) * 100);
              return (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-soft-grey">{step.label}</span>
                  <div className="flex-1 bg-ivory h-7 relative">
                    <div className="h-7 bg-gold-primary/80" style={{ width: `${w}%` }} />
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-medium">
                      {fmtInt(step.n)}
                      {i > 0 && <span className="ml-2 text-soft-grey/70">{pct(step.n, arr[i - 1].n)}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-soft-grey">
            Fatturato tracciato nel periodo: <strong className="text-soft-black">{fmtEUR(Number(s.revenue))}</strong>
          </p>
        </div>
      )}

      {/* Two-column: top pages / top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard title="Pagine più viste" rows={(data?.topPaths ?? []).map((p) => ({ label: p.path, n: p.views }))} />
        <ListCard
          title="Prodotti più visti"
          rows={(data?.topProducts ?? []).map((p) => ({ label: p.product_slug, n: p.views, href: `/prodotto/${p.product_slug}` }))}
        />
      </div>

      {/* Referrers + devices + countries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ListCard title="Sorgenti" icon={Globe}
          rows={(data?.referrers ?? []).map((r) => ({ label: r.referrer_host, n: r.visits }))} />
        <div className="border border-pearl-grey bg-white p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-4">Dispositivi</h3>
          <div className="space-y-3">
            {Object.entries(s?.devices ?? {}).sort((a, b) => b[1] - a[1]).map(([d, n]) => {
              const Icon = d === 'mobile' ? Smartphone : d === 'tablet' ? Tablet : Monitor;
              const total = Object.values(s?.devices ?? {}).reduce((a, b) => a + b, 0) || 1;
              return (
                <div key={d} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-soft-grey" />
                  <span className="w-20 text-xs capitalize">{d}</span>
                  <div className="flex-1 bg-ivory h-4"><div className="h-4 bg-soft-black/70" style={{ width: `${(n / total) * 100}%` }} /></div>
                  <span className="text-xs tabular-nums w-14 text-right">{fmtInt(n)}</span>
                </div>
              );
            })}
            {!s || Object.keys(s.devices ?? {}).length === 0 ? <p className="text-xs text-soft-grey">Nessun dato.</p> : null}
          </div>
        </div>
        <div className="border border-pearl-grey bg-white p-5">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-4">Paesi</h3>
          <div className="space-y-2">
            {Object.entries(s?.countries ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => (
              <div key={c} className="flex justify-between text-sm">
                <span>{c === '??' ? 'Sconosciuto' : c}</span>
                <span className="tabular-nums text-soft-grey">{fmtInt(n)}</span>
              </div>
            ))}
            {!s || Object.keys(s.countries ?? {}).length === 0 ? <p className="text-xs text-soft-grey">Nessun dato.</p> : null}
          </div>
        </div>
      </div>

      {/* Attribuzione campagne (UTM) → vendite */}
      {data && (data.sources?.length ?? 0) > 0 && (
        <div className="border border-pearl-grey bg-white p-5 overflow-x-auto">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-4 flex items-center gap-2">
            <MousePointerClick className="w-3.5 h-3.5" />Fonti campagna (UTM) → vendite
          </h3>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-soft-grey text-left border-b border-pearl-grey">
                <th className="py-2">Fonte</th><th>Mezzo</th>
                <th className="text-right">Visite</th><th className="text-right">Prodotto</th>
                <th className="text-right">Carrello</th><th className="text-right">Acquisti</th>
                <th className="text-right">Fatturato</th><th className="text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((r, i) => (
                <tr key={i} className="border-b border-pearl-grey/40">
                  <td className="py-1.5 font-medium">{r.utm_source}</td>
                  <td className="text-soft-grey">{r.utm_medium || '—'}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.sessions)}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.product_views)}</td>
                  <td className="text-right tabular-nums">{fmtInt(r.add_to_cart)}</td>
                  <td className="text-right tabular-nums font-medium">{fmtInt(r.purchases)}</td>
                  <td className="text-right tabular-nums">{fmtEUR(Number(r.revenue))}</td>
                  <td className="text-right tabular-nums text-soft-grey">{pct(r.purchases, r.sessions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-soft-grey">
            Attribuzione da <code>utm_source</code> nei bio-link (sticky per sessione → anche l'acquisto eredita la fonte). «(nessuna)» = traffico senza tag campagna.
          </p>
        </div>
      )}

      {!loading && (s?.pageviews ?? 0) === 0 && (
        <div className="bg-ivory border border-pearl-grey/60 p-4 text-xs text-soft-grey">
          Nessun dato ancora. Il tracciamento parte appena i visitatori navigano il sito dopo il deploy.
          I dati sono raccolti in prima persona (tabella <code>analytics_events</code>), senza Google e senza cookie persistenti.
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: typeof Users; accent?: boolean }) {
  return (
    <div className={`border p-4 ${accent ? 'border-gold-primary/60 bg-ivory/40' : 'border-pearl-grey bg-white'}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-soft-grey">
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-gold-primary' : 'text-soft-grey'}`} />{label}
      </div>
      <p className="font-display text-2xl mt-2">{value}</p>
    </div>
  );
}

function ListCard({ title, rows, icon: Icon }: {
  title: string; icon?: typeof Globe;
  rows: { label: string; n: number; href?: string }[];
}) {
  const max = rows[0]?.n || 1;
  return (
    <div className="border border-pearl-grey bg-white p-5">
      <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}{title}
      </h3>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="relative flex items-center justify-between px-2 py-1.5 text-sm">
            <div className="absolute inset-y-0 left-0 bg-gold-primary/10" style={{ width: `${(r.n / max) * 100}%` }} />
            <span className="relative truncate max-w-[75%]">{r.label}</span>
            <span className="relative tabular-nums text-soft-grey">{fmtInt(r.n)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-soft-grey">Nessun dato.</p>}
      </div>
    </div>
  );
}

function TrendChart({ daily }: { daily: Daily[] }) {
  const { pvPath, sePath, max } = useMemo(() => {
    const max = Math.max(1, ...daily.map((d) => d.pageviews));
    const step = daily.length > 1 ? 100 / (daily.length - 1) : 0;
    const line = (key: 'pageviews' | 'sessions') =>
      daily.map((d, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(30 - (d[key] / max) * 30).toFixed(2)}`).join(' ');
    return { pvPath: line('pageviews'), sePath: line('sessions'), max };
  }, [daily]);

  return (
    <div className="border border-pearl-grey bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey">Andamento traffico</h3>
        <div className="flex gap-4 text-[10px] uppercase tracking-[0.2em] text-soft-grey">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-px bg-soft-black" />Pagine</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-px bg-gold-primary" />Visite</span>
        </div>
      </div>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-24">
        <path d={`${pvPath} L100,30 L0,30 Z`} fill="#17171710" />
        <path d={pvPath} fill="none" stroke="#171717" strokeWidth="0.4" strokeLinejoin="round" />
        <path d={sePath} fill="none" stroke="#C9A961" strokeWidth="0.4" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-soft-grey/70">
        <span>{daily[0]?.day}</span><span>picco {max} viste/g</span><span>{daily[daily.length - 1]?.day}</span>
      </div>
    </div>
  );
}
