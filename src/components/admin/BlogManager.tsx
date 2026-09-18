'use client';

/**
 * Admin blog CMS — list + editor for blog_posts (the source of truth for the
 * public /trame-di-como journal). The admin writes the Italian master here and
 * fills the other six locales with one "Traduci con AI" pass. Posts can be
 * created from scratch, generated as an AI draft, or imported from the legacy
 * blog.json once.
 */
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  Plus, Sparkles, DownloadCloud, Pencil, Trash2, Eye, EyeOff,
  Loader2, X, Languages, Check, ImagePlus, Send, CalendarClock, ExternalLink,
} from 'lucide-react';

const LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'nl'] as const;

export type AdminPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: string;
  published_at: string | null;
  updated_at: string | null;
  title_i18n: Record<string, string> | null;
  content_i18n: Record<string, string> | null;
};

type Draft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  seo_title: string;
  seo_description: string;
  status: string;
  /** datetime-local value in the admin's own timezone; '' = publish now. */
  published_at: string;
};

const blank: Draft = {
  title: '', slug: '', excerpt: '', content: '', featured_image_url: '',
  seo_title: '', seo_description: '', status: 'draft', published_at: '',
};

// published_at is stored without a timezone and means UTC (src/data/posts.ts
// compares it with the UTC clock), so read it as UTC...
function parseDbDate(s: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

// ...and show/edit it in the admin's local time.
function toLocalInput(s: string | null): string {
  if (!s) return '';
  const d = parseDbDate(s);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDraft(p: AdminPost): Draft {
  return {
    id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt ?? '', content: p.content ?? '',
    featured_image_url: p.featured_image_url ?? '', seo_title: p.seo_title ?? '',
    seo_description: p.seo_description ?? '', status: p.status,
    published_at: toLocalInput(p.published_at),
  };
}

type AiKeyStatus = {
  source: 'admin' | 'env' | null;
  last4: string | null;
  valid: boolean;
  /** Account balance in USD; calls start failing (402) when it runs low. */
  balance: number | null;
  error: string | null;
};

function translatedLocales(p: AdminPost): string[] {
  const t = p.title_i18n ?? {};
  const c = p.content_i18n ?? {};
  return LOCALES.filter((l) => t[l] && c[l]);
}

export function BlogManager({ initialPosts }: { initialPosts: AdminPost[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [trProgress, setTrProgress] = useState<string | null>(null);
  const [genTopic, setGenTopic] = useState('');
  const [genBrief, setGenBrief] = useState('');
  const [genImage, setGenImage] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [aiKey, setAiKey] = useState<AiKeyStatus | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => { loadAiKey(); }, []);

  async function loadAiKey() {
    try {
      const res = await fetch('/api/admin/settings/openrouter');
      if (res.ok) {
        const j = (await res.json()) as AiKeyStatus;
        setAiKey(j);
        if (!j.valid) setKeyOpen(true);
      }
    } catch { /* status is informative only */ }
  }

  async function saveAiKey() {
    if (!keyInput.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/settings/openrouter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setKeyInput(''); setKeyOpen(false);
      flash(`Chiave AI salvata e verificata (…${j.last4})`);
      await loadAiKey();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function uploadGenImage(file: File) {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/blog/image', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setGenImage(j.url);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  async function save() {
    if (!editing) return;
    if (!editing.title.trim()) { setErr('Il titolo è obbligatorio'); return; }
    setBusy(true); setErr(null);
    try {
      const method = editing.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/blog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editing,
          published_at: editing.published_at ? new Date(editing.published_at).toISOString() : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setEditing(null);
      flash(editing.id ? 'Articolo salvato' : 'Articolo creato');
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function uploadCover(file: File) {
    if (!editing) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/blog/image', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setEditing((cur) => (cur ? { ...cur, featured_image_url: j.url } : cur));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function translateAll() {
    if (!editing?.id) { setErr('Salva prima l\'articolo, poi traduci'); return; }
    setBusy(true); setErr(null);
    let done = 0;
    for (const lang of LOCALES) {
      setTrProgress(`${lang.toUpperCase()} (${done}/${LOCALES.length})`);
      try {
        const res = await fetch('/api/admin/blog/translate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, lang }),
        });
        if (res.ok) done++;
      } catch { /* keep going; partial translations are fine */ }
    }
    setTrProgress(null); setBusy(false);
    flash(`Tradotto ${done}/${LOCALES.length} lingue`);
    router.refresh();
  }

  async function seed() {
    if (!confirm('Importa gli articoli da blog.json nel database? (idempotente, aggiorna per slug)')) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/blog/seed', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      flash(`Importati ${j.seeded} articoli`);
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function generate() {
    if (genTopic.trim().length < 5) { setErr('Argomento troppo corto'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/blog/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: genTopic.trim(),
          brief: genBrief.trim(),
          ...(genImage ? { featuredImageUrl: genImage } : {}),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setGenOpen(false); setGenTopic(''); setGenBrief(''); setGenImage('');
      const nFix = Array.isArray(j.fixes) ? j.fixes.length : 0;
      flash(`Bozza generata: "${j.title}".${nFix ? ` ${nFix} correzioni di formato applicate.` : ''} La trovi qui sotto in BOZZE.`);
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function togglePublish(p: AdminPost) {
    if (p.status !== 'published') {
      const future = p.published_at && parseDbDate(p.published_at).getTime() > Date.now();
      const when = future
        ? `programmare per ${parseDbDate(p.published_at as string).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
        : 'pubblicare subito sul sito';
      if (!confirm(`Vuoi ${when} "${p.title}"?`)) return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: p.status === 'published' ? 'draft' : 'published' }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function del(p: AdminPost) {
    if (!confirm(`Eliminare definitivamente "${p.title}"?`)) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/blog?id=${p.id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }
      flash('Articolo eliminato');
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl">Blog — Trame di Como</h1>
          <p className="text-soft-grey text-sm">Gestione articoli del giornale · italiano sorgente + traduzioni AI</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={seed} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 border border-pearl-grey hover:border-soft-black text-[11px] uppercase tracking-[0.2em] transition-colors disabled:opacity-40">
            <DownloadCloud className="w-3.5 h-3.5" /> Importa blog.json
          </button>
          <button onClick={() => { setGenOpen(true); setErr(null); }} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 border border-pearl-grey hover:border-soft-black text-[11px] uppercase tracking-[0.2em] transition-colors disabled:opacity-40">
            <Sparkles className="w-3.5 h-3.5" /> Genera bozza AI
          </button>
          <button onClick={() => { setEditing({ ...blank }); setErr(null); }} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Nuovo articolo
          </button>
        </div>
      </div>

      {notice && <div className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">{notice}</div>}

      {/* AI key (OpenRouter) — used by drafts, translations and the other AI tools */}
      <div className={`border px-4 py-3 text-xs ${aiKey && (!aiKey.valid || (aiKey.balance != null && aiKey.balance < 1)) ? 'border-red-200 bg-red-50' : 'border-pearl-grey bg-white'}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-soft-black/80">
            <span className="uppercase tracking-[0.2em] text-[10px] text-soft-grey mr-2">Chiave AI (OpenRouter)</span>
            {!aiKey ? 'verifica…'
              : aiKey.valid
                ? `attiva …${aiKey.last4 ?? ''}${aiKey.balance != null ? ` · saldo conto $${aiKey.balance.toFixed(2)}${aiKey.balance < 1 ? ' — quasi esaurito: ricarica su openrouter.ai/credits' : ''}` : ''}`
                : `non funziona${aiKey.error ? ` (${aiKey.error})` : ''} — inseriscine una nuova`}
          </span>
          <button onClick={() => setKeyOpen((v) => !v)} className="text-[11px] uppercase tracking-[0.2em] underline text-soft-black">
            {keyOpen ? 'Chiudi' : 'Cambia chiave'}
          </button>
        </div>
        {keyOpen && (
          <div className="mt-3 flex gap-2 flex-wrap items-center">
            <input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-or-v1-…"
              className="flex-1 min-w-[260px] border border-pearl-grey bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:border-soft-black"
            />
            <button onClick={saveAiKey} disabled={busy || !keyInput.trim()} className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-40">
              <Check className="w-3.5 h-3.5" /> Salva e verifica
            </button>
            <p className="w-full text-[11px] text-soft-grey/80">La crei su openrouter.ai → Keys. Viene verificata prima del salvataggio e conservata cifrata: qui si vedono solo le ultime 4 cifre.</p>
          </div>
        )}
      </div>
      {err && !editing && !genOpen && <div className="border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{err}</div>}

      {/* Generate draft inline panel */}
      {genOpen && (
        <div className="border border-pearl-grey bg-ivory/50 p-4 space-y-3">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey">Argomento dell'articolo</label>
          <div className="flex gap-2 flex-wrap">
            <input
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              placeholder="es. Come abbinare un foulard di seta in primavera"
              className="flex-1 min-w-[260px] border border-pearl-grey bg-white px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
            />
            <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-40">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Genera
            </button>
            <button onClick={() => { setGenOpen(false); setGenTopic(''); setGenBrief(''); setGenImage(''); }} className="px-4 py-2 border border-pearl-grey text-[11px] uppercase tracking-[0.2em] hover:border-soft-black">Annulla</button>
          </div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey">Brief (facoltativo)</label>
          <textarea
            value={genBrief}
            onChange={(e) => setGenBrief(e.target.value)}
            rows={3}
            placeholder="Protagonista, pubblico e angolo. es. Solo pashmina Bellagio Cipria, per direttori d'hotel 5 stelle: welcome gift e servizio serale in terrazza."
            className="w-full border border-pearl-grey bg-white px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
          />
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey">Foto di copertina (facoltativa — l'AI la guarda e scrive coerente con la scena)</label>
          <div className="flex items-center gap-3">
            {genImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={genImage} alt="" className="w-16 h-20 object-cover border border-pearl-grey" />
            )}
            <label className={`inline-flex items-center gap-2 border border-pearl-grey bg-white px-3 py-2 text-[11px] uppercase tracking-[0.2em] cursor-pointer hover:border-soft-black ${busy ? 'opacity-40 pointer-events-none' : ''}`}>
              <ImagePlus className="w-3.5 h-3.5" /> {genImage ? 'Cambia foto' : 'Carica foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadGenImage(f); e.target.value = ''; }}
              />
            </label>
            {genImage && (
              <button type="button" onClick={() => setGenImage('')} className="text-[11px] text-soft-grey hover:text-soft-black underline">rimuovi</button>
            )}
          </div>
          {err && genOpen && <p className="text-xs text-red-700">{err}</p>}
          <p className="text-[11px] text-soft-grey/70">Bozza italiana secondo lo standard Trame di Como: dati reali dal catalogo, link solo a pagine esistenti, domande finali per Google e AI. Poi la revisioni, traduci con AI e pubblichi. La foto di copertina scegli tu: controlla che non sia già uscita sui social.</p>
        </div>
      )}

      {/* List — split by status so drafts are never lost among published posts */}
      {(() => {
        const now = Date.now();
        const isScheduled = (p: AdminPost) =>
          p.status === 'published' && !!p.published_at && parseDbDate(p.published_at).getTime() > now;
        const drafts = initialPosts.filter((p) => p.status !== 'published');
        const scheduled = initialPosts
          .filter(isScheduled)
          .sort((a, b) => parseDbDate(a.published_at as string).getTime() - parseDbDate(b.published_at as string).getTime());
        const live = initialPosts.filter((p) => p.status === 'published' && !isScheduled(p));
        const fmt = (d: string, withTime = false) =>
          parseDbDate(d).toLocaleString('it-IT', {
            weekday: withTime ? 'short' : undefined, day: 'numeric', month: 'short', year: withTime ? undefined : 'numeric',
            ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
          });

        const Langs = ({ p }: { p: AdminPost }) => {
          const langs = translatedLocales(p);
          return (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-soft-black text-soft-black">IT</span>
              {LOCALES.map((l) => (
                <span key={l} className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${langs.includes(l) ? 'border-soft-black/40 text-soft-black' : 'border-pearl-grey text-soft-grey/40 line-through'}`}>{l}</span>
              ))}
              {langs.length < LOCALES.length && <span className="text-[10px] text-amber-700 ml-1">mancano {LOCALES.length - langs.length} lingue</span>}
            </div>
          );
        };

        const Btn = ({ children, onClick, href, tone = 'plain' }: { children: React.ReactNode; onClick?: () => void; href?: string; tone?: 'plain' | 'dark' | 'danger' }) => {
          const cls = `inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] border transition-colors disabled:opacity-40 ${
            tone === 'dark' ? 'bg-soft-black text-warm-white border-soft-black hover:bg-gold-primary hover:text-soft-black'
            : tone === 'danger' ? 'border-pearl-grey text-soft-grey hover:border-red-500 hover:text-red-600'
            : 'border-pearl-grey text-soft-black hover:border-soft-black'}`;
          return href
            ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
            : <button type="button" onClick={onClick} disabled={busy} className={cls}>{children}</button>;
        };

        const Card = ({ p, children, meta }: { p: AdminPost; children: React.ReactNode; meta: React.ReactNode }) => (
          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="font-medium text-soft-black leading-snug">{p.title}</div>
              <div className="text-[11px] text-soft-grey font-mono truncate">/{p.slug}</div>
              <div className="flex items-center gap-3 flex-wrap text-[11px] text-soft-grey">{meta}<Langs p={p} /></div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap md:justify-end">{children}</div>
          </div>
        );

        const Section = ({ id, title, hint, tone, count, children }: { id: string; title: string; hint: string; tone: string; count: number; children: React.ReactNode }) => (
          <section id={id} className="border border-pearl-grey bg-white scroll-mt-24">
            <div className={`px-5 py-3 border-b border-pearl-grey flex items-baseline justify-between gap-3 ${tone}`}>
              <h2 className="text-[11px] uppercase tracking-[0.25em] font-medium">{title} <span className="opacity-60">({count})</span></h2>
              <span className="text-[11px] opacity-70">{hint}</span>
            </div>
            <div className="divide-y divide-pearl-grey/60">
              {count === 0 ? <p className="px-5 py-6 text-sm text-soft-grey">Nessun articolo.</p> : children}
            </div>
          </section>
        );

        const preview = (p: AdminPost) => `/admin/blog/anteprima/${p.id}`;

        return (
          <div className="space-y-6">
            {/* Summary: jump to each group */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <a href="#bozze" className="border border-pearl-grey bg-white px-3 py-3 hover:border-soft-black">
                <div className="font-display text-3xl">{drafts.length}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">Bozze</div>
              </a>
              <a href="#programmati" className="border border-pearl-grey bg-white px-3 py-3 hover:border-soft-black">
                <div className="font-display text-3xl">{scheduled.length}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">Programmati</div>
              </a>
              <a href="#pubblicati" className="border border-pearl-grey bg-white px-3 py-3 hover:border-soft-black">
                <div className="font-display text-3xl">{live.length}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">Pubblicati</div>
              </a>
            </div>

            <Section id="bozze" title="Bozze" hint="Non visibili sul sito: rileggi, traduci, poi pubblica o programma" tone="bg-pearl-grey/30" count={drafts.length}>
              {drafts.map((p) => {
                const planned = p.published_at && parseDbDate(p.published_at).getTime() > now ? p.published_at : null;
                return (
                  <Card key={p.id} p={p} meta={<span>{planned ? `data prevista ${fmt(planned, true)}` : `modificata ${p.updated_at ? fmt(p.updated_at) : '—'}`}</span>}>
                    <Btn onClick={() => { setEditing(toDraft(p)); setErr(null); }}><Pencil className="w-3.5 h-3.5" /> Modifica</Btn>
                    <Btn href={preview(p)}><Eye className="w-3.5 h-3.5" /> Anteprima</Btn>
                    <Btn tone="dark" onClick={() => togglePublish(p)}>
                      <Send className="w-3.5 h-3.5" /> {planned ? `Programma ${fmt(planned)}` : 'Pubblica ora'}
                    </Btn>
                    <Btn tone="danger" onClick={() => del(p)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                  </Card>
                );
              })}
            </Section>

            <Section id="programmati" title="Programmati" hint="Escono da soli alla data indicata" tone="bg-amber-50 text-amber-900" count={scheduled.length}>
              {scheduled.map((p) => (
                <Card key={p.id} p={p} meta={<span className="text-amber-800 font-medium"><CalendarClock className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />esce {fmt(p.published_at as string, true)}</span>}>
                  <Btn onClick={() => { setEditing(toDraft(p)); setErr(null); }}><Pencil className="w-3.5 h-3.5" /> Modifica</Btn>
                  <Btn href={preview(p)}><Eye className="w-3.5 h-3.5" /> Anteprima</Btn>
                  <Btn onClick={() => togglePublish(p)}><EyeOff className="w-3.5 h-3.5" /> Riporta in bozza</Btn>
                </Card>
              ))}
            </Section>

            <Section id="pubblicati" title="Pubblicati" hint="Online sul sito" tone="bg-emerald-50 text-emerald-900" count={live.length}>
              {live.map((p) => (
                <Card key={p.id} p={p} meta={<span>online dal {p.published_at ? fmt(p.published_at) : '—'}</span>}>
                  <Btn onClick={() => { setEditing(toDraft(p)); setErr(null); }}><Pencil className="w-3.5 h-3.5" /> Modifica</Btn>
                  <Btn href={`/trame-di-como/${p.slug}`}><ExternalLink className="w-3.5 h-3.5" /> Vedi sul sito</Btn>
                  <Btn onClick={() => togglePublish(p)}><EyeOff className="w-3.5 h-3.5" /> Metti in bozza</Btn>
                  <Btn tone="danger" onClick={() => del(p)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                </Card>
              ))}
            </Section>
          </div>
        );
      })()}

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-soft-black/30" onClick={() => !busy && setEditing(null)} />
          <div className="relative w-full max-w-2xl h-full bg-warm-white shadow-2xl overflow-y-auto">
            <div className="h-[3px] bg-gradient-to-r from-gold-primary via-gold-dark to-gold-primary" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-grey sticky top-0 bg-warm-white z-10">
              <h2 className="font-display text-2xl">{editing.id ? 'Modifica articolo' : 'Nuovo articolo'}</h2>
              <button onClick={() => !busy && setEditing(null)} className="p-1 text-soft-grey hover:text-soft-black"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <Field label="Titolo (italiano)">
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
              </Field>
              <Field label="Slug (URL)">
                <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto dal titolo se vuoto" className="w-full border border-pearl-grey px-3 py-2 text-sm font-mono focus:outline-none focus:border-soft-black" />
              </Field>
              <Field label="Estratto / standfirst">
                <textarea value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black resize-y" />
              </Field>
              <Field label="Contenuto (usa ## e ### per i titoli, riga vuota tra i paragrafi)">
                <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={16} className="w-full border border-pearl-grey px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:border-soft-black resize-y" />
              </Field>
              <Field label="Foto di copertina">
                <div className="flex gap-3 items-start">
                  {editing.featured_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editing.featured_image_url} alt="" className="w-20 h-24 object-cover border border-pearl-grey shrink-0" />
                  )}
                  <div className="flex-1 space-y-2">
                    <label className={`inline-flex items-center gap-2 border border-pearl-grey px-3 py-2 text-[11px] uppercase tracking-[0.2em] cursor-pointer hover:border-soft-black ${busy ? 'opacity-40 pointer-events-none' : ''}`}>
                      <ImagePlus className="w-3.5 h-3.5" /> Carica foto
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }}
                      />
                    </label>
                    <input value={editing.featured_image_url} onChange={(e) => setEditing({ ...editing, featured_image_url: e.target.value })} placeholder="oppure incolla un URL (/editorial/... o https://...)" className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
                    <p className="text-[11px] text-soft-grey/80">Verticale, senza scritte sopra. Usa una foto mai uscita sui social.</p>
                  </div>
                </div>
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="SEO title">
                  <input value={editing.seo_title} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
                </Field>
                <Field label="Stato">
                  <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black">
                    <option value="draft">Bozza</option>
                    <option value="published">Pubblicato</option>
                  </select>
                </Field>
              </div>
              <Field label="Data di pubblicazione (facoltativa)">
                <input
                  type="datetime-local"
                  value={editing.published_at}
                  onChange={(e) => setEditing({ ...editing, published_at: e.target.value })}
                  className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black"
                />
                <p className="text-[11px] text-soft-grey/80 mt-1">Con stato Pubblicato: data futura = programmato, esce da solo a quell&apos;ora. Vuota = subito.</p>
              </Field>
              <Field label="SEO description">
                <textarea value={editing.seo_description} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} rows={2} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black resize-y" />
              </Field>

              {err && <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
            </div>

            <div className="px-6 py-4 border-t border-pearl-grey sticky bottom-0 bg-warm-white flex items-center gap-2 flex-wrap">
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-40">
                {busy && !trProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salva
              </button>
              <button onClick={translateAll} disabled={busy || !editing.id} title={!editing.id ? 'Salva prima' : 'Traduci in 6 lingue'} className="inline-flex items-center gap-2 border border-pearl-grey px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] hover:border-soft-black disabled:opacity-40">
                {trProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                {trProgress ? `Traduco ${trProgress}` : 'Traduci con AI'}
              </button>
              {editing.id && (
                <a href={`/admin/blog/anteprima/${editing.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-pearl-grey px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] hover:border-soft-black">
                  <Eye className="w-3.5 h-3.5" /> Anteprima
                </a>
              )}
              <button onClick={() => !busy && setEditing(null)} className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] border border-pearl-grey hover:border-soft-black disabled:opacity-40">Chiudi</button>
            </div>
          </div>
        </div>
      )}
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
