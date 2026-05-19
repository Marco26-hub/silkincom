'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number | null;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

const empty: Partial<Collection> = {
  name: '', slug: '', description: '', image_url: '',
  display_order: undefined, is_active: true, seo_title: '', seo_description: '',
};

export default function AdminCollezioniPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Collection>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('collections')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });
    setCollections((data as Collection[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Collection) {
    setEditing(c);
    setCreating(false);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image_url: c.image_url || '',
      display_order: c.display_order ?? undefined,
      is_active: c.is_active,
      seo_title: c.seo_title || '',
      seo_description: c.seo_description || '',
    });
    setError(null);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm(empty);
    setError(null);
  }

  function cancel() {
    setCreating(false);
    setEditing(null);
    setForm(empty);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      description: form.description || null,
      image_url: form.image_url || null,
      display_order: form.display_order ?? null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/collections/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      }
      cancel();
      load();
    } catch (err: any) {
      setError(err?.message || 'Errore');
    }
    setSaving(false);
  }

  async function toggle(c: Collection) {
    await fetch(`/api/admin/collections/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    load();
  }

  async function remove(c: Collection) {
    if (!confirm(`Eliminare collezione ${c.name}?`)) return;
    await fetch(`/api/admin/collections/${c.id}`, { method: 'DELETE' });
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Collezioni</h1>
          <p className="text-soft-grey text-sm">{collections.length} collezioni</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuova collezione' : `Modifica ${editing!.name}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="Nome" value={form.name || ''} onChange={(v) => setForm({ ...form, name: v })} required />
            <Inp label="Slug" value={form.slug || ''} onChange={(v) => setForm({ ...form, slug: v })} required />
            <Inp label="Ordine" type="number" value={form.display_order ?? ''} onChange={(v) => setForm({ ...form, display_order: v ? Number(v) : undefined })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Descrizione</label>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={cls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="URL immagine" value={form.image_url || ''} onChange={(v) => setForm({ ...form, image_url: v })} />
            <Inp label="SEO title" value={form.seo_title || ''} onChange={(v) => setForm({ ...form, seo_title: v })} />
            <Inp label="SEO description" value={form.seo_description || ''} onChange={(v) => setForm({ ...form, seo_description: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-gold-primary" />
            Attivo
          </label>
          {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button type="button" onClick={cancel} className="px-8 py-2.5 border border-soft-black/30 text-[10px] uppercase tracking-[0.2em]">Annulla</button>
          </div>
        </form>
      )}

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Immagine</th>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium text-right">Ordine</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : collections.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Nessuna collezione</td></tr>
            ) : collections.map((c) => (
              <tr key={c.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3">
                  {c.image_url
                    ? <img src={c.image_url} alt={c.name} className="w-10 h-10 object-cover border border-pearl-grey" />
                    : <span className="text-soft-grey text-xs">—</span>}
                </td>
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3 font-mono text-xs">{c.slug}</td>
                <td className="px-5 py-3 text-right text-xs">{c.display_order ?? '—'}</td>
                <td className="px-5 py-3">
                  <button onClick={() => toggle(c)} title={c.is_active ? 'Disattiva' : 'Attiva'}>
                    {c.is_active
                      ? <ToggleRight className="w-5 h-5 text-green-600" />
                      : <ToggleLeft className="w-5 h-5 text-soft-grey" />
                    }
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(c)} className="p-1.5 hover:bg-pearl-grey rounded" title="Modifica">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(c)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cls = 'w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black';

function Inp({ label, value, onChange, required, type = 'text', step }: {
  label: string; value: string | number; onChange: (v: string) => void;
  required?: boolean; type?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">{label}</label>
      <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} required={required} className={cls} />
    </div>
  );
}
