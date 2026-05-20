'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import {
  Save, X, Loader2, Plus, Trash2, ArrowUp, ArrowDown, ImageIcon,
} from 'lucide-react';

type I18nMap = Record<string, string>;

type Block = {
  id: string;
  type: 'hero' | 'section' | 'image-text' | 'gallery' | 'cta' | 'quote' | 'list' | 'faq';
  [key: string]: unknown;
};

type PageRow = {
  id: string;
  page_key: string;
  title_i18n: I18nMap;
  meta_title_i18n: I18nMap;
  meta_description_i18n: I18nMap;
  blocks: Block[];
  images: Array<{ url: string; storage_path: string; alt_i18n?: I18nMap }>;
  is_active: boolean;
};

const PAGE_LABELS: Record<string, string> = {
  'la-nostra-storia': 'La nostra storia',
  'atelier': 'Atelier — Su misura',
  'b2b': 'B2B',
  'artigiani': 'I nostri artigiani',
  'press': 'Press Room',
  'faq': 'FAQ',
  'maison-marco-dibenedetto': 'Maison · Marco Dibenedetto',
  'cura-prodotto': 'Cura del prodotto',
};

const BLOCK_TYPE_LABELS: Record<Block['type'], string> = {
  hero: 'Hero (eyebrow + titolo + sottotitolo + foto)',
  section: 'Sezione (titolo + paragrafo)',
  'image-text': 'Immagine + testo',
  gallery: 'Galleria immagini',
  cta: 'CTA (pulsante)',
  quote: 'Citazione',
  list: 'Lista bullet',
  faq: 'FAQ (Q+A list)',
};

function uid() { return Math.random().toString(36).slice(2, 11); }

function makeEmpty(type: Block['type']): Block {
  const id = uid();
  switch (type) {
    case 'hero': return { id, type, eyebrow_i18n: { it: '' }, title_i18n: { it: '' }, accent_i18n: { it: '' }, subtitle_i18n: { it: '' }, image_url: '' };
    case 'section': return { id, type, title_i18n: { it: '' }, body_i18n: { it: '' } };
    case 'image-text': return { id, type, title_i18n: { it: '' }, body_i18n: { it: '' }, image_url: '', image_position: 'left' };
    case 'gallery': return { id, type, images: [] };
    case 'cta': return { id, type, text_i18n: { it: '' }, href: '/', variant: 'primary' };
    case 'quote': return { id, type, quote_i18n: { it: '' }, author_i18n: { it: '' } };
    case 'list': return { id, type, title_i18n: { it: '' }, items_i18n: [{ it: '' }] };
    case 'faq': return { id, type, title_i18n: { it: '' }, items: [{ q_i18n: { it: '' }, a_i18n: { it: '' } }] };
  }
}

