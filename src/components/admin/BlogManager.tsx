'use client';

/**
 * Admin blog CMS — list + editor for blog_posts (the source of truth for the
 * public /trame-di-como journal). The admin writes the Italian master here and
 * fills the other six locales with one "Traduci con AI" pass. Posts can be
 * created from scratch, generated as an AI draft, or imported from the legacy
 * blog.json once.
 */
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  Plus, Sparkles, DownloadCloud, Pencil, Trash2, Eye, EyeOff,
  Loader2, X, Languages, Check,
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
};

const blank: Draft = {
  title: '', slug: '', excerpt: '', content: '', featured_image_url: '',
  seo_title: '', seo_description: '', status: 'draft',
};

function toDraft(p: AdminPost): Draft {
  return {
    id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt ?? '', content: p.content ?? '',
    featured_image_url: p.featured_image_url ?? '', seo_title: p.seo_title ?? '',
    seo_description: p.seo_description ?? '', status: p.status,
  };
}

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
  const [genOpen, setGenOpen] = useState(false);

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
        body: JSON.stringify(editing),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setEditing(null);
      flash(editing.id ? 'Articolo salvato' : 'Articolo creato');
      router.refresh();
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
        body: JSON.stringify({ topic: genTopic.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setGenOpen(false); setGenTopic('');
      flash(`Bozza generata: "${j.title}". Aprila per revisionare.`);
      router.refresh();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function togglePublish(p: AdminPost) {
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
            <button onClick={() => { setGenOpen(false); setGenTopic(''); }} className="px-4 py-2 border border-pearl-grey text-[11px] uppercase tracking-[0.2em] hover:border-soft-black">Annulla</button>
          </div>
          {err && genOpen && <p className="text-xs text-red-700">{err}</p>}
          <p className="text-[11px] text-soft-grey/70">Crea una bozza italiana. Poi la revisioni, traduci con AI e pubblichi.</p>
        </div>
      )}

      {/* List */}
      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-pearl-grey bg-warm-white">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Titolo</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium">Lingue</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {initialPosts.map((p) => {
              const langs = translatedLocales(p);
              const published = p.status === 'published';
              return (
                <tr key={p.id} className="hover:bg-ivory/40">
                  <td className="px-5 py-3">
                    <div className="font-medium text-soft-black">{p.title}</div>
                    <div className="text-[11px] text-soft-grey font-mono">/{p.slug}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${published ? 'bg-emerald-100 text-emerald-800' : 'bg-pearl-grey/50 text-soft-grey'}`}>
                      {published ? 'Pubblicato' : 'Bozza'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-soft-black text-soft-black">IT</span>
                      {langs.length > 0 ? (
                        langs.map((l) => (
                          <span key={l} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-pearl-grey text-soft-grey">{l}</span>
                        ))
                      ) : (
                        <span className="text-[10px] text-soft-grey/50">solo IT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-soft-grey whitespace-nowrap">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <IconBtn title="Modifica" onClick={() => { setEditing(toDraft(p)); setErr(null); }}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title={published ? 'Metti in bozza' : 'Pubblica'} onClick={() => togglePublish(p)}>
                        {published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </IconBtn>
                      <IconBtn title="Elimina" danger onClick={() => del(p)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {initialPosts.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-soft-grey text-sm">
                Nessun articolo. Importa da blog.json o crea il primo.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

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
              <Field label="URL immagine di copertina">
                <input value={editing.featured_image_url} onChange={(e) => setEditing({ ...editing, featured_image_url: e.target.value })} placeholder="/images/blog/... oppure https://..." className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
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

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-2 border border-pearl-grey transition-colors ${danger ? 'hover:border-red-500 hover:text-red-600' : 'hover:border-soft-black hover:text-soft-black'} text-soft-grey`}
    >
      {children}
    </button>
  );
}
