'use client';

import { useEffect, useState } from 'react';
import {
  Share2, CalendarClock, CheckCircle2, AlertTriangle, ExternalLink,
  Loader2, RefreshCw,
} from 'lucide-react';

type Platform =
  | 'twitter' | 'instagram' | 'linkedin' | 'facebook' | 'tiktok'
  | 'pinterest' | 'threads' | 'bluesky' | 'youtube';

type PostState =
  | { type: 'scheduled' }
  | { type: 'published'; postUrl?: string }
  | { type: 'failed'; errorMessage?: string };

type Post = {
  id: string;
  platform: Platform;
  text: string;
  mediaUrls: string[];
  postTime: string;
  state: PostState;
};

type Account = {
  id: string;
  platform: Platform;
  fullname?: string;
  username?: string;
};

type Funnel = { visits: number; productViews: number; addToCart: number; purchases: number; revenue: number };

type Data = {
  configured: boolean;
  error?: string;
  accounts?: Account[];
  counts?: {
    scheduled: number;
    published: number;
    failed: number;
    byPlatform: Record<string, { scheduled: number; published: number; failed: number }>;
  };
  scheduled?: Post[];
  published?: Post[];
  failed?: Post[];
  siteSocial?: { days: number; byPlatform: Record<string, Funnel>; totals: Funnel };
};

const PLATFORM_LABEL: Record<Platform, string> = {
  twitter: 'X / Twitter', instagram: 'Instagram', linkedin: 'LinkedIn',
  facebook: 'Facebook', tiktok: 'TikTok', pinterest: 'Pinterest',
  threads: 'Threads', bluesky: 'Bluesky', youtube: 'YouTube',
};

const PLATFORM_DOT: Record<Platform, string> = {
  twitter: 'bg-sky-500', instagram: 'bg-pink-500', linkedin: 'bg-blue-700',
  facebook: 'bg-blue-600', tiktok: 'bg-soft-black', pinterest: 'bg-red-600',
  threads: 'bg-soft-black', bluesky: 'bg-sky-400', youtube: 'bg-red-500',
};

