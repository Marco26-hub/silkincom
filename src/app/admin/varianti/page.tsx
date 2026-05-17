'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Variant = {
  id: string;
  product_id: string;
  color_id: string | null;
  material_id: string | null;
  variant_sku: string;
  variant_name: string | null;
  price_override: number | null;
  products?: { name: string } | null;
  colors?: { name: string; hex_code: string | null } | null;
  materials?: { name: string } | null;
};

type Option = { id: string; name: string; hex_code?: string | null };

const empty: Partial<Variant> = {
  product_id: '', color_id: '', material_id: '',
  variant_sku: '', variant_name: '', price_override: undefined,
};

export default function AdminVariantsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [colors, setColors] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Variant>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const [{ data: v }, { data: p }, { data: c }, { data: m }] = await Promise.all([
      supabase
        .from('product_variants')
        .select('*, products(name), colors(name, hex_code), materials(name)')
        .order('variant_sku', { ascending: true }),
      supabase.from('products').select('id, name').order('name', { ascending: true }),
      supabase.from('colors').select('id, name, hex_code').order('name', { ascending: true }),
      supabase.from('materials').select('id, name').order('name', { ascending: true }),
    ]);
    setVariants((v as Variant[]) || []);
    setProducts((p as Option[]) || []);
    setColors((c as Option[]) || []);
    setMaterials((m as Option[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(v: Variant) {
    setEditing(v);
    setCreating(false);
    setForm({
      product_id: v.product_id,
      color_id: v.color_id || '',
      material_id: v.material_id || '',
      variant_sku: v.variant_sku,
      variant_name: v.variant_name || '',
      price_override: v.price_override ?? undefined,
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
      color_id: form.color_id || null,
      material_id: form.material_id || null,
      price_override: form.price_override ?? null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/variants/${editing.id}`, {
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

  async function remove(v: Variant) {
    if (!confirm(`Eliminare variante ${v.variant_sku}?`)) return;
    await fetch(`/api/admin/variants/${v.id}`, { method: 'DELETE' });
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Varianti prodotto</h1>
          <p className="text-soft-grey text-sm">{variants.length} varianti</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuova
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuova variante' : `Modifica ${editing!.variant_sku}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Prodotto</label>
              <select value={form.product_id || ''} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required className={cls + ' bg-white'}>
                <option value="">Seleziona prodotto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Colore</label>
              <select value={form.color_id || ''} onChange={(e) => setForm({ ...form, color_id: e.target.value })} className={cls + ' bg-white'}>
                <option value="">Nessuno</option>
                {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Materiale</label>
              <select value={form.material_id || ''} onChange={(e) => setForm({ ...form, material_id: e.target.value })} className={cls + ' bg-white'}>
                <option value="">Nessuno</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="SKU variante" value={form.variant_sku || ''} onChange={(v) => setForm({ ...form, variant_sku: v })} required />
            <Inp label="Nome variante" value={form.variant_name || ''} onChange={(v) => setForm({ ...form, variant_name: v })} />
            <Inp label="Prezzo override (€)" type="number" step="0.01" value={form.price_override ?? ''} onChange={(v) => setForm({ ...form, price_override: v ? Number(v) : undefined })} />
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
              <th className="px-5 py-3 font-medium">Prodotto</th>
              <th className="px-5 py-3 font-medium">Nome variante</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Colore</th>
              <th className="px-5 py-3 font-medium">Materiale</th>
              <th className="px-5 py-3 font-medium text-right">Prezzo override</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : variants.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessuna variante</td></tr>
            ) : variants.map((v) => (
              <tr key={v.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3">{v.products?.name || '—'}</td>
                <td className="px-5 py-3">{v.variant_name || '—'}</td>
                <td className="px-5 py-3 font-mono font-medium">{v.variant_sku}</td>
                <td className="px-5 py-3">
                  {v.colors ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 border border-pearl-grey" style={{ backgroundColor: v.colors.hex_code || 'transparent' }} />
                      {v.colors.name}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-3">{v.materials?.name || '—'}</td>
                <td className="px-5 py-3 text-right">{v.price_override != null ? `€${v.price_override}` : '—'}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(v)} className="p-1.5 hover:bg-pearl-grey rounded" title="Modifica">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(v)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
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
