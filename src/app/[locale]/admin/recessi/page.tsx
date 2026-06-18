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
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [sendingInstr, setSendingInstr] = useState(false);
  const [instrMsg, setInstrMsg] = useState<string | null>(null);

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

  async function loadFlag() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      // Absent flag = enabled by default.
      setEnabled(data?.recesso_enabled !== false);
    } catch {
      setEnabled(true);
    }
  }

  async function toggleEnabled() {
    if (togglingFlag || enabled === null) return;
    const next = !enabled;
    if (!next && !confirm('Disattivare il recesso? La pagina pubblica /recesso restituirà errore 404 e i clienti non potranno esercitare il recesso online. Obbligo di legge dal 19/06/2026.')) {
      return;
    }
    setTogglingFlag(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recesso_enabled: next }),
      });
      if (res.ok) setEnabled(next);
    } finally {
      setTogglingFlag(false);
    }
  }

  useEffect(() => {
    load();
    loadFlag();
  }, []);

  function openDetail(w: Withdrawal) {
    setSelected(w);
    setNewStatus(w.status);
    setAdminNotes(w.admin_notes || '');
    setInstrMsg(null);
  }

  async function sendInstructions() {
    if (!selected) return;
    if (!confirm(`Inviare le istruzioni di reso a ${selected.customer_email}? (spese di reso a carico del cliente)`)) return;
    setSendingInstr(true);
    setInstrMsg(null);
    try {
      const res = await fetch('/api/admin/recesso/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: selected.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setInstrMsg('Istruzioni inviate ✓');
        load();
      } else {
        setInstrMsg(data.error || 'Errore invio');
      }
    } catch {
      setInstrMsg('Errore di rete');
    } finally {
      setSendingInstr(false);
    }
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl mb-1">Recessi</h1>
          <p className="text-soft-grey text-sm">
            {rows.length} richieste di recesso · art. 54-bis Cod. Consumo
          </p>
        </div>
        <div className={`border px-4 py-3 ${enabled === false ? 'border-red-300 bg-red-50' : 'border-pearl-grey bg-white'}`}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Funzione recesso</p>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleEnabled}
              disabled={togglingFlag || enabled === null}
              role="switch"
              aria-checked={enabled === true}
              aria-label="Attiva o disattiva la funzione di recesso"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm">
              {enabled === null ? '…' : enabled ? 'Attiva (pubblica)' : 'Disattivata → 404'}
            </span>
          </div>
          {enabled === false && (
            <p className="text-[11px] text-red-700 mt-2 max-w-[220px] leading-snug">
              /recesso restituisce 404. Obbligo di legge dal 19/06/2026.
            </p>
          )}
        </div>
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
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saving} className="px-8 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
              {saving ? 'Salvataggio...' : 'Aggiorna recesso'}
            </button>
            <button onClick={sendInstructions} disabled={sendingInstr} className="px-8 py-2.5 border border-soft-black text-soft-black text-[10px] uppercase tracking-[0.2em] hover:bg-soft-black hover:text-warm-white transition-colors disabled:opacity-50">
              {sendingInstr ? 'Invio...' : 'Invia istruzioni di reso'}
            </button>
            {instrMsg && <span className="text-xs text-soft-grey">{instrMsg}</span>}
          </div>
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
