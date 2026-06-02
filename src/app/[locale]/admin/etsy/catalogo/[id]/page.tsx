'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import {
  ArrowLeft, Save, Store, ExternalLink, AlertTriangle,
  CheckCircle, Loader2, Pencil, Eye, Heart, BarChart2,
  Tag, Package, Star,
} from 'lucide-react';

// 'primary' = the listing's own/master language on Etsy (Italian for this shop).
// 'en'      = the English TRANSLATION (Etsy translations endpoint). English is
//             NOT the master here, so it lives as a translation, not the listing.
type Lang = 'primary' | 'en';
type ViewMode = 'read' | 'write';

type ListingRow = {
  listing_id: number;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  quantity: number | null;
  state: string | null;
  tags: string[] | null;
  materials: string[] | null;
  sku: string | null;
  taxonomy_id: number | null;
  url: string | null;
  image_urls: string[] | null;
  views: number | null;
  num_favorers: number | null;
  raw: Record<string, any> | null;
};

type Translation = { title?: string; description?: string; tags?: string[] };

type FormData = {
  primary: {
    title: string; description: string; price: string; currency: string;
    quantity: string; state: string; tags: string; materials: string;
    sku: string; taxonomy_id: string; who_made: string;
    when_made: string; is_supply: boolean;
  };
  en: { title: string; description: string; tags: string };
};

const WHO_MADE_OPTIONS = [
  { value: 'i_did', label: 'Io (i_did)' },
  { value: 'someone_else', label: 'Qualcun altro (someone_else)' },
  { value: 'collective', label: 'Collettivo (collective)' },
];

const WHEN_MADE_OPTIONS = [
  'made_to_order', '2020_2024', '2010_2019', '2004_2009', '1999_2003',
  '1990s', '1980s', '1970s', '1960s', '1950s', '1940s', '1930s', '1920s', 'before_1920',
];

const STATE_OPTIONS = [
  { value: 'active', label: 'Attivo' },
  { value: 'inactive', label: 'Inattivo' },
  { value: 'draft', label: 'Bozza' },
];

const LANG_NAMES: Record<string, string> = {
  it: 'Italiano', en: 'English', es: 'Español', fr: 'Français',
  de: 'Deutsch', pt: 'Português', nl: 'Nederlands',
};

function statePill(s: string | null) {
  const t = (s || '').toLowerCase();
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-amber-100 text-amber-700',
    draft: 'bg-pearl-grey/40 text-soft-grey',
    sold_out: 'bg-red-100 text-red-700',
    expired: 'bg-soft-grey/15 text-soft-grey',
  };
  return map[t] ?? 'bg-pearl-grey/40 text-soft-grey';
}

function fmtPrice(v: number | null, cur: string | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur || 'EUR' }).format(v);
}

function inputCls(extra = '') {
  return `w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black bg-white ${extra}`;
}
function labelCls() {
  return 'block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1 font-medium';
}

// ─── READ VIEW ──────────────────────────────────────────────────────────────

