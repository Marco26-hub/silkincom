'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type ShipmentZone = {
  id: string;
  name: string;
  countries: string[];
  base_cost: number;
  free_shipping_threshold: number | null;
  estimated_days: number | null;
};

type FormState = {
  name: string;
  countries: string;
  base_cost: number | undefined;
  free_shipping_threshold: number | undefined;
  estimated_days: number | undefined;
};

const empty: FormState = {
  name: '', countries: '', base_cost: 0,
  free_shipping_threshold: undefined, estimated_days: undefined,
};

export default function AdminShipmentZonesPage() {
  const [zones, setZones] = useState<ShipmentZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShipmentZone | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('shipment_zones')
      .select('*')
      .order('name', { ascending: true });
    setZones((data as ShipmentZone[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(z: ShipmentZone) {
    setEditing(z);
    setCreating(false);
    setForm({
      name: z.name,
      countries: (z.countries || []).join(', '),
      base_cost: z.base_cost,
      free_shipping_threshold: z.free_shipping_threshold ?? undefined,
      estimated_days: z.estimated_days ?? undefined,
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

    const countries = form.countries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const payload = {
      name: form.name,
      countries,
      base_cost: form.base_cost,
      free_shipping_threshold: form.free_shipping_threshold ?? null,
      estimated_days: form.estimated_days ?? null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/shipment-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/shipment-zones/${editing.id}`, {
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

  async function remove(z: ShipmentZone) {
    if (!confirm(`Eliminare zona ${z.name}?`)) return;
    await fetch(`/api/admin/shipment-zones/${z.id}`, { method: 'DELETE' });
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Zone Spedizione</h1>
          <p className="text-soft-grey text-sm">{zones.length} zone</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuova zona' : `Modifica ${editing!.name}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Inp label="Paesi (ISO, separati da virgola)" value={form.countries} onChange={(v) => setForm({ ...form, countries: v })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="Costo base (€)" type="number" step="0.01" value={form.base_cost ?? ''} onChange={(v) => setForm({ ...form, base_cost: Number(v) })} required />
            <Inp label="Soglia spedizione gratuita (€)" type="number" step="0.01" value={form.free_shipping_threshold ?? ''} onChange={(v) => setForm({ ...form, free_shipping_threshold: v ? Number(v) : undefined })} />
            <Inp label="Giorni stimati" type="number" value={form.estimated_days ?? ''} onChange={(v) => setForm({ ...form, estimated_days: v ? Number(v) : undefined })} />
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
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Paesi</th>
              <th className="px-5 py-3 font-medium text-right">Costo base</th>
              <th className="px-5 py-3 font-medium text-right">Spedizione gratuita</th>
              <th className="px-5 py-3 font-medium text-right">Giorni</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : zones.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-soft-grey">Nessuna zona</td></tr>
            ) : zones.map((z) => (
              <tr key={z.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3 font-medium">{z.name}</td>
                <td className="px-5 py-3 text-xs">{(z.countries || []).join(', ')}</td>
                <td className="px-5 py-3 text-right">€{z.base_cost}</td>
                <td className="px-5 py-3 text-right text-xs">{z.free_shipping_threshold ? `€${z.free_shipping_threshold}` : '—'}</td>
                <td className="px-5 py-3 text-right text-xs">{z.estimated_days ?? '—'}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(z)} className="p-1.5 hover:bg-pearl-grey rounded" title="Modifica">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(z)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
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
