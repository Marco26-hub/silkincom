'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';

export function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');

  function apply() {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (status) p.set('status', status);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function reset() {
    setQ('');
    setStatus('');
    router.push(pathname);
  }

  const hasFilter = !!(searchParams.get('q') || searchParams.get('status'));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="Cerca per nome o SKU..."
        className="border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black w-56"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black"
      >
        <option value="">Tutti gli stati</option>
        <option value="published">Pubblicato</option>
        <option value="draft">Bozza</option>
        <option value="archived">Archiviato</option>
      </select>
      <button
        type="button"
        onClick={apply}
        className="px-5 py-2 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors"
      >
        Filtra
      </button>
      {hasFilter && (
        <button
          type="button"
          onClick={reset}
          className="text-xs text-soft-grey hover:text-soft-black underline"
        >
          Azzera
        </button>
      )}
    </div>
  );
}
