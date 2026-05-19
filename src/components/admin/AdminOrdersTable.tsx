'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { CheckSquare, Square } from 'lucide-react';

type Order = {
  id: string;
  order_number: string | number;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
};

const BULK_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminOrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('processing');
  const [saving, setSaving] = useState(false);

  function toggleAll() {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/admin/orders/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: bulkStatus }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-gold-primary/10 border border-gold-primary/30">
          <span className="text-sm font-medium">{selected.size} selezionati</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="border border-pearl-grey px-3 py-1.5 text-sm bg-white focus:outline-none"
          >
            {BULK_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={applyBulk}
            disabled={saving}
            className="px-5 py-1.5 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] disabled:opacity-60"
          >
            {saving ? 'Aggiornamento...' : 'Applica'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-soft-grey hover:text-soft-black"
          >
            Annulla
          </button>
        </div>
      )}

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-4 py-3">
                <button onClick={toggleAll} className="text-soft-black/60 hover:text-soft-black">
                  {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="px-5 py-3 font-medium">Ordine</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium text-right">Totale</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium">Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {orders.map((o) => (
              <tr key={o.id} className={`hover:bg-warm-white ${selected.has(o.id) ? 'bg-gold-primary/5' : ''}`}>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(o.id)} className="text-soft-black/50 hover:text-soft-black">
                    {selected.has(o.id) ? <CheckSquare className="w-4 h-4 text-gold-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/ordini/${o.id}`} className="font-medium text-soft-black hover:text-gold-primary">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-5 py-3 text-soft-black/80">{o.customer_email}</td>
                <td className="px-5 py-3 text-soft-grey">{formatDate(o.created_at)}</td>
                <td className="px-5 py-3 text-right font-medium">{formatPrice(Number(o.total_amount))}</td>
                <td className="px-5 py-3">
                  <span className="inline-block text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 bg-pearl-grey">
                    {o.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs">{o.payment_status}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessun ordine trovato</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
