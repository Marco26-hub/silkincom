'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import {
  Pencil, Save, X, Languages, Loader2, Upload, Eye, EyeOff,
} from 'lucide-react';

type I18nMap = Record<string, string>;

type Collection = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean;
  name_i18n: I18nMap;
  tagline_i18n: I18nMap;
  short_name_i18n: I18nMap;
  accent_i18n: I18nMap;
  description_i18n: I18nMap;
};

const LOCALES = ['it', 'en', 'es', 'fr', 'de', 'pt', 'nl'];

export function CollectionsContentManager({ initial }: { initial: Collection[] }) {
  const [collections, setCollections] = useState<Collection[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function reload() {
    const res = await fetch('/api/admin/collections-content');
    if (res.ok) {
      const json = await res.json();
      setCollections(json.collections || []);
    }
    refresh();
  }

  async function toggleActive(c: Collection) {
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/collections-content/${c.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function translate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/collections-content/${id}/translate`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm rounded flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      <p className="text-sm text-soft-grey">{collections.length} collezioni totali · {collections.filter((c) => c.is_active).length} attive</p>

      <div className="space-y-3">
        {collections.map((c) => {
          const localesFilled = LOCALES.filter((l) => c.name_i18n?.[l]);
          return (
            <div key={c.id} className={`border ${c.is_active ? 'border-pearl-grey' : 'border-pearl-grey/40 bg-pearl-grey/10'} bg-white`}>
              <div className="flex gap-4 p-4">
                <div className="relative w-32 h-40 flex-shrink-0 bg-soft-black/5">
                  {c.image_url ? (
                    <Image
                      src={c.image_url}
                      alt={c.name_i18n?.it || c.slug}
                      fill
                      sizes="128px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-soft-grey">#{c.display_order ?? '–'}</span>
                    <span className="text-[10px] uppercase tracking-wider text-soft-grey">/{c.slug}</span>
                    {!c.is_active ? <span className="text-[10px] uppercase tracking-wider text-red-700">Nascosta</span> : null}
                    <span className="text-[10px] uppercase tracking-wider text-soft-grey">{localesFilled.length}/7 lingue</span>
                  </div>
                  <p className="font-display text-xl font-light truncate">{c.name_i18n?.it || c.name || c.slug}</p>
                  {c.accent_i18n?.it ? <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mt-1">{c.accent_i18n.it}</p> : null}
                  <p className="text-xs text-soft-grey mt-2 line-clamp-1">{c.tagline_i18n?.it || ''}</p>
                  <p className="text-xs text-soft-grey mt-1 line-clamp-2">{c.description_i18n?.it || ''}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <IconButton title={c.is_active ? 'Disattiva' : 'Attiva'} onClick={() => toggleActive(c)} disabled={busyId === c.id}>
                    {c.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </IconButton>
                  <IconButton title="Traduci" onClick={() => translate(c.id)} disabled={busyId === c.id}>
                    <Languages className="w-4 h-4" />
                  </IconButton>
                  <IconButton title="Modifica" onClick={() => setEditingId(editingId === c.id ? null : c.id)} disabled={busyId === c.id}>
                    <Pencil className="w-4 h-4" />
                  </IconButton>
                  {busyId === c.id ? <Loader2 className="w-4 h-4 animate-spin text-soft-grey" /> : null}
                </div>
              </div>

              {editingId === c.id ? (
                <EditForm
                  collection={c}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await reload();
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconButton({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-2 hover:bg-pearl-grey/40 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function EditForm({ collection, onCancel, onSaved }: { collection: Collection; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [nameIt, setNameIt] = useState(collection.name_i18n?.it || collection.name || '');
  const [shortIt, setShortIt] = useState(collection.short_name_i18n?.it || '');
  const [accentIt, setAccentIt] = useState(collection.accent_i18n?.it || '');
  const [taglineIt, setTaglineIt] = useState(collection.tagline_i18n?.it || '');
  const [descIt, setDescIt] = useState(collection.description_i18n?.it || collection.description || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/collections-content/${collection.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name_it: nameIt,
          short_name_it: shortIt,
          accent_it: accentIt,
          tagline_it: taglineIt,
          description_it: descIt,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr('Seleziona un file'); return; }
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/collections-content/${collection.id}/image`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-pearl-grey p-5 bg-pearl-grey/10 space-y-4">
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome IT (titolo card)" value={nameIt} onChange={setNameIt} placeholder="Collezione Inverno" />
        <Field label="Short name IT (h3 card)" value={shortIt} onChange={setShortIt} placeholder="Inverno" />
        <Field label="Accent IT (badge)" value={accentIt} onChange={setAccentIt} placeholder="Stagionale" />
        <Field label="Tagline IT" value={taglineIt} onChange={setTaglineIt} placeholder="Calore avvolgente delle fibre nobili" />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Descrizione IT</label>
        <textarea
          value={descIt}
          onChange={(e) => setDescIt(e.target.value)}
          rows={4}
          className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
        />
      </div>

      <div className="border-t border-pearl-grey/40 pt-4">
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-2">Immagine</label>
        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          <button
            type="button"
            onClick={uploadImage}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-soft-black/80 text-warm-white px-3 py-2 text-xs hover:bg-soft-black disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Carica nuova foto
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-pearl-grey/40">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2 text-sm hover:bg-soft-black/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva testi (auto-traduce se IT cambia)
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-pearl-grey">Annulla</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
      />
    </div>
  );
}
