'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  minimum_order_amount: number | null;
  is_active: boolean;
  created_at: string;
};

const empty: Partial<Coupon> = {
  code: '', discount_type: 'percentage', discount_value: 0,
  valid_from: '', valid_until: '', max_uses: undefined,
  max_uses_per_customer: undefined, minimum_order_amount: undefined, is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Coupon>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Errore caricamento (${res.status})`);
        setCoupons([]);
      } else {
        setCoupons((data.coupons as Coupon[]) || []);
        setError(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Errore di rete');
      setCoupons([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Coupon) {
    setEditing(c);
    setCreating(false);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      valid_from: c.valid_from?.slice(0, 10) || '',
      valid_until: c.valid_until?.slice(0, 10) || '',
      max_uses: c.max_uses ?? undefined,
      max_uses_per_customer: c.max_uses_per_customer ?? undefined,
      minimum_order_amount: c.minimum_order_amount ?? undefined,
      is_active: c.is_active,
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
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/coupons/${editing.id}`, {
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

  async function toggle(c: Coupon) {
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Errore toggle (${res.status})`);
        return;
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Errore di rete');
      return;
    }
    load();
  }

  async function remove(c: Coupon) {
    if (!confirm(`Eliminare coupon ${c.code}?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Eliminazione fallita (${res.status}). Suggerimento: se il coupon ha già redemptions, disattivalo invece.`);
        return;
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Errore di rete');
      return;
    }
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      {error && !showForm && (
        <div className="border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3 flex items-start justify-between gap-4">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 text-xs uppercase tracking-[0.15em]">Chiudi</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Coupon</h1>
          <p className="text-soft-grey text-sm">{coupons.length} coupon</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuovo coupon' : `Modifica ${editing!.code}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="Codice" value={form.code || ''} onChange={(v) => setForm({ ...form, code: v })} required />
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Tipo sconto</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={cls + ' bg-white'}>
                <option value="percentage">Percentuale (%)</option>
                <option value="fixed_amount">Fisso (€)</option>
              </select>
            </div>
            <Inp label="Valore" type="number" step="0.01" value={form.discount_value ?? ''} onChange={(v) => setForm({ ...form, discount_value: Number(v) })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="Valido dal" type="date" value={form.valid_from || ''} onChange={(v) => setForm({ ...form, valid_from: v })} />
            <Inp label="Valido fino" type="date" value={form.valid_until || ''} onChange={(v) => setForm({ ...form, valid_until: v })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="Max usi totali" type="number" value={form.max_uses ?? ''} onChange={(v) => setForm({ ...form, max_uses: v ? Number(v) : undefined })} />
            <Inp label="Max usi / cliente" type="number" value={form.max_uses_per_customer ?? ''} onChange={(v) => setForm({ ...form, max_uses_per_customer: v ? Number(v) : undefined })} />
            <Inp label="Ordine minimo (€)" type="number" step="0.01" value={form.minimum_order_amount ?? ''} onChange={(v) => setForm({ ...form, minimum_order_amount: v ? Number(v) : undefined })} />
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
              <th className="px-5 py-3 font-medium">Codice</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium text-right">Valore</th>
              <th className="px-5 py-3 font-medium">Validità</th>
              <th className="px-5 py-3 font-medium">Limiti</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessun coupon</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-5 py-3 text-xs">{c.discount_type === 'percentage' ? '%' : '€'}</td>
                <td className="px-5 py-3 text-right">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `€${c.discount_value}`}</td>
                <td className="px-5 py-3 text-xs">
                  {c.valid_from ? new Date(c.valid_from).toLocaleDateString('it-IT') : '—'}
                  {' → '}
                  {c.valid_until ? new Date(c.valid_until).toLocaleDateString('it-IT') : '∞'}
                </td>
                <td className="px-5 py-3 text-xs">
                  {c.max_uses ? `${c.max_uses} usi` : '∞'}
                  {c.minimum_order_amount ? ` · min €${c.minimum_order_amount}` : ''}
                </td>
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