function EtsyListingScreen({
  listing, translationEN, primaryLabel,
}: { listing: ListingRow; translationEN: Translation; primaryLabel: string }) {
  const [activeImg, setActiveImg] = useState(0);
  const imgs = listing.image_urls ?? [];

  return (
    <div className="bg-white border border-pearl-grey">
      <div className="border-b border-pearl-grey bg-[#F1641E]/5 px-5 py-2 flex items-center gap-2">
        <Store className="w-4 h-4 text-[#F1641E]" />
        <span className="text-xs text-[#F1641E] font-medium tracking-wide">ETSY — ANTEPRIMA LISTING</span>
        <span className="ml-auto">
          {listing.url && (
            <a href={listing.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-soft-grey hover:text-[#F1641E]">
              Apri su Etsy <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-0">
        <div className="md:w-[55%] border-r border-pearl-grey p-4 space-y-3">
          <div className="relative aspect-square bg-pearl-grey/20 border border-pearl-grey/60 overflow-hidden">
            {imgs[activeImg] ? (
              <Image src={imgs[activeImg]} alt="" fill sizes="500px" className="object-contain" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-soft-grey/40">
                <Package className="w-16 h-16" />
              </div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {imgs.slice(0, 10).map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative w-14 h-14 border-2 overflow-hidden shrink-0 transition-colors ${i === activeImg ? 'border-[#F1641E]' : 'border-pearl-grey hover:border-soft-grey'}`}
                >
                  <Image src={src} alt="" fill sizes="56px" className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:w-[45%] p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#F1641E] font-medium">SilkInCom</span>
            <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${statePill(listing.state)}`}>
              {listing.state || '—'}
            </span>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-1">Titolo · {primaryLabel} (principale)</p>
            <h2 className="text-lg font-medium leading-snug">
              {listing.title || <span className="text-soft-grey italic">—</span>}
            </h2>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-1">Title · English (traduzione)</p>
            {translationEN.title
              ? <h3 className="text-base text-soft-grey/80 leading-snug">{translationEN.title}</h3>
              : <p className="text-xs text-amber-600 italic">Nessuna traduzione inglese su Etsy — da aggiungere</p>}
          </div>

          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-display">{fmtPrice(listing.price, listing.currency)}</span>
            <span className="text-xs text-soft-grey">Qtà: {listing.quantity ?? 0}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-[#F1641E] fill-[#F1641E]" />)}
            <span className="text-xs text-soft-grey ml-1">dati reali su etsy.com</span>
          </div>

          <div className="flex gap-4 border-t border-b border-pearl-grey/60 py-3">
            <div className="flex items-center gap-1.5 text-xs text-soft-grey"><Eye className="w-3.5 h-3.5" /> {listing.views ?? 0} viste</div>
            <div className="flex items-center gap-1.5 text-xs text-soft-grey"><Heart className="w-3.5 h-3.5" /> {listing.num_favorers ?? 0} preferiti</div>
            <div className="flex items-center gap-1.5 text-xs text-soft-grey"><BarChart2 className="w-3.5 h-3.5" /> ID {listing.listing_id}</div>
          </div>

          {(listing.tags ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags · {primaryLabel} ({(listing.tags ?? []).length}/13)</p>
              <div className="flex flex-wrap gap-1.5">
                {(listing.tags ?? []).map((tag) => <span key={tag} className="px-2 py-0.5 bg-ivory border border-pearl-grey/60 text-[11px] text-soft-grey">{tag}</span>)}
              </div>
            </div>
          )}

          {(translationEN.tags ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags · EN ({(translationEN.tags ?? []).length}/13)</p>
              <div className="flex flex-wrap gap-1.5">
                {(translationEN.tags ?? []).map((tag) => <span key={tag} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[11px] text-soft-grey">{tag}</span>)}
              </div>
            </div>
          )}

          {(listing.materials ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-1">Materiali</p>
              <p className="text-sm">{(listing.materials ?? []).join(', ')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            {listing.sku && (<div><p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-0.5">SKU</p><p className="font-mono">{listing.sku}</p></div>)}
            {listing.taxonomy_id && (<div><p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-0.5">Taxonomy</p><p className="font-mono">{listing.taxonomy_id}</p></div>)}
          </div>
        </div>
      </div>

      <div className="border-t border-pearl-grey p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-3">Descrizione · {primaryLabel} (principale)</p>
          <div className="text-sm text-soft-grey/90 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
            {listing.description || <span className="italic">—</span>}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-3">Description · English (traduzione)</p>
          <div className="text-sm text-soft-grey/90 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
            {translationEN.description || <span className="italic text-amber-600">Nessuna traduzione inglese — da aggiungere</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function EtsyListingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [listing, setListing] = useState<ListingRow | null>(null);
  const [translationEN, setTranslationEN] = useState<Translation>({});
  const [primaryLang, setPrimaryLang] = useState<string>('it');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('read');
  const [lang, setLang] = useState<Lang>('primary');
  const [saving, setSaving] = useState<Lang | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState<FormData>({
    primary: {
      title: '', description: '', price: '', currency: 'EUR',
      quantity: '', state: 'active', tags: '', materials: '',
      sku: '', taxonomy_id: '', who_made: 'i_did',
      when_made: 'made_to_order', is_supply: false,
    },
    en: { title: '', description: '', tags: '' },
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/etsy/listing/${id}`);
      const data = await res.json() as { listing: ListingRow; translation: Translation; primaryLanguage?: string };
      setListing(data.listing);
      setTranslationEN(data.translation ?? {});
      setPrimaryLang(data.primaryLanguage ?? 'it');
      const l = data.listing;
      const t = data.translation ?? {};
      setForm({
        primary: {
          title: l.title ?? '',
          description: l.description ?? '',
          price: l.price != null ? String(l.price) : '',
          currency: l.currency ?? 'EUR',
          quantity: l.quantity != null ? String(l.quantity) : '',
          state: l.state ?? 'active',
          tags: (l.tags ?? []).join(', '),
          materials: (l.materials ?? []).join(', '),
          sku: l.sku ?? '',
          taxonomy_id: l.taxonomy_id != null ? String(l.taxonomy_id) : '',
          who_made: l.raw?.who_made ?? 'i_did',
          when_made: l.raw?.when_made ?? 'made_to_order',
          is_supply: l.raw?.is_supply ?? false,
        },
        en: {
          title: t.title ?? '',
          description: t.description ?? '',
          tags: (t.tags ?? []).join(', '),
        },
      });
    } catch {
      setMsg({ type: 'err', text: 'Errore caricamento listing' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function setP<K extends keyof FormData['primary']>(k: K, v: FormData['primary'][K]) {
    setForm(f => ({ ...f, primary: { ...f.primary, [k]: v } }));
  }
  function setEN<K extends keyof FormData['en']>(k: K, v: FormData['en'][K]) {
    setForm(f => ({ ...f, en: { ...f.en, [k]: v } }));
  }

  async function save(which: Lang) {
    setSaving(which);
    setMsg(null);
    try {
      let langParam: string | undefined;
      let fields: Record<string, unknown>;
      if (which === 'primary') {
        langParam = undefined;
        fields = {
          title: form.primary.title,
          description: form.primary.description,
          price: parseFloat(form.primary.price) || 0,
          quantity: parseInt(form.primary.quantity, 10) || 0,
          state: form.primary.state,
          tags: form.primary.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 13),
          materials: form.primary.materials.split(',').map(t => t.trim()).filter(Boolean),
          sku: form.primary.sku || undefined,
          taxonomy_id: form.primary.taxonomy_id ? parseInt(form.primary.taxonomy_id, 10) : undefined,
          who_made: form.primary.who_made,
          when_made: form.primary.when_made,
          is_supply: form.primary.is_supply,
        };
      } else {
        langParam = 'en';
        fields = {
          title: form.en.title,
          description: form.en.description,
          tags: form.en.tags
            ? form.en.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 13)
            : undefined,
        };
      }

      const res = await fetch(`/api/etsy/listing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: langParam, fields }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'ok', text: which === 'primary' ? 'Listing principale sincronizzato su Etsy.' : 'Traduzione inglese sincronizzata su Etsy.' });
        await load();
        setViewMode('read');
      } else {
        setMsg({ type: 'err', text: data.error || 'Errore sincronizzazione' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-soft-grey py-16">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento da Etsy…
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-16 text-center text-soft-grey">
        Listing non trovato.{' '}
        <Link href="/admin/etsy/catalogo?mode=write" className="underline">Torna al catalogo</Link>
      </div>
    );
  }

  const primaryLabel = LANG_NAMES[primaryLang] ?? primaryLang.toUpperCase();

  return (
    <div className="space-y-5 max-w-[1000px]">
      <Link href="/admin/etsy/catalogo?mode=write" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" /> Catalogo Etsy
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Store className="w-5 h-5 text-[#F1641E] shrink-0" />
          <p className="text-sm text-soft-grey truncate">#{listing.listing_id}</p>
        </div>

        <div className="flex items-center border border-pearl-grey bg-white overflow-hidden text-[10px] uppercase tracking-[0.2em]">
          <button
            onClick={() => setViewMode('read')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${viewMode === 'read' ? 'bg-soft-black text-warm-white' : 'text-soft-grey hover:text-soft-black'}`}
          >
            <Eye className="w-3 h-3" /> Read
          </button>
          <div className="w-px h-full bg-pearl-grey" />
          <button
            onClick={() => setViewMode('write')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${viewMode === 'write' ? 'bg-[#F1641E] text-white' : 'text-soft-grey hover:text-soft-black'}`}
          >
            <Pencil className="w-3 h-3" /> Write
          </button>
        </div>
      </div>

      {msg && (
        <div className={`border px-4 py-3 text-sm flex items-center gap-2 ${msg.type === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {viewMode === 'read' && (
        <EtsyListingScreen listing={listing} translationEN={translationEN} primaryLabel={primaryLabel} />
      )}

      {viewMode === 'write' && (
        <div className="space-y-5">
          <div className="border-b border-pearl-grey flex gap-0">
            {(['primary', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex items-center gap-2 px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] font-medium border-b-2 -mb-px transition-colors ${lang === l ? 'border-soft-black text-soft-black' : 'border-transparent text-soft-grey hover:text-soft-black'}`}
              >
                {l === 'primary' ? `🇮🇹 ${primaryLabel} (principale)` : '🇬🇧 English'}
              </button>
            ))}
          </div>

          {/* PRIMARY (master) fields */}
          {lang === 'primary' && (
            <div className="space-y-5">
              <p className="text-xs text-soft-grey bg-ivory border border-pearl-grey/60 px-4 py-2">
                Lingua principale del listing ({primaryLabel}). Tutti i campi (prezzo, qty, stato, tag, materiali…) si modificano qui e vanno su Etsy.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelCls()}>Titolo — {form.primary.title.length}/140</label>
                  <input type="text" value={form.primary.title} onChange={e => setP('title', e.target.value)} className={inputCls()} maxLength={140} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls()}>Descrizione — {form.primary.description.length}/4000</label>
                  <textarea value={form.primary.description} onChange={e => setP('description', e.target.value)} rows={8} className={inputCls('resize-y')} maxLength={4000} />
                </div>
                <div>
                  <label className={labelCls()}>Prezzo</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" min="0" value={form.primary.price} onChange={e => setP('price', e.target.value)} className={inputCls('flex-1')} />
                    <select value={form.primary.currency} onChange={e => setP('currency', e.target.value)} className={inputCls('w-24')}>
                      {['EUR', 'USD', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={labelCls()}>Quantità</label><input type="number" min="0" value={form.primary.quantity} onChange={e => setP('quantity', e.target.value)} className={inputCls()} /></div>
                <div>
                  <label className={labelCls()}>Stato</label>
                  <select value={form.primary.state} onChange={e => setP('state', e.target.value)} className={inputCls()}>
                    {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div><label className={labelCls()}>SKU</label><input type="text" value={form.primary.sku} onChange={e => setP('sku', e.target.value)} className={inputCls()} /></div>
                <div className="md:col-span-2">
                  <label className={labelCls()}>Tags — {form.primary.tags.split(',').filter(t => t.trim()).length}/13</label>
                  <input type="text" value={form.primary.tags} onChange={e => setP('tags', e.target.value)} className={inputCls()} />
                </div>
                <div className="md:col-span-2"><label className={labelCls()}>Materials (virgola)</label><input type="text" value={form.primary.materials} onChange={e => setP('materials', e.target.value)} className={inputCls()} /></div>
                <div><label className={labelCls()}>Taxonomy ID</label><input type="number" value={form.primary.taxonomy_id} onChange={e => setP('taxonomy_id', e.target.value)} className={inputCls()} /></div>
                <div>
                  <label className={labelCls()}>Who Made</label>
                  <select value={form.primary.who_made} onChange={e => setP('who_made', e.target.value)} className={inputCls()}>
                    {WHO_MADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls()}>When Made</label>
                  <select value={form.primary.when_made} onChange={e => setP('when_made', e.target.value)} className={inputCls()}>
                    {WHEN_MADE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <input id="is_supply" type="checkbox" checked={form.primary.is_supply} onChange={e => setP('is_supply', e.target.checked)} className="w-4 h-4 accent-soft-black" />
                  <label htmlFor="is_supply" className="text-sm">È un supply/materiale (non handmade)</label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => save('primary')} disabled={saving !== null} className="inline-flex items-center gap-2 px-8 py-2.5 bg-[#F1641E] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4551a] transition-colors disabled:opacity-40">
                  {saving === 'primary' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizzo…</> : <><Save className="w-3.5 h-3.5" /> Sincronizza principale → Etsy</>}
                </button>
              </div>
            </div>
          )}

          {/* ENGLISH translation fields */}
          {lang === 'en' && (
            <div className="space-y-5">
              <p className="text-xs text-soft-grey bg-ivory border border-pearl-grey/60 px-4 py-2">
                Traduzione <strong>inglese</strong> (title, description, tags). Si aggiunge come traduzione Etsy `en` — non sovrascrive il listing principale {primaryLabel}.
              </p>

              <div>
                <label className={labelCls()}>Title (EN) — {form.en.title.length}/140</label>
                <input type="text" value={form.en.title} onChange={e => setEN('title', e.target.value)} className={inputCls()} maxLength={140} />
              </div>
              <div>
                <label className={labelCls()}>Description (EN) — {form.en.description.length}/4000</label>
                <textarea value={form.en.description} onChange={e => setEN('description', e.target.value)} rows={10} className={inputCls('resize-y')} maxLength={4000} />
              </div>
              <div>
                <label className={labelCls()}>Tags EN — {form.en.tags.split(',').filter(t => t.trim()).length}/13</label>
                <input type="text" value={form.en.tags} onChange={e => setEN('tags', e.target.value)} placeholder="silk scarf, luxury gift, handmade, ..." className={inputCls()} />
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => save('en')} disabled={saving !== null} className="inline-flex items-center gap-2 px-8 py-2.5 bg-[#F1641E] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4551a] transition-colors disabled:opacity-40">
                  {saving === 'en' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizzo…</> : <><Save className="w-3.5 h-3.5" /> Sincronizza EN → Etsy</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
