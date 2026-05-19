'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Material = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  origin: string | null;
  characteristics: string | null;
  benefits: string | null;
  image_url: string | null;
  display_order: number | null;
  seo_title: string | null;
  seo_description: string | null;
};

const empty: Partial<Material> = {
  name: '', code: '', description: '', origin: '', characteristics: '',
  benefits: '', image_url: '', display_order: undefined, seo_title: '', seo_description: '',
};

export default function AdminMaterialiPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Material | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Material>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('materials')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });
    setMaterials((data as Material[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(m: Material) {
    setEditing(m);
    setCreating(false);
    setForm({
      name: m.name,
      code: m.code || '',
      description: m.description || '',
      origin: m.origin || '',
      characteristics: m.characteristics || '',
      benefits: m.benefits || '',
      image_url: m.image_url || '',
      display_order: m.display_order ?? undefined,
      seo_title: m.seo_title || '',
      seo_description: m.seo_description || '',
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
      code: form.code || null,
      description: form.description || null,
      origin: form.origin || null,
      characteristics: form.characteristics || null,
      benefits: form.benefits || null,
      image_url: form.image_url || null,
      display_order: form.display_order ?? null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/materials/${editing.id}`, {
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

  async function remove(m: Material) {
    if (!confirm(`Eliminare materiale ${m.name}?`)) return;
    await fetch(`/api/admin/materials/${m.id}`, { method: 'DELETE' });
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Materiali</h1>
          <p className="text-soft-grey text-sm">{materials.length} materiali</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuovo materiale' : `Modifica ${editing!.name}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="Nome" value={form.name || ''} onChange={(v) => setForm({ ...form, name: v })} required />
            <Inp label="Codice" value={form.code || ''} onChange={(v) => setForm({ ...form, code: v })} />
            <Inp label="Origine" value={form.origin || ''} onChange={(v) => setForm({ ...form, origin: v })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Descrizione</label>
            <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={cls} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Caratteristiche</label>
            <textarea value={form.characteristics || ''} onChange={(e) => setForm({ ...form, characteristics: e.target.value })} rows={3} className={cls} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Benefici</label>
            <textarea value={form.benefits || ''} onChange={(e) => setForm({ ...form, benefits: e.target.value })} rows={3} className={cls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="URL immagine" value={form.image_url || ''} onChange={(v) => setForm({ ...form, image_url: v })} />
            <Inp label="Ordine" type="number" value={form.display_order ?? ''} onChange={(v) => setForm({ ...form, display_order: v ? Number(v) : undefined })} />
            <Inp label="SEO title" value={form.seo_title || ''} onChange={(v) => setForm({ ...form, seo_title: v })} />
          </div>
          <Inp label="SEO description" value={form.seo_description || ''} onChange={(v) => setForm({ ...form, seo_description: v })} />
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
              <th className="px-5 py-3 font-medium">Codice</th>
              <th className="px-5 py-3 font-medium">Origine</th>
              <th className="px-5 py-3 font-medium text-right">Ordine</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Nessun materiale</td></tr>
            ) : materials.map((m) => (
              <tr key={m.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3">
                  {m.image_url
                    ? <img src={m.image_url} alt={m.name} className="w-10 h-10 object-cover border border-pearl-grey" />
                    : <span className="text-soft-grey text-xs">—</span>}
                </td>
                <td className="px-5 py-3 font-medium">{m.name}</td>
                <td className="px-5 py-3 font-mono text-xs">{m.code || '—'}</td>
                <td className="px-5 py-3 text-xs">{m.origin || '—'}</td>
                <td className="px-5 py-3 text-right text-xs">{m.display_order ?? '—'}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(m)} className="p-1.5 hover:bg-pearl-grey rounded" title="Modifica">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(m)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
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
