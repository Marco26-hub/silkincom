'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InventoryAdjustForm({ productId, currentQty }: { productId: string; currentQty: number }) {
  const router = useRouter();
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!delta || !reason) return;
    setBusy(true);
    const res = await fetch('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        quantity_change: Number(delta),
        reason,
        movement_type: Number(delta) > 0 ? 'inbound' : 'adjustment',
      }),
    });
    setBusy(false);
    if (res.ok) {
      setDelta('');
      setReason('');
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? 'Errore');
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <input
        type="number"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        placeholder="±"
        className="w-16 border border-pearl-grey px-2 py-1 text-xs text-center focus:outline-none focus:border-soft-black"
      />
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo"
        className="w-32 border border-pearl-grey px-2 py-1 text-xs focus:outline-none focus:border-soft-black"
      />
      <button
        type="submit"
        disabled={busy || !delta || !reason}
        className="px-3 py-1 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.15em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40"
      >
        OK
      </button>
    </form>
  );
}