export function StaticPagesManager({ initial }: { initial: PageRow[] }) {
  const [pages, setPages] = useState<PageRow[]>(initial);
  const [activeKey, setActiveKey] = useState<string | null>(initial[0]?.page_key ?? null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() { startTransition(() => router.refresh()); }

  async function reload() {
    const res = await fetch('/api/admin/static-pages');
    if (res.ok) {
      const j = await res.json();
      setPages(j.pages || []);
    }
    refresh();
  }

  const active = pages.find((p) => p.page_key === activeKey) || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <aside className="border border-pearl-grey bg-white p-3 h-fit lg:sticky lg:top-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2 px-2">Pagine</p>
        <nav className="flex flex-col gap-1">
          {pages.map((p) => (
            <button
              key={p.page_key}
              type="button"
              onClick={() => setActiveKey(p.page_key)}
              className={`text-left px-3 py-2 text-sm transition-colors ${
                activeKey === p.page_key ? 'bg-soft-black text-warm-white' : 'text-soft-black hover:bg-pearl-grey/40'
              }`}
            >
              <div className="font-medium">{PAGE_LABELS[p.page_key] || p.page_key}</div>
              <div className="text-[10px] opacity-60 mt-0.5">/{p.page_key}</div>
            </button>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        {error ? (
          <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm rounded flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        ) : null}

        {active ? (
          <PageEditor key={active.id} page={active} onError={setError} onSaved={reload} />
        ) : (
          <p className="text-soft-grey text-sm">Seleziona una pagina dalla sidebar.</p>
        )}
      </div>
    </div>
  );
}

function PageEditor({ page, onError, onSaved }: { page: PageRow; onError: (e: string | null) => void; onSaved: () => Promise<void> }) {
  const [titleIt, setTitleIt] = useState(page.title_i18n?.it || '');
  const [metaTitleIt, setMetaTitleIt] = useState(page.meta_title_i18n?.it || '');
  const [metaDescIt, setMetaDescIt] = useState(page.meta_description_i18n?.it || '');
  const [blocks, setBlocks] = useState<Block[]>(page.blocks || []);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  async function save() {
    setBusy(true);
    onError(null);
    try {
      const payloadBlocks = blocks.map((b) => stripI18nToIt(b));
      const res = await fetch(`/api/admin/static-pages/${page.page_key}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title_it: titleIt,
          meta_title_it: metaTitleIt,
          meta_description_it: metaDescIt,
          blocks: payloadBlocks,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onSaved();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[j]] = [next[j], next[idx]];
    setBlocks(next);
  }
  function removeBlock(idx: number) {
    if (!confirm('Eliminare questo blocco?')) return;
    setBlocks(blocks.filter((_, i) => i !== idx));
  }
  function addBlock(type: Block['type']) {
    setBlocks([...blocks, makeEmpty(type)]);
    setAddOpen(false);
  }
  function updateBlock(idx: number, patch: Partial<Block>) {
    setBlocks(blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  return (
    <div className="space-y-6">
      <section className="border border-pearl-grey bg-white p-5 space-y-3">
        <div>
          <h2 className="font-display text-2xl">/{page.page_key}</h2>
          <p className="text-[10px] uppercase tracking-wider text-soft-grey mt-0.5">URL pagina</p>
        </div>
        <Field label="Titolo pagina (h1) IT" value={titleIt} onChange={setTitleIt} />
        <Field label="SEO title (tag <title>) IT" value={metaTitleIt} onChange={setMetaTitleIt} />
        <TextArea label="SEO description (meta description) IT" value={metaDescIt} onChange={setMetaDescIt} rows={2} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Blocchi contenuto ({blocks.length})</h3>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddOpen(!addOpen)}
              className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi blocco
            </button>
            {addOpen ? (
              <div className="absolute right-0 mt-1 z-10 bg-white border border-pearl-grey shadow-lg w-72">
                {(Object.keys(BLOCK_TYPE_LABELS) as Block['type'][]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addBlock(t)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-pearl-grey/40 border-b border-pearl-grey/40 last:border-b-0"
                  >
                    {BLOCK_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {blocks.length === 0 ? (
          <p className="text-center text-sm text-soft-grey py-12 border border-dashed border-pearl-grey">
            Nessun blocco. Clicca &quot;Aggiungi blocco&quot; per iniziare.
          </p>
        ) : null}

        {blocks.map((b, i) => (
          <BlockEditor
            key={b.id}
            block={b}
            index={i}
            total={blocks.length}
            pageKey={page.page_key}
            onChange={(patch) => updateBlock(i, patch)}
            onMoveUp={() => moveBlock(i, -1)}
            onMoveDown={() => moveBlock(i, 1)}
            onRemove={() => removeBlock(i)}
            onError={onError}
          />
        ))}
      </section>

      <div className="sticky bottom-0 bg-warm-white border-t border-pearl-grey py-4 -mx-4 px-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-6 py-3 text-xs uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva pagina (auto-traduce 7 lingue)
        </button>
      </div>
    </div>
  );
}

function BlockEditor({
  block, index, total, pageKey, onChange, onMoveUp, onMoveDown, onRemove, onError,
}: {
  block: Block;
  index: number;
  total: number;
  pageKey: string;
  onChange: (patch: Partial<Block>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onError: (e: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    onError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/static-pages/${pageKey}/image`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const j = await res.json();
      return j.image.url as string;
    } catch (e) {
      onError((e as Error).message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  const i18nGet = (key: string) => ((block[key + '_i18n'] as I18nMap | undefined)?.it ?? '');
  const i18nSet = (key: string, v: string) => onChange({ [key + '_i18n']: { ...((block[key + '_i18n'] as I18nMap) || {}), it: v } } as Partial<Block>);

  return (
    <div className="border border-pearl-grey bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-pearl-grey bg-pearl-grey/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">#{index + 1}</span>
          <span className="text-xs uppercase tracking-[0.15em] font-medium">{BLOCK_TYPE_LABELS[block.type]}</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                const url = await uploadImage(f);
                if (url) onChange({ image_url: url });
              }
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <button type="button" title="Su" onClick={onMoveUp} disabled={index === 0} className="p-1.5 hover:bg-pearl-grey/40 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
          <button type="button" title="Giù" onClick={onMoveDown} disabled={index === total - 1} className="p-1.5 hover:bg-pearl-grey/40 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
          <button type="button" title="Elimina" onClick={onRemove} className="p-1.5 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-700" /></button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {block.type === 'hero' && (
          <>
            <Field label="Eyebrow IT" value={i18nGet('eyebrow')} onChange={(v) => i18nSet('eyebrow', v)} />
            <Field label="Titolo IT" value={i18nGet('title')} onChange={(v) => i18nSet('title', v)} />
            <Field label="Accent IT (corsivo oro)" value={i18nGet('accent')} onChange={(v) => i18nSet('accent', v)} />
            <TextArea label="Sottotitolo IT" value={i18nGet('subtitle')} onChange={(v) => i18nSet('subtitle', v)} />
            <ImageField label="Foto hero" url={block.image_url as string} onUpload={() => fileRef.current?.click()} onClear={() => onChange({ image_url: '' })} uploading={uploading} />
          </>
        )}
        {block.type === 'section' && (
          <>
            <Field label="Titolo IT" value={i18nGet('title')} onChange={(v) => i18nSet('title', v)} />
            <TextArea label="Body IT" value={i18nGet('body')} onChange={(v) => i18nSet('body', v)} rows={5} />
          </>
        )}
        {block.type === 'image-text' && (
          <>
            <Field label="Titolo IT" value={i18nGet('title')} onChange={(v) => i18nSet('title', v)} />
            <TextArea label="Body IT" value={i18nGet('body')} onChange={(v) => i18nSet('body', v)} rows={4} />
            <ImageField label="Foto" url={block.image_url as string} onUpload={() => fileRef.current?.click()} onClear={() => onChange({ image_url: '' })} uploading={uploading} />
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-soft-grey mb-1">Posizione immagine</label>
              <select value={(block.image_position as string) ?? 'left'} onChange={(e) => onChange({ image_position: e.target.value as 'left' | 'right' })} className="px-3 py-2 text-sm border border-pearl-grey">
                <option value="left">Sinistra</option>
                <option value="right">Destra</option>
              </select>
            </div>
          </>
        )}
        {block.type === 'cta' && (
          <>
            <Field label="Testo IT" value={i18nGet('text')} onChange={(v) => i18nSet('text', v)} />
            <Field label="Link (href)" value={(block.href as string) ?? ''} onChange={(v) => onChange({ href: v })} placeholder="/contatti" />
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-soft-grey mb-1">Stile</label>
              <select value={(block.variant as string) ?? 'primary'} onChange={(e) => onChange({ variant: e.target.value as 'primary' | 'secondary' })} className="px-3 py-2 text-sm border border-pearl-grey">
                <option value="primary">Primario (pieno)</option>
                <option value="secondary">Secondario (bordo)</option>
              </select>
            </div>
          </>
        )}
        {block.type === 'quote' && (
          <>
            <TextArea label="Citazione IT" value={i18nGet('quote')} onChange={(v) => i18nSet('quote', v)} />
            <Field label="Autore IT" value={i18nGet('author')} onChange={(v) => i18nSet('author', v)} />
          </>
        )}
        {block.type === 'list' && (
          <>
            <Field label="Titolo lista IT" value={i18nGet('title')} onChange={(v) => i18nSet('title', v)} />
            <ListItemsEditor items={(block.items_i18n as Array<I18nMap>) || []} onChange={(v) => onChange({ items_i18n: v })} />
          </>
        )}
        {block.type === 'faq' && (
          <>
            <Field label="Titolo sezione FAQ IT" value={i18nGet('title')} onChange={(v) => i18nSet('title', v)} />
            <FaqItemsEditor items={(block.items as Array<{ q_i18n?: I18nMap; a_i18n?: I18nMap }>) || []} onChange={(v) => onChange({ items: v })} />
          </>
        )}
        {block.type === 'gallery' && (
          <GalleryEditor
            images={(block.images as Array<{ url: string; caption_i18n?: I18nMap }>) || []}
            onChange={(v) => onChange({ images: v })}
            onUpload={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/jpeg,image/png,image/webp';
              input.onchange = async () => {
                const f = input.files?.[0];
                if (f) {
                  const url = await uploadImage(f);
                  if (url) {
                    const imgs = (block.images as Array<{ url: string; caption_i18n?: I18nMap }>) || [];
                    onChange({ images: [...imgs, { url, caption_i18n: { it: '' } }] });
                  }
                }
              };
              input.click();
            }}
            uploading={uploading}
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 text-sm border border-pearl-grey" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full px-3 py-2 text-sm border border-pearl-grey" />
    </div>
  );
}

function ImageField({ label, url, onUpload, onClear, uploading }: { label: string; url?: string; onUpload: () => void; onClear: () => void; uploading: boolean }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {url ? (
          <div className="relative w-24 h-24 border border-pearl-grey bg-soft-black/5">
            <Image src={url} alt="" fill sizes="96px" className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-24 h-24 border border-dashed border-pearl-grey flex items-center justify-center text-soft-grey">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button type="button" onClick={onUpload} disabled={uploading} className="text-xs px-3 py-1.5 border border-pearl-grey hover:border-soft-black disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Carica/sostituisci'}
          </button>
          {url ? <button type="button" onClick={onClear} className="text-xs px-3 py-1.5 text-red-700 hover:underline">Rimuovi</button> : null}
        </div>
      </div>
    </div>
  );
}

function ListItemsEditor({ items, onChange }: { items: I18nMap[]; onChange: (v: I18nMap[]) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">Voci (IT)</p>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input type="text" value={it.it ?? ''} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, it: e.target.value } : x))} className="flex-1 px-3 py-2 text-sm border border-pearl-grey" />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 text-red-700 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { it: '' }])} className="text-xs underline text-soft-grey hover:text-soft-black">+ aggiungi voce</button>
    </div>
  );
}

function FaqItemsEditor({ items, onChange }: { items: Array<{ q_i18n?: I18nMap; a_i18n?: I18nMap }>; onChange: (v: Array<{ q_i18n?: I18nMap; a_i18n?: I18nMap }>) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">FAQ items (IT)</p>
      {items.map((it, i) => (
        <div key={i} className="border border-pearl-grey/60 p-3 space-y-2 relative">
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
          <input type="text" placeholder="Domanda" value={it.q_i18n?.it ?? ''} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, q_i18n: { ...(x.q_i18n || {}), it: e.target.value } } : x))} className="w-full px-3 py-2 text-sm border border-pearl-grey" />
          <textarea placeholder="Risposta" value={it.a_i18n?.it ?? ''} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, a_i18n: { ...(x.a_i18n || {}), it: e.target.value } } : x))} rows={3} className="w-full px-3 py-2 text-sm border border-pearl-grey" />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { q_i18n: { it: '' }, a_i18n: { it: '' } }])} className="text-xs underline text-soft-grey hover:text-soft-black">+ aggiungi FAQ</button>
    </div>
  );
}

