'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import { Save, X, Loader2, Upload, Trash2, Plus, ImageIcon, Download } from 'lucide-react';
import { downloadAdminImage } from '@/lib/download-admin-image';

type I18nMap = Record<string, string>;

type SectionImage = { url: string; storage_path: string; alt_i18n: Record<string, string> };

type Section = {
  id: string;
  section_key: string;
  content_i18n: Record<string, I18nMap>;
  images: SectionImage[];
  social_links: Record<string, string>;
  is_active: boolean;
};

const SECTION_META: Record<string, { title: string; description: string; fields: { name: string; label: string; type: 'input' | 'textarea' }[]; allowsManyImages?: boolean; hasSocials?: boolean }> = {
  announcement_bar: {
    title: 'Barra annunci (top strip rotante)',
    description: 'Fino a 4 messaggi che ruotano in cima a ogni pagina ogni 5 secondi. Lascia vuoto per disattivare uno slot.',
    fields: [
      { name: 'msg1', label: 'Messaggio 1 (es. spedizione gratuita)', type: 'input' },
      { name: 'msg2', label: 'Messaggio 2 (es. confezione regalo)', type: 'input' },
      { name: 'msg3', label: 'Messaggio 3 (es. Made in Como)', type: 'input' },
      { name: 'msg4', label: 'Messaggio 4 (es. resi entro 14 giorni)', type: 'input' },
    ],
  },
  value_props: {
    title: 'Value Props (4 card sotto hero)',
    description: '4 perks brand (icona + titolo + breve descrizione). Icone fisse: Made in Como, Spedizione, Confezione regalo, Resi.',
    fields: [
      { name: 'madeInComoTitle', label: 'Card 1 — Titolo (Made in Como)', type: 'input' },
      { name: 'madeInComoDesc', label: 'Card 1 — Descrizione', type: 'input' },
      { name: 'shippingTitle', label: 'Card 2 — Titolo (Spedizione)', type: 'input' },
      { name: 'shippingDesc', label: 'Card 2 — Descrizione', type: 'input' },
      { name: 'giftBoxTitle', label: 'Card 3 — Titolo (Confezione regalo)', type: 'input' },
      { name: 'giftBoxDesc', label: 'Card 3 — Descrizione', type: 'input' },
      { name: 'returnsTitle', label: 'Card 4 — Titolo (Resi)', type: 'input' },
      { name: 'returnsDesc', label: 'Card 4 — Descrizione', type: 'input' },
    ],
  },
  brand_story: {
    title: 'Brand Story (storia maison)',
    description: 'Riquadro con foto principale + tile + testo. Tutti i campi i18n.',
    fields: [
      { name: 'eyebrow', label: 'Eyebrow (etichetta sopra titolo)', type: 'input' },
      { name: 'titlePlain', label: 'Titolo riga 1', type: 'input' },
      { name: 'titleAccent', label: 'Titolo riga 2 (corsivo oro)', type: 'input' },
      { name: 'paragraph1', label: 'Paragrafo 1', type: 'textarea' },
      { name: 'paragraph2', label: 'Paragrafo 2', type: 'textarea' },
      { name: 'cta', label: 'Testo CTA', type: 'input' },
      { name: 'quote', label: 'Citazione', type: 'input' },
      { name: 'quoteAuthor', label: 'Autore citazione', type: 'input' },
      { name: 'imageMainAlt', label: 'Alt immagine principale', type: 'input' },
      { name: 'imageTileAlt', label: 'Alt immagine tile', type: 'input' },
    ],
  },
  editorial_banner: {
    title: 'Editorial Banner (atelier privato)',
    description: 'Banner parallax full-width con foto background.',
    fields: [
      { name: 'eyebrow', label: 'Eyebrow', type: 'input' },
      { name: 'titlePlain', label: 'Titolo riga 1', type: 'input' },
      { name: 'titleAccent', label: 'Titolo riga 2 (corsivo oro)', type: 'input' },
      { name: 'description', label: 'Descrizione', type: 'textarea' },
      { name: 'cta', label: 'Testo CTA', type: 'input' },
    ],
  },
  instagram_feed: {
    title: 'Instagram Feed (galleria social)',
    description: 'Griglia foto + link ai social. Carica/elimina foto singole.',
    fields: [
      { name: 'titleStart', label: 'Titolo inizio', type: 'input' },
      { name: 'titleEmphasis', label: 'Titolo enfasi (corsivo oro)', type: 'input' },
      { name: 'description', label: 'Descrizione', type: 'textarea' },
      { name: 'followEyebrow', label: 'Etichetta "seguici"', type: 'input' },
    ],
    allowsManyImages: true,
    hasSocials: true,
  },
};

