'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Return = {
  id: string;
  return_number: string;
  order_id: string;
  status: string;
  reason: string;
  notes: string | null;
  admin_notes: string | null;
  refund_amount: number | null;
  refunded_at: string | null;
  created_at: string;
  orders: { order_number: string; customer_email: string; total_amount: number } | null;
};

const STATUS_FLOW = ['requested', 'approved', 'received', 'refunded', 'rejected'] as const;
const STATUS_LABELS: Record<string, string> = {
  requested: 'Richiesto',
  approved: 'Approvato',
  received: 'Ricevuto',
  refunded: 'Rimborsato',
  rejected: 'Rifiutato',
};
const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  received: 'bg-purple-100 text-purple-800',
  refunded: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Return | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('returns')
      .select('*, orders(order_number, customer_email, total_amount)')
      .order('created_at', { ascending: false })
      .limit(200);
    setReturns((data as Return[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openDetail(r: Return) {
    setSelected(r);
    setNewStatus(r.status);
    setAdminNotes(r.admin_notes || '');
    setRefundAmount(r.refund_amount?.toString() || r.orders?.total_amount?.toString() || '');
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/admin/returns/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        admin_notes: adminNotes,
        refund_amount: refundAmount ? Number(refundAmount) : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSelected(null);
      load();
    }
  }

  const filtered = filter === 'all' ? returns : returns.filter((r) => r.status === filter);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Resi</h1>
        <p className="text-soft-grey text-sm">{returns.length} resi totali</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_FLOW].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] border transition-colors ${filter === s ? 'bg-soft-black text-warm-white border-soft-black' : 'border-pearl-grey hover:border-soft-black'}`}
          >
            {s === 'all' ? 'Tutti' : STATUS_LABELS[s]} ({s === 'all' ? returns.length : returns.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {selected && (
        <div className="border border-pearl-grey bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{selected.return_number}</h2>
            <button onClick={() => setSelected(null)} className="text-xs text-soft-grey hover:text-soft-black">Chiudi</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Ordine</span>{selected.orders?.order_number}</div>
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Cliente</span>{selected.orders?.customer_email}</div>
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Motivo</span>{selected.reason}</div>
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Data richiesta</span>{new Date(selected.created_at).toLocaleDateString('it-IT')}</div>
          </div>
          {selected.notes && (
            <div className="bg-ivory p-3 text-sm"><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Note cliente</span>{selected.notes}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Stato</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black">
                {STATUS_FLOW.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Importo rimborso (€)</label>
              <input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Note admin</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
          </div>
          <button onClick={save} disabled={saving} className="px-8 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Aggiorna reso'}
          </button>
        </div>
      )}

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Numero</th>
              <th className="px-5 py-3 font-medium">Ordine</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Motivo</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Rimborso</th>
              <th className="px-5 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessun reso</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} onClick={() => openDetail(r)} className="hover:bg-ivory/50 cursor-pointer">
                <td className="px-5 py-3 font-medium">{r.return_number}</td>
                <td className="px-5 py-3">{r.orders?.order_number}</td>
                <td className="px-5 py-3 text-xs">{r.orders?.customer_email}</td>
                <td className="px-5 py-3 text-xs">{r.reason}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">{r.refund_amount ? `€${Number(r.refund_amount).toFixed(2)}` : '—'}</td>
                <td className="px-5 py-3 text-xs text-soft-grey">{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
