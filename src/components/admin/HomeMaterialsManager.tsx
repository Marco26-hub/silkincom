'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import { Save, X, Loader2, ImageIcon, Pencil, Eye, EyeOff } from 'lucide-react';

type I18nMap = Record<string, string>;

type Material = {
  id: string;
  slug: string;
  code: string | null;
  href: string | null;
  image_url: string | null;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean;
  name_i18n: I18nMap;
  description_i18n: I18nMap;
  origin_title_i18n: I18nMap;
  origin_body_i18n: I18nMap;
  characteristics_title_i18n: I18nMap;
  characteristics_body_i18n: I18nMap;
  benefit_title_i18n: I18nMap;
  benefit_body_i18n: I18nMap;
};

export function HomeMaterialsManager({ initial }: { initial: Material[] }) {
  const [materials, setMaterials] = useState<Material[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function reload() {
    const res = await fetch('/api/admin/home-materials');
    if (res.ok) {
      const json = await res.json();
      setMaterials(json.materials || []);
    }
    startTransition(() => router.refresh());
  }

  async function toggleActive(m: Material) {
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/home-materials/${m.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_active: !m.is_active }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function replaceImage(id: string, file: File) {
    setBusyId(id);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/home-materials/${id}/image`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm rounded flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      {materials.map((m) => (
        <MaterialRow
          key={m.id}
          material={m}
          busy={busyId === m.id}
          isEditing={editingId === m.id}
          onToggleActive={() => toggleActive(m)}
          onReplaceImage={(f) => replaceImage(m.id, f)}
          onEdit={() => setEditingId(editingId === m.id ? null : m.id)}
          onSaved={async () => {
            setEditingId(null);
            await reload();
          }}
        />
      ))}
    </div>
  );
}

function MaterialRow({
  material: m,
  busy,
  isEditing,
  onToggleActive,
  onReplaceImage,
  onEdit,
  onSaved,
}: {
  material: Material;
  busy: boolean;
  isEditing: boolean;
  onToggleActive: () => void;
  onReplaceImage: (f: File) => void;
  onEdit: () => void;
  onSaved: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`border ${m.is_active ? 'border-pearl-grey' : 'border-pearl-grey/40 bg-pearl-grey/10'} bg-white`}>
      <div className="flex gap-4 p-4">
        <div className="relative w-28 h-28 flex-shrink-0 bg-soft-black/5">
          {m.image_url ? (
            <Image src={m.image_url} alt={m.name_i18n?.it || ''} fill sizes="112px" className="object-cover" unoptimized />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-soft-grey">({m.code})</span>
            <span className="text-[10px] uppercase tracking-wider text-soft-grey">/{m.slug}</span>
            {!m.is_active ? <span className="text-[10px] uppercase tracking-wider text-red-700">Nascosto</span> : null}
          </div>
          <p className="font-display text-xl font-light truncate">{m.name_i18n?.it || m.slug}</p>
          <p className="text-xs text-soft-grey line-clamp-2 mt-1">{m.description_i18n?.it || ''}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplaceImage(f);
              e.target.value = '';
            }}
          />
          <button type="button" title={m.is_active ? 'Disattiva' : 'Attiva'} onClick={onToggleActive} disabled={busy}
            className="p-2 hover:bg-pearl-grey/40 disabled:opacity-30">
            {m.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button type="button" title="Cambia foto" onClick={() => fileRef.current?.click()} disabled={busy}
            className="p-2 hover:bg-pearl-grey/40 disabled:opacity-30">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button type="button" title="Modifica testi" onClick={onEdit} disabled={busy}
            className="p-2 hover:bg-pearl-grey/40 disabled:opacity-30">
            <Pencil className="w-4 h-4" />
          </button>
          {busy ? <Loader2 className="w-4 h-4 animate-spin text-soft-grey" /> : null}
        </div>
      </div>

      {isEditing ? <MaterialEditForm material={m} onCancel={onEdit} onSaved={onSaved} /> : null}
    </div>
  );
}

function MaterialEditForm({ material: m, onCancel, onSaved }: { material: Material; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [vals, setVals] = useState({
    name_it: m.name_i18n?.it || '',
    description_it: m.description_i18n?.it || '',
    origin_title_it: m.origin_title_i18n?.it || '',
    origin_body_it: m.origin_body_i18n?.it || '',
    characteristics_title_it: m.characteristics_title_i18n?.it || '',
    characteristics_body_it: m.characteristics_body_i18n?.it || '',
    benefit_title_it: m.benefit_title_i18n?.it || '',
    benefit_body_it: m.benefit_body_i18n?.it || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/home-materials/${m.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vals),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      await onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof vals, label: string, type: 'input' | 'textarea' = 'input') {
    return (
      <div className={type === 'textarea' ? 'md:col-span-2' : ''}>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">{label} (IT)</label>
        {type === 'textarea' ? (
          <textarea
            value={vals[key]}
            onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
            rows={3}
            className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
          />
        ) : (
          <input
            type="text"
            value={vals[key]}
            onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
            className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
          />
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-pearl-grey p-5 bg-pearl-grey/10 space-y-4">
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('name_it', 'Nome materiale')}
        {field('description_it', 'Descrizione breve')}
      </div>

      <p className="text-[11px] uppercase tracking-[0.25em] text-gold-primary pt-2">Tab Origine</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('origin_title_it', 'Titolo origine')}
        {field('origin_body_it', 'Body origine', 'textarea')}
      </div>

      <p className="text-[11px] uppercase tracking-[0.25em] text-gold-primary pt-2">Tab Caratteristiche</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('characteristics_title_it', 'Titolo caratteristiche')}
        {field('characteristics_body_it', 'Body caratteristiche', 'textarea')}
      </div>

      <p className="text-[11px] uppercase tracking-[0.25em] text-gold-primary pt-2">Tab Beneficio</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field('benefit_title_it', 'Titolo beneficio')}
        {field('benefit_body_it', 'Body beneficio', 'textarea')}
      </div>

      <div className="flex gap-2 pt-3 border-t border-pearl-grey/40">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2 text-sm hover:bg-soft-black/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva (auto-traduce se IT cambia)
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-pearl-grey">Annulla</button>
      </div>
    </div>
  );
}
