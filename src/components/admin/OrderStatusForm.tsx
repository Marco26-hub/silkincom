'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';

const STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'];

export function OrderStatusForm({
  orderId,
  currentStatus,
  currentTracking,
}: {
  orderId: string;
  currentStatus: string;
  currentTracking: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [tracking, setTracking] = useState(currentTracking ?? '');
  const [carrier, setCarrier] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tracking_number: tracking || null, carrier: carrier || null, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'err', text: data.error ?? 'Errore' });
    } else {
      setMsg({ type: 'ok', text: 'Aggiornato' });
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <section className="border border-pearl-grey bg-white p-6">
      <h2 className="font-medium mb-4 text-sm">Aggiorna ordine</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Stato</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black"
          >
            {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Tracking number</label>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
            placeholder="DHL12345..."
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Corriere</label>
          <input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
            placeholder="DHL, BRT, ..."
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Note interne</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
            rows={2}
          />
        </div>

        {msg && (
          <p className={`text-xs px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </form>
    </section>
  );
}