function GalleryEditor({ images, onChange, onUpload, uploading }: { images: Array<{ url: string; caption_i18n?: I18nMap }>; onChange: (v: Array<{ url: string; caption_i18n?: I18nMap }>) => void; onUpload: () => void; uploading: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Immagini galleria</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative aspect-square border border-pearl-grey bg-soft-black/5 group">
            {img.url ? <Image src={img.url} alt="" fill sizes="120px" className="object-cover" unoptimized /> : null}
            <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-warm-white text-red-700 p-1 opacity-0 group-hover:opacity-100">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button type="button" onClick={onUpload} disabled={uploading} className="aspect-square border border-dashed border-pearl-grey hover:border-soft-black flex items-center justify-center text-soft-grey">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/**
 * Walk a block and convert *_i18n.it values into matching *_it keys so the
 * API route's autoTranslateBlocks helper picks them up. The full _i18n
 * payload is preserved so unchanged-IT short-circuits in the API.
 */
function stripI18nToIt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripI18nToIt);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.endsWith('_i18n') && v && typeof v === 'object') {
        const map = v as I18nMap;
        const itValue = map.it ?? '';
        const base = k.slice(0, -5);
        out[base + '_it'] = itValue;
        out[k] = map;
      } else {
        out[k] = stripI18nToIt(v);
      }
    }
    return out;
  }
  return value;
}
