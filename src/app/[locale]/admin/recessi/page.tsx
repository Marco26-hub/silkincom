'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

type Withdrawal = {
  id: string;
  withdrawal_number: string;
  order_id: string | null;
  order_number: string;
  customer_name: string | null;
  customer_email: string;
  items: { name: string; quantity: number }[] | null;
  declaration: string;
  locale: string;
  status: string;
  submitted_at: string;
  acknowledged_at: string | null;
  admin_notes: string | null;
};

const STATUS_FLOW = ['received', 'acknowledged', 'processing', 'refunded', 'rejected'] as const;
const STATUS_LABELS: Record<string, string> = {
  received: 'Ricevuto',
  acknowledged: 'Confermato',
  processing: 'In lavorazione',
  refunded: 'Rimborsato',
  rejected: 'Rifiutato',
};
const STATUS_COLORS: Record<string, string> = {
  received: 'bg-yellow-100 text-yellow-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  refunded: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  });
}

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(300);
    setRows((data as Withdrawal[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openDetail(w: Withdrawal) {
    setSelected(w);
    setNewStatus(w.status);
    setAdminNotes(w.admin_notes || '');
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from('withdrawals')
      .update({ status: newStatus, admin_notes: adminNotes, updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    setSaving(false);
    if (!error) {
      setSelected(null);
      load();
    }
  }

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Recessi</h1>
        <p className="text-soft-grey text-sm">
          {rows.length} richieste di recesso · art. 54-bis Cod. Consumo
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_FLOW].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] border transition-colors ${filter === s ? 'bg-soft-black text-warm-white border-soft-black' : 'border-pearl-grey hover:border-soft-black'}`}
          >
            {s === 'all' ? 'Tutti' : STATUS_LABELS[s]} (
            {s === 'all' ? rows.length : rows.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>

      {selected && (
        <div className="border border-pearl-grey bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{selected.withdrawal_number}</h2>
            <button onClick={() => setSelected(null)} className="text-xs text-soft-grey hover:text-soft-black">
              Chiudi
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Ordine</span>{selected.order_number}</div>
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Cliente</span>{selected.customer_name || '—'}</div>
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Email</span>{selected.customer_email}</div>
            <div><span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Trasmesso</span>{fmtDateTime(selected.submitted_at)}</div>
          </div>
          {selected.items && selected.items.length > 0 && (
            <div className="bg-ivory p-3 text-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Prodotti</span>
              <ul className="list-disc pl-5">
                {selected.items.map((it, i) => (
                  <li key={i}>{it.name}{it.quantity > 1 ? ` · ×${it.quantity}` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-ivory p-3 text-sm">
            <span className="text-[10px] uppercase tracking-[0.2em] text-soft-grey block mb-1">Dichiarazione</span>
            <p className="whitespace-pre-wrap">{selected.declaration}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Stato</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black">
                {STATUS_FLOW.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Ricevuta inviata</span>
              <p className="text-sm py-2">{selected.acknowledged_at ? fmtDateTime(selected.acknowledged_at) : '— non inviata'}</p>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Note admin</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
          </div>
          <button onClick={save} disabled={saving} className="px-8 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Aggiorna recesso'}
          </button>
        </div>
      )}

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Riferimento</th>
              <th className="px-5 py-3 font-medium">Ordine</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium">Trasmesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-soft-grey">Nessun recesso</td></tr>
            ) : filtered.map((w) => (
              <tr key={w.id} onClick={() => openDetail(w)} className="hover:bg-ivory/50 cursor-pointer">
                <td className="px-5 py-3 font-medium">{w.withdrawal_number}</td>
                <td className="px-5 py-3">{w.order_number}</td>
                <td className="px-5 py-3 text-xs">{w.customer_name || w.customer_email}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 ${STATUS_COLORS[w.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[w.status] || w.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-soft-grey">{fmtDateTime(w.submitted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
