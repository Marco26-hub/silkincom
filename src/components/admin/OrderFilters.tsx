'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const STATUS_FILTERS = [
  'all',
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export function OrderFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [status, setStatus] = useState(sp.get('status') ?? 'all');

  function navigate(nextQ: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus);
    const qs = params.toString();
    router.push(qs ? `/admin/ordini?${qs}` : '/admin/ordini');
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(q, status);
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca per numero o email..."
        className="border border-pearl-grey px-4 py-2 text-sm font-light w-72 focus:outline-none focus:border-soft-black"
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          navigate(q, e.target.value);
        }}
        className="border border-pearl-grey px-4 py-2 text-sm font-light bg-white focus:outline-none focus:border-soft-black"
      >
        {STATUS_FILTERS.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'Tutti gli stati' : s}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="px-5 py-2 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors"
      >
        Filtra
      </button>
    </form>
  );
}
