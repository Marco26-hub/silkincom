'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useState } from 'react';

// Category = slug prefix of the product family.
const CATEGORIES: { value: string; label: string }[] = [
  { value: 'bellagio', label: 'Bellagio' },
  { value: 'cernobbio', label: 'Cernobbio' },
  { value: 'tremezzo', label: 'Tremezzo' },
  { value: 'varenna', label: 'Varenna' },
  { value: 'como', label: 'Como (Twilly)' },
  { value: 'darsena', label: 'Darsena' },
  { value: 'lario', label: 'Lario' },
  { value: 'melzi', label: 'Melzi' },
  { value: 'riva', label: 'Riva' },
  { value: 'tivan', label: 'Tivan' },
];

export function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [stock, setStock] = useState(searchParams.get('stock') ?? '');

  function apply() {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (status) p.set('status', status);
    if (category) p.set('category', category);
    if (stock) p.set('stock', stock);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function reset() {
    setQ('');
    setStatus('');
    setCategory('');
    setStock('');
    router.push(pathname);
  }

  const hasFilter = !!(
    searchParams.get('q') ||
    searchParams.get('status') ||
    searchParams.get('category') ||
    searchParams.get('stock')
  );

  const selectClass =
    'border border-pearl-grey px-3 py-2 text-sm bg-white focus:outline-none focus:border-soft-black';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="Cerca per nome o SKU..."
        className="border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black w-56"
      />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
        <option value="">Tutte le categorie</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
        <option value="">Tutti gli stati</option>
        <option value="published">Pubblicato</option>
        <option value="draft">Bozza</option>
        <option value="archived">Archiviato</option>
      </select>
      <select value={stock} onChange={(e) => setStock(e.target.value)} className={selectClass}>
        <option value="">Tutto lo stock</option>
        <option value="in">Disponibile (5+)</option>
        <option value="low">Scorta bassa (1-4)</option>
        <option value="out">Esaurito (0)</option>
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
