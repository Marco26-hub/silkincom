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

type Lang = 'en' | 'it';
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

type Translation = {
  title?: string;
  description?: string;
  tags?: string[];
};

type FormData = {
  en: {
    title: string; description: string; price: string; currency: string;
    quantity: string; state: string; tags: string; materials: string;
    sku: string; taxonomy_id: string; who_made: string;
    when_made: string; is_supply: boolean;
  };
  it: { title: string; description: string; tags: string };
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
  listing, translationIT,
}: { listing: ListingRow; translationIT: Translation }) {
  const [activeImg, setActiveImg] = useState(0);
  const imgs = listing.image_urls ?? [];

  return (
    <div className="bg-white border border-pearl-grey">
      {/* Etsy-style topbar */}
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
        {/* Left: images */}
        <div className="md:w-[55%] border-r border-pearl-grey p-4 space-y-3">
          {/* Main image */}
          <div className="relative aspect-square bg-pearl-grey/20 border border-pearl-grey/60 overflow-hidden">
            {imgs[activeImg] ? (
              <Image
                src={imgs[activeImg]}
                alt=""
                fill
                sizes="500px"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-soft-grey/40">
                <Package className="w-16 h-16" />
              </div>
            )}
          </div>
          {/* Thumbnails */}
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

        {/* Right: info */}
        <div className="md:w-[45%] p-6 space-y-5">
          {/* Shop + state */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#F1641E] font-medium">SilkInCom</span>
            <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${statePill(listing.state)}`}>
              {listing.state || '—'}
            </span>
          </div>

          {/* Title EN */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-1">Title (EN)</p>
            <h2 className="text-lg font-medium leading-snug">
              {listing.title || <span className="text-soft-grey italic">—</span>}
            </h2>
          </div>

          {/* Title IT (translation) */}
          {translationIT.title && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-1">Titolo (IT)</p>
              <h3 className="text-base text-soft-grey/80 leading-snug">{translationIT.title}</h3>
            </div>
          )}

          {/* Price + qty */}
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-display">{fmtPrice(listing.price, listing.currency)}</span>
            <span className="text-xs text-soft-grey">Qtà: {listing.quantity ?? 0}</span>
          </div>

          {/* Etsy stars mockup */}
          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`w-3.5 h-3.5 ${i <= 5 ? 'text-[#F1641E] fill-[#F1641E]' : 'text-pearl-grey'}`} />
            ))}
            <span className="text-xs text-soft-grey ml-1">dati reali su etsy.com</span>
          </div>

          {/* Stats */}
          <div className="flex gap-4 border-t border-b border-pearl-grey/60 py-3">
            <div className="flex items-center gap-1.5 text-xs text-soft-grey">
              <Eye className="w-3.5 h-3.5" /> {listing.views ?? 0} viste
            </div>
            <div className="flex items-center gap-1.5 text-xs text-soft-grey">
              <Heart className="w-3.5 h-3.5" /> {listing.num_favorers ?? 0} preferiti
            </div>
            <div className="flex items-center gap-1.5 text-xs text-soft-grey">
              <BarChart2 className="w-3.5 h-3.5" /> ID {listing.listing_id}
            </div>
          </div>

          {/* Tags EN */}
          {(listing.tags ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags EN ({(listing.tags ?? []).length}/13)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(listing.tags ?? []).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-ivory border border-pearl-grey/60 text-[11px] text-soft-grey">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags IT */}
          {(translationIT.tags ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags IT ({(translationIT.tags ?? []).length}/13)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(translationIT.tags ?? []).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-[11px] text-soft-grey">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {(listing.materials ?? []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-1">Materiali</p>
              <p className="text-sm">{(listing.materials ?? []).join(', ')}</p>
            </div>
          )}

          {/* SKU + taxonomy */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {listing.sku && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-0.5">SKU</p>
                <p className="font-mono">{listing.sku}</p>
              </div>
            )}
            {listing.taxonomy_id && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-0.5">Taxonomy</p>
                <p className="font-mono">{listing.taxonomy_id}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-pearl-grey p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-3">Descrizione EN</p>
          <div className="text-sm text-soft-grey/90 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
            {listing.description || <span className="italic">—</span>}
          </div>
        </div>
        {translationIT.description && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-soft-grey mb-3">Descrizione IT</p>
            <div className="text-sm text-soft-grey/90 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
              {translationIT.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function EtsyListingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [listing, setListing] = useState<ListingRow | null>(null);
  const [translationIT, setTranslationIT] = useState<Translation>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('read');
  const [lang, setLang] = useState<Lang>('en');
  const [saving, setSaving] = useState<Lang | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState<FormData>({
    en: {
      title: '', description: '', price: '', currency: 'EUR',
      quantity: '', state: 'active', tags: '', materials: '',
      sku: '', taxonomy_id: '', who_made: 'i_did',
      when_made: 'made_to_order', is_supply: false,
    },
    it: { title: '', description: '', tags: '' },
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/etsy/listing/${id}`);
      const data = await res.json() as { listing: ListingRow; translation: Translation };
      setListing(data.listing);
      setTranslationIT(data.translation ?? {});
      const l = data.listing;
      const t = data.translation ?? {};
      setForm({
        en: {
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
        it: {
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

  function setEN<K extends keyof FormData['en']>(k: K, v: FormData['en'][K]) {
    setForm(f => ({ ...f, en: { ...f.en, [k]: v } }));
  }
  function setIT<K extends keyof FormData['it']>(k: K, v: FormData['it'][K]) {
    setForm(f => ({ ...f, it: { ...f.it, [k]: v } }));
  }

  async function save(l: Lang) {
    setSaving(l);
    setMsg(null);
    try {
      let fields: Record<string, unknown>;
      if (l === 'en') {
        fields = {
          title: form.en.title,
          description: form.en.description,
          price: parseFloat(form.en.price) || 0,
          quantity: parseInt(form.en.quantity, 10) || 0,
          state: form.en.state,
          tags: form.en.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 13),
          materials: form.en.materials.split(',').map(t => t.trim()).filter(Boolean),
          sku: form.en.sku || undefined,
          taxonomy_id: form.en.taxonomy_id ? parseInt(form.en.taxonomy_id, 10) : undefined,
          who_made: form.en.who_made,
          when_made: form.en.when_made,
          is_supply: form.en.is_supply,
        };
      } else {
        fields = {
          title: form.it.title || undefined,
          description: form.it.description || undefined,
          tags: form.it.tags
            ? form.it.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 13)
            : undefined,
        };
      }

      const res = await fetch(`/api/etsy/listing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: l === 'it' ? 'it' : undefined, fields }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'ok', text: `Sincronizzato su Etsy (${l.toUpperCase()}).` });
        // Reload to show updated read view
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

  return (
    <div className="space-y-5 max-w-[1000px]">
      {/* Breadcrumb */}
      <Link href="/admin/etsy/catalogo?mode=write" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" /> Catalogo Etsy
      </Link>

      {/* Header + R/W switch */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Store className="w-5 h-5 text-[#F1641E] shrink-0" />
          <p className="text-sm text-soft-grey truncate">#{listing.listing_id}</p>
        </div>

        {/* Read / Write toggle */}
        <div className="flex items-center border border-pearl-grey bg-white overflow-hidden text-[10px] uppercase tracking-[0.2em]">
          <button
            onClick={() => setViewMode('read')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${
              viewMode === 'read'
                ? 'bg-soft-black text-warm-white'
                : 'text-soft-grey hover:text-soft-black'
            }`}
          >
            <Eye className="w-3 h-3" /> Read
          </button>
          <div className="w-px h-full bg-pearl-grey" />
          <button
            onClick={() => setViewMode('write')}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${
              viewMode === 'write'
                ? 'bg-[#F1641E] text-white'
                : 'text-soft-grey hover:text-soft-black'
            }`}
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

      {/* ── READ MODE ── */}
      {viewMode === 'read' && (
        <EtsyListingScreen listing={listing} translationIT={translationIT} />
      )}

      {/* ── WRITE MODE ── */}
      {viewMode === 'write' && (
        <div className="space-y-5">
          {/* Language tabs */}
          <div className="border-b border-pearl-grey flex gap-0">
            {(['en', 'it'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex items-center gap-2 px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] font-medium border-b-2 -mb-px transition-colors ${
                  lang === l
                    ? 'border-soft-black text-soft-black'
                    : 'border-transparent text-soft-grey hover:text-soft-black'
                }`}
              >
                {l === 'en' ? '🇬🇧 English' : '🇮🇹 Italiano'}
              </button>
            ))}
          </div>

          {/* EN fields */}
          {lang === 'en' && (
            <div className="space-y-5">
              <p className="text-xs text-soft-grey bg-ivory border border-pearl-grey/60 px-4 py-2">
                Modifica il listing principale (lingua default Etsy). Tutti i campi vengono sincronizzati su Etsy.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelCls()}>Title (EN) — {form.en.title.length}/140</label>
                  <input type="text" value={form.en.title} onChange={e => setEN('title', e.target.value)} className={inputCls()} maxLength={140} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls()}>Description (EN) — {form.en.description.length}/4000</label>
                  <textarea value={form.en.description} onChange={e => setEN('description', e.target.value)} rows={8} className={inputCls('resize-y')} maxLength={4000} />
                </div>

                <div>
                  <label className={labelCls()}>Prezzo</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" min="0" value={form.en.price} onChange={e => setEN('price', e.target.value)} className={inputCls('flex-1')} />
                    <select value={form.en.currency} onChange={e => setEN('currency', e.target.value)} className={inputCls('w-24')}>
                      {['EUR', 'USD', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls()}>Quantità</label>
                  <input type="number" min="0" value={form.en.quantity} onChange={e => setEN('quantity', e.target.value)} className={inputCls()} />
                </div>

                <div>
                  <label className={labelCls()}>Stato</label>
                  <select value={form.en.state} onChange={e => setEN('state', e.target.value)} className={inputCls()}>
                    {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls()}>SKU</label>
                  <input type="text" value={form.en.sku} onChange={e => setEN('sku', e.target.value)} className={inputCls()} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls()}>
                    Tags EN — {form.en.tags.split(',').filter(t => t.trim()).length}/13
                  </label>
                  <input type="text" value={form.en.tags} onChange={e => setEN('tags', e.target.value)} placeholder="silk scarf, luxury gift, handmade, ..." className={inputCls()} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls()}>Materials (separati da virgola)</label>
                  <input type="text" value={form.en.materials} onChange={e => setEN('materials', e.target.value)} placeholder="silk, cashmere, ..." className={inputCls()} />
                </div>

                <div>
                  <label className={labelCls()}>Taxonomy ID</label>
                  <input type="number" value={form.en.taxonomy_id} onChange={e => setEN('taxonomy_id', e.target.value)} className={inputCls()} />
                </div>

                <div>
                  <label className={labelCls()}>Who Made</label>
                  <select value={form.en.who_made} onChange={e => setEN('who_made', e.target.value)} className={inputCls()}>
                    {WHO_MADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls()}>When Made</label>
                  <select value={form.en.when_made} onChange={e => setEN('when_made', e.target.value)} className={inputCls()}>
                    {WHEN_MADE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input id="is_supply" type="checkbox" checked={form.en.is_supply} onChange={e => setEN('is_supply', e.target.checked)} className="w-4 h-4 accent-soft-black" />
                  <label htmlFor="is_supply" className="text-sm">È un supply/materiale (non handmade)</label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => save('en')} disabled={saving !== null} className="inline-flex items-center gap-2 px-8 py-2.5 bg-[#F1641E] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4551a] transition-colors disabled:opacity-40">
                  {saving === 'en'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizzo su Etsy…</>
                    : <><Save className="w-3.5 h-3.5" /> Sincronizza EN → Etsy</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* IT fields */}
          {lang === 'it' && (
            <div className="space-y-5">
              <p className="text-xs text-soft-grey bg-ivory border border-pearl-grey/60 px-4 py-2">
                Traduzione italiana: title, description, tags. Gli altri campi (prezzo, qty, stato…) si modificano solo da EN.
              </p>

              <div>
                <label className={labelCls()}>Titolo IT — {form.it.title.length}/140</label>
                <input type="text" value={form.it.title} onChange={e => setIT('title', e.target.value)} className={inputCls()} maxLength={140} />
              </div>

              <div>
                <label className={labelCls()}>Descrizione IT — {form.it.description.length}/4000</label>
                <textarea value={form.it.description} onChange={e => setIT('description', e.target.value)} rows={10} className={inputCls('resize-y')} maxLength={4000} />
              </div>

              <div>
                <label className={labelCls()}>
                  Tags IT — {form.it.tags.split(',').filter(t => t.trim()).length}/13
                </label>
                <input type="text" value={form.it.tags} onChange={e => setIT('tags', e.target.value)} placeholder="foulard di seta, regalo lusso, fatto a mano, ..." className={inputCls()} />
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => save('it')} disabled={saving !== null} className="inline-flex items-center gap-2 px-8 py-2.5 bg-[#F1641E] text-white text-[10px] uppercase tracking-[0.2em] hover:bg-[#d4551a] transition-colors disabled:opacity-40">
                  {saving === 'it'
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizzo su Etsy…</>
                    : <><Save className="w-3.5 h-3.5" /> Sincronizza IT → Etsy</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