export function HomeSectionsManager({ initial }: { initial: Section[] }) {
  const [sections, setSections] = useState<Section[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function reload() {
    const res = await fetch('/api/admin/home-sections');
    if (res.ok) {
      const json = await res.json();
      setSections(json.sections || []);
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm rounded flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      {sections.map((s) => {
        const meta = SECTION_META[s.section_key];
        if (!meta) return null;
        return (
          <SectionEditor
            key={s.id}
            section={s}
            meta={meta}
            onError={setError}
            onReload={reload}
          />
        );
      })}
    </div>
  );
}

function SectionEditor({ section, meta, onError, onReload }: { section: Section; meta: typeof SECTION_META[string]; onError: (e: string) => void; onReload: () => Promise<void> }) {
  const initialIt: Record<string, string> = {};
  for (const f of meta.fields) initialIt[f.name] = section.content_i18n?.[f.name]?.it || '';
  const [contentIt, setContentIt] = useState<Record<string, string>>(initialIt);
  const [socials, setSocials] = useState<Record<string, string>>({
    instagram: section.social_links?.instagram || '',
    facebook: section.social_links?.facebook || '',
    pinterest: section.social_links?.pinterest || '',
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<{ idx: number; input: HTMLInputElement | null }>({ idx: -1, input: null });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/home-sections/${section.section_key}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content_it: contentIt,
          ...(meta.hasSocials ? { social_links: socials } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onReload();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File, replaceIndex?: number) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = `/api/admin/home-sections/${section.section_key}/image${replaceIndex != null && replaceIndex >= 0 ? `?index=${replaceIndex}` : ''}`;
      const res = await fetch(url, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onReload();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function removeImage(index: number) {
    if (!confirm('Eliminare questa immagine?')) return;
    try {
      const res = await fetch(`/api/admin/home-sections/${section.section_key}/image?index=${index}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onReload();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  return (
    <div className="border border-pearl-grey bg-white">
      <div className="px-5 py-4 border-b border-pearl-grey/60 bg-pearl-grey/10">
        <h2 className="font-display text-xl">{meta.title}</h2>
        <p className="text-xs text-soft-grey mt-1">{meta.description}</p>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-soft-grey mb-2">Immagini ({section.images.length})</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {section.images.map((img, i) => (
              <div key={i} className="relative aspect-square bg-pearl-grey/20 border border-pearl-grey group">
                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-soft-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer p-2 bg-warm-white text-soft-black hover:bg-gold-primary hover:text-warm-white" title="Sostituisci">
                    <ImageIcon className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f, i);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => downloadAdminImage({ url: img.url, storagePath: img.storage_path, title: img.alt_i18n?.it || meta.title })}
                    className="p-2 bg-warm-white text-soft-black hover:bg-gold-primary hover:text-warm-white"
                    title="Scarica originale"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="p-2 bg-warm-white text-red-700 hover:bg-red-700 hover:text-warm-white"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {meta.allowsManyImages || section.images.length < (section.section_key === 'brand_story' ? 2 : 1) ? (
              <label className="aspect-square border-2 border-dashed border-pearl-grey flex items-center justify-center cursor-pointer hover:border-gold-primary hover:bg-pearl-grey/20 text-soft-grey hover:text-gold-primary transition-colors">
                <Plus className="w-6 h-6" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                    e.target.value = '';
                  }}
                />
              </label>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-pearl-grey/40">
          {meta.fields.map((f) => (
            <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">{f.label} (IT)</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={contentIt[f.name] || ''}
                  onChange={(e) => setContentIt({ ...contentIt, [f.name]: e.target.value })}
                  rows={3}
                  className="w-full border border-pearl-grey px-3 py-2 text-sm"
                />
              ) : (
                <input
                  type="text"
                  value={contentIt[f.name] || ''}
                  onChange={(e) => setContentIt({ ...contentIt, [f.name]: e.target.value })}
                  className="w-full border border-pearl-grey px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        {meta.hasSocials ? (
          <div className="pt-4 border-t border-pearl-grey/40">
            <label className="block text-xs uppercase tracking-wider text-soft-grey mb-2">Link social</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="url"
                value={socials.instagram}
                onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                placeholder="https://www.instagram.com/..."
                className="border border-pearl-grey px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={socials.facebook}
                onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                placeholder="https://www.facebook.com/..."
                className="border border-pearl-grey px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={socials.pinterest}
                onChange={(e) => setSocials({ ...socials, pinterest: e.target.value })}
                placeholder="https://www.pinterest.com/..."
                className="border border-pearl-grey px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        <div className="pt-3 border-t border-pearl-grey/40">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2 text-sm hover:bg-soft-black/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva (auto-traduce se IT cambia)
          </button>
        </div>
      </div>
    </div>
  );
}