function PlatformBadge({ p }: { p: Platform }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ${PLATFORM_DOT[p] ?? 'bg-soft-grey'}`} />
      {PLATFORM_LABEL[p] ?? p}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function PostRow({ post }: { post: Post }) {
  const url = post.state.type === 'published' ? post.state.postUrl : undefined;
  const err = post.state.type === 'failed' ? post.state.errorMessage : undefined;
  return (
    <tr className="hover:bg-ivory/40 align-top">
      <td className="px-4 py-2.5 whitespace-nowrap"><PlatformBadge p={post.platform} /></td>
      <td className="px-4 py-2.5 text-xs text-soft-grey whitespace-nowrap">{fmtDate(post.postTime)}</td>
      <td className="px-4 py-2.5">
        <p className="text-sm line-clamp-2 max-w-[520px]">{post.text || '—'}</p>
        {err && <p className="text-[11px] text-red-600 mt-1">⚠ {err}</p>}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-soft-grey hover:text-gold-primary">
            Apri <ExternalLink className="w-3 h-3" />
          </a>
        ) : '—'}
      </td>
    </tr>
  );
}

export default function AdminSocialPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/social');
      setData(await res.json());
    } catch {
      setData({ configured: true, error: 'Errore di rete' });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Share2 className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">Social</h1>
            <p className="text-soft-grey text-sm">Analytics social (traffico e vendite per piattaforma) + pubblicazione via Blotato</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 border border-pearl-grey text-[10px] uppercase tracking-[0.2em] text-soft-grey hover:border-soft-black hover:text-soft-black transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-soft-grey py-16">
          <Loader2 className="w-4 h-4 animate-spin" /> Carico…
        </div>
      )}

      {/* Integrated social analytics — site performance per platform (always shown) */}
      {!loading && data?.siteSocial && <SiteSocialSection s={data.siteSocial} />}

      {/* Not configured */}
      {!loading && data && !data.configured && (
        <div className="border border-amber-200 bg-amber-50/50 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-medium text-amber-900">Blotato non configurato</h2>
          </div>
          <p className="text-sm text-amber-800 max-w-[640px]">
            Imposta la variabile <code className="bg-amber-100 px-1.5 py-0.5 text-xs">BLOTATO_API_KEY</code> su
            Vercel (la trovi su <a href="https://my.blotato.com" target="_blank" rel="noopener noreferrer" className="underline">my.blotato.com</a> →
            Settings → API), poi redeploy. Questa pagina mostrerà account collegati, post programmati e pubblicati.
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && data?.configured && data.error && (
        <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          Errore Blotato: {data.error}
        </div>
      )}

      {/* Data */}
      {!loading && data?.configured && !data.error && data.counts && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-pearl-grey bg-white p-5">
              <div className="flex items-center gap-2 text-soft-grey"><CalendarClock className="w-4 h-4" /><span className="text-sm">Programmati</span></div>
              <p className="font-display text-3xl mt-2">{data.counts.scheduled}</p>
            </div>
            <div className="border border-pearl-grey bg-white p-5">
              <div className="flex items-center gap-2 text-soft-grey"><CheckCircle2 className="w-4 h-4" /><span className="text-sm">Pubblicati</span></div>
              <p className="font-display text-3xl mt-2">{data.counts.published}</p>
            </div>
            <div className="border border-pearl-grey bg-white p-5">
              <div className="flex items-center gap-2 text-soft-grey"><AlertTriangle className="w-4 h-4" /><span className="text-sm">Falliti</span></div>
              <p className="font-display text-3xl mt-2">{data.counts.failed}</p>
            </div>
          </div>

          {/* Accounts + per-platform */}
          {data.accounts && data.accounts.length > 0 && (
            <div className="border border-pearl-grey bg-white">
              <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">Account collegati ({data.accounts.length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-pearl-grey/60">
                {data.accounts.map((a) => {
                  const c = data.counts!.byPlatform[a.platform];
                  return (
                    <div key={a.id} className="px-5 py-3 border-pearl-grey/60 sm:border-r sm:border-b">
                      <PlatformBadge p={a.platform} />
                      <p className="text-sm mt-1 truncate">{a.username || a.fullname || '—'}</p>
                      {c && (
                        <p className="text-[11px] text-soft-grey mt-1">
                          {c.scheduled} prog · {c.published} pubbl · {c.failed} fall.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming scheduled */}
          <Section title={`Prossimi programmati (${data.scheduled?.length ?? 0})`}>
            {(data.scheduled?.length ?? 0) === 0
              ? <Empty text="Nessun post programmato." />
              : <PostTable posts={data.scheduled!.slice(0, 40)} />}
          </Section>

          {/* Failed (only if any) */}
          {(data.failed?.length ?? 0) > 0 && (
            <Section title={`Falliti (${data.failed!.length})`}>
              <PostTable posts={data.failed!.slice(0, 20)} />
            </Section>
          )}

          {/* Recent published */}
          <Section title={`Pubblicati di recente (${data.published?.length ?? 0})`}>
            {(data.published?.length ?? 0) === 0
              ? <Empty text="Nessun post pubblicato nella finestra." />
              : <PostTable posts={data.published!.slice(0, 40)} />}
          </Section>

          <p className="text-xs text-soft-grey">
            Blotato è uno strumento di pubblicazione: mostra cosa è stato pubblicato/programmato, non le metriche di
            engagement (follower, like, reach). Per quelle servono le API native delle piattaforme.
          </p>
        </>
      )}
    </div>
  );
}

function eur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function SiteSocialSection({ s }: { s: { days: number; byPlatform: Record<string, Funnel>; totals: Funnel } }) {
  const rows = Object.entries(s.byPlatform).sort((a, b) => b[1].visits - a[1].visits);
  return (
    <div className="border border-gold-primary/40 bg-ivory/30 overflow-x-auto">
      <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[10px] uppercase tracking-[0.25em] text-soft-black font-medium">Performance social → sito · ultimi {s.days} giorni</h3>
        <span className="text-[10px] text-soft-grey">traffico e vendite attribuiti dal referrer</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-soft-grey text-sm">
          Nessuna visita da social negli ultimi {s.days} giorni. Appena i post portano traffico comparirà qui per
          piattaforma: visite → prodotti visti → carrello → acquisti → fatturato.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-4 py-2 font-medium">Piattaforma</th>
              <th className="px-4 py-2 font-medium text-right">Visite</th>
              <th className="px-4 py-2 font-medium text-right">Prodotti</th>
              <th className="px-4 py-2 font-medium text-right">Carrello</th>
              <th className="px-4 py-2 font-medium text-right">Acquisti</th>
              <th className="px-4 py-2 font-medium text-right">Fatturato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {rows.map(([p, f]) => (
              <tr key={p} className="hover:bg-ivory/50">
                <td className="px-4 py-2.5"><PlatformBadge p={p as Platform} /></td>
                <td className="px-4 py-2.5 text-right tabular-nums">{f.visits}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-soft-grey">{f.productViews}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-soft-grey">{f.addToCart}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{f.purchases}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{f.revenue > 0 ? eur(f.revenue) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-soft-black/80">
            <tr className="font-medium">
              <td className="px-4 py-2.5">Totale social</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.totals.visits}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.totals.productViews}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.totals.addToCart}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.totals.purchases}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.totals.revenue > 0 ? eur(s.totals.revenue) : '—'}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-pearl-grey bg-white overflow-x-auto">
      <div className="px-5 py-3 border-b border-pearl-grey bg-warm-white">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PostTable({ posts }: { posts: Post[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-pearl-grey">
        <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
          <th className="px-4 py-2 font-medium">Piattaforma</th>
          <th className="px-4 py-2 font-medium">Quando</th>
          <th className="px-4 py-2 font-medium">Testo</th>
          <th className="px-4 py-2 font-medium">Link</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-pearl-grey/60">
        {posts.map((p) => <PostRow key={p.id} post={p} />)}
      </tbody>
    </table>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-center text-soft-grey text-sm">{text}</p>;
}
