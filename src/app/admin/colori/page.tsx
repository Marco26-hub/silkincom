'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Color = {
  id: string;
  name: string;
  hex_code: string;
  image_url: string | null;
  display_order: number | null;
};

const empty: Partial<Color> = {
  name: '', hex_code: '#000000', image_url: '', display_order: undefined,
};

export default function AdminColoriPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Color | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Color>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('colors')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });
    setColors((data as Color[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Color) {
    setEditing(c);
    setCreating(false);
    setForm({
      name: c.name,
      hex_code: c.hex_code,
      image_url: c.image_url || '',
      display_order: c.display_order ?? undefined,
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
      image_url: form.image_url || null,
      display_order: form.display_order ?? null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/colors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/colors/${editing.id}`, {
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

  async function remove(c: Color) {
    if (!confirm(`Eliminare colore ${c.name}?`)) return;
    await fetch(`/api/admin/colors/${c.id}`, { method: 'DELETE' });
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Colori</h1>
          <p className="text-soft-grey text-sm">{colors.length} colori</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuovo colore' : `Modifica ${editing!.name}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="Nome" value={form.name || ''} onChange={(v) => setForm({ ...form, name: v })} required />
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Codice colore</label>
              <div className="flex gap-2">
                <input type="color" value={form.hex_code || '#000000'} onChange={(e) => setForm({ ...form, hex_code: e.target.value })} className="w-12 h-[38px] border border-pearl-grey p-0.5 cursor-pointer" />
                <input type="text" value={form.hex_code || ''} onChange={(e) => setForm({ ...form, hex_code: e.target.value })} required className={cls} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="URL immagine" value={form.image_url || ''} onChange={(v) => setForm({ ...form, image_url: v })} />
            <Inp label="Ordine" type="number" value={form.display_order ?? ''} onChange={(v) => setForm({ ...form, display_order: v ? Number(v) : undefined })} />
          </div>
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
              <th className="px-5 py-3 font-medium">Colore</th>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Codice</th>
              <th className="px-5 py-3 font-medium text-right">Ordine</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : colors.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-soft-grey">Nessun colore</td></tr>
            ) : colors.map((c) => (
              <tr key={c.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3">
                  <span className="inline-block w-7 h-7 border border-pearl-grey rounded" style={{ backgroundColor: c.hex_code }} />
                </td>
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3 font-mono text-xs">{c.hex_code}</td>
                <td className="px-5 py-3 text-right text-xs">{c.display_order ?? '—'}</td>
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
