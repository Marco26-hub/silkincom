'use client';

import { Fragment, useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type PurchaseOrder = {
  id: string;
  po_number: string | null;
  supplier_name: string;
  status: string;
  total_cost: number | null;
  notes: string | null;
  expected_delivery: string | null;
  received_at: string | null;
  created_at: string;
};

type POItem = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

type Product = { id: string; name: string };

type LineRow = { product_id: string; product_name: string; quantity: string; unit_cost: string };

const STATUSES = ['draft', 'ordered', 'received'];
const STATUS_LABEL: Record<string, string> = { draft: 'Bozza', ordered: 'Ordinato', received: 'Ricevuto' };

function statusBadge(status: string) {
  if (status === 'received') return 'bg-green-100 text-green-800';
  if (status === 'ordered') return 'bg-amber-100 text-amber-800';
  return 'bg-pearl-grey text-soft-grey';
}

const emptyHeader = { supplier_name: '', po_number: '', expected_delivery: '', notes: '' };
const emptyRow: LineRow = { product_id: '', product_name: '', quantity: '1', unit_cost: '0' };

export default function AdminPurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [header, setHeader] = useState(emptyHeader);
  const [rows, setRows] = useState<LineRow[]>([{ ...emptyRow }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<POItem[]>([]);

  async function load() {
    const supabase = createBrowserClient();
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name').order('name', { ascending: true }),
    ]);
    setOrders((o as PurchaseOrder[]) || []);
    setProducts((p as Product[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', id);
    setItems((data as POItem[]) || []);
    setExpanded(id);
  }

  function startCreate() {
    setCreating(true);
    setHeader(emptyHeader);
    setRows([{ ...emptyRow }]);
    setError(null);
  }

  function cancel() {
    setCreating(false);
    setHeader(emptyHeader);
    setRows([{ ...emptyRow }]);
    setError(null);
  }

  function addRow() {
    setRows([...rows, { ...emptyRow }]);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<LineRow>) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function pickProduct(idx: number, productId: string) {
    const prod = products.find((p) => p.id === productId);
    updateRow(idx, { product_id: productId, product_name: prod ? prod.name : rows[idx].product_name });
  }

  const formTotal = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_cost) || 0),
    0,
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      supplier_name: header.supplier_name,
      po_number: header.po_number || null,
      expected_delivery: header.expected_delivery || null,
      notes: header.notes || null,
      items: rows.map((r) => ({
        product_id: r.product_id || null,
        product_name: r.product_name,
        quantity: Number(r.quantity) || 0,
        unit_cost: Number(r.unit_cost) || 0,
      })),
    };

    try {
      const res = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      cancel();
      load();
    } catch (err: any) {
      setError(err?.message || 'Errore');
    }
    setSaving(false);
  }

  async function changeStatus(po: PurchaseOrder, status: string) {
    if (status === po.status) return;
    await fetch(`/api/admin/purchase-orders/${po.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(po: PurchaseOrder) {
    if (!confirm(`Eliminare ordine ${po.po_number || po.supplier_name}?`)) return;
    await fetch(`/api/admin/purchase-orders/${po.id}`, { method: 'DELETE' });
    if (expanded === po.id) setExpanded(null);
    load();
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Ordini Fornitori</h1>
          <p className="text-soft-grey text-sm">{orders.length} ordini</p>
        </div>
        {!creating && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">Nuovo ordine fornitore</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Inp label="Fornitore" value={header.supplier_name} onChange={(v) => setHeader({ ...header, supplier_name: v })} required />
            <Inp label="Numero ordine" value={header.po_number} onChange={(v) => setHeader({ ...header, po_number: v })} />
            <Inp label="Consegna prevista" type="date" value={header.expected_delivery} onChange={(v) => setHeader({ ...header, expected_delivery: v })} />
          </div>
          <Inp label="Note" value={header.notes} onChange={(v) => setHeader({ ...header, notes: v })} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey">Righe ordine</label>
              <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-soft-black/30 text-[10px] uppercase tracking-[0.2em] hover:bg-ivory">
                <Plus className="w-3 h-3" /> Riga
              </button>
            </div>
            <div className="border border-pearl-grey divide-y divide-pearl-grey/60">
              {rows.map((r, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_90px_120px_36px] gap-3 p-3 bg-warm-white items-end">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Prodotto</label>
                    <select value={r.product_id} onChange={(e) => pickProduct(idx, e.target.value)} className={cls + ' bg-white'}>
                      <option value="">— manuale —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Nome prodotto</label>
                    <input value={r.product_name} onChange={(e) => updateRow(idx, { product_name: e.target.value })} required className={cls} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Q.tà</label>
                    <input type="number" value={r.quantity} onChange={(e) => updateRow(idx, { quantity: e.target.value })} className={cls} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Costo unit. (€)</label>
                    <input type="number" step="0.01" value={r.unit_cost} onChange={(e) => updateRow(idx, { unit_cost: e.target.value })} className={cls} />
                  </div>
                  <button type="button" onClick={() => removeRow(idx)} disabled={rows.length === 1} className="p-2 hover:bg-red-50 rounded text-red-600 disabled:opacity-30" title="Rimuovi riga">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-sm text-right">Totale: <span className="font-medium">€{formTotal.toFixed(2)}</span></p>
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
              <th className="px-5 py-3 font-medium w-8"></th>
              <th className="px-5 py-3 font-medium">Numero</th>
              <th className="px-5 py-3 font-medium">Fornitore</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Totale</th>
              <th className="px-5 py-3 font-medium">Consegna prevista</th>
              <th className="px-5 py-3 font-medium">Creato</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-soft-grey">Nessun ordine</td></tr>
            ) : orders.map((po) => (
              <Fragment key={po.id}>
                <tr className="hover:bg-ivory/50">
                  <td className="px-5 py-3">
                    <button onClick={() => toggleExpand(po.id)} title="Dettaglio righe">
                      {expanded === po.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-5 py-3 font-mono font-medium">{po.po_number || '—'}</td>
                  <td className="px-5 py-3">{po.supplier_name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${statusBadge(po.status)}`}>
                      {STATUS_LABEL[po.status] || po.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">€{(po.total_cost ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs">
                    {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs">{new Date(po.created_at).toLocaleDateString('it-IT')}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select value={po.status} onChange={(e) => changeStatus(po, e.target.value)} className="border border-pearl-grey px-2 py-1 text-xs bg-white focus:outline-none focus:border-soft-black">
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      <button onClick={() => remove(po)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === po.id && (
                  <tr>
                    <td colSpan={8} className="px-5 py-4 bg-ivory">
                      {po.notes && <p className="text-xs text-soft-grey mb-3">Note: {po.notes}</p>}
                      {items.length === 0 ? (
                        <p className="text-xs text-soft-grey">Nessuna riga.</p>
                      ) : (
                        <table className="w-full text-sm bg-white border border-pearl-grey">
                          <thead className="bg-warm-white border-b border-pearl-grey">
                            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                              <th className="px-4 py-2 font-medium">Prodotto</th>
                              <th className="px-4 py-2 font-medium text-right">Q.tà</th>
                              <th className="px-4 py-2 font-medium text-right">Costo unit.</th>
                              <th className="px-4 py-2 font-medium text-right">Totale</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-pearl-grey/60">
                            {items.map((it) => (
                              <tr key={it.id}>
                                <td className="px-4 py-2">{it.product_name}</td>
                                <td className="px-4 py-2 text-right">{it.quantity}</td>
                                <td className="px-4 py-2 text-right">€{(it.unit_cost ?? 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-right">€{(it.total_cost ?? 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
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
