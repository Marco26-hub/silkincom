'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type ResultType = 'prodotto' | 'categoria' | 'collezione' | 'colore' | 'materiale';

type Result = {
  type: ResultType;
  id: string;
  name: string;
  href: string;
  sub?: string;
};

const TYPE_LABELS: Record<ResultType, string> = {
  prodotto: 'Prodotto',
  categoria: 'Categoria',
  collezione: 'Collezione',
  colore: 'Colore',
  materiale: 'Materiale',
};

export function AdminSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => runSearch(query.trim()), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function runSearch(q: string) {
    setLoading(true);
    const sb = createBrowserClient();
    const pattern = `%${q}%`;

    const [products, categories, collections, colors, materials] = await Promise.all([
      sb.from('products').select('id, name, sku').ilike('name', pattern).limit(5),
      sb.from('categories').select('id, name').ilike('name', pattern).limit(3),
      sb.from('collections').select('id, name').ilike('name', pattern).limit(3),
      sb.from('colors').select('id, name').ilike('name', pattern).limit(3),
      sb.from('materials').select('id, name').ilike('name', pattern).limit(3),
    ]);

    const res: Result[] = [
      ...(products.data ?? []).map((p: any) => ({
        type: 'prodotto' as const,
        id: p.id,
        name: p.name,
        href: `/admin/prodotti/${p.id}`,
        sub: p.sku,
      })),
      ...(categories.data ?? []).map((c: any) => ({
        type: 'categoria' as const,
        id: c.id,
        name: c.name,
        href: '/admin/categorie',
      })),
      ...(collections.data ?? []).map((c: any) => ({
        type: 'collezione' as const,
        id: c.id,
        name: c.name,
        href: '/admin/collezioni',
      })),
      ...(colors.data ?? []).map((c: any) => ({
        type: 'colore' as const,
        id: c.id,
        name: c.name,
        href: '/admin/colori',
      })),
      ...(materials.data ?? []).map((m: any) => ({
        type: 'materiale' as const,
        id: m.id,
        name: m.name,
        href: '/admin/materiali',
      })),
    ];

    setResults(res);
    setOpen(res.length > 0);
    setLoading(false);
  }

  function clear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      <div className="flex items-center border border-pearl-grey bg-white px-3 py-1.5 gap-2">
        <Search className="w-3.5 h-3.5 text-soft-grey flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca prodotti, categorie, colori..."
          className="flex-1 text-sm focus:outline-none bg-transparent min-w-0"
        />
        {query && (
          <button type="button" onClick={clear}>
            <X className="w-3 h-3 text-soft-grey hover:text-soft-black" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-pearl-grey shadow-md mt-0.5 max-h-80 overflow-y-auto">
          {results.length === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-soft-grey">Nessun risultato</p>
          )}
          {results.map((r) => (
            <Link
              key={`${r.type}-${r.id}`}
              href={r.href}
              onClick={clear}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-warm-white border-b border-pearl-grey/40 last:border-0"
            >
              <span className="text-[9px] uppercase tracking-[0.15em] text-soft-grey/70 bg-pearl-grey/40 px-1.5 py-0.5 flex-shrink-0 w-20 text-center">
                {TYPE_LABELS[r.type]}
              </span>
              <div className="min-w-0">
                <p className="text-sm truncate">{r.name}</p>
                {r.sub && <p className="text-[10px] text-soft-grey font-mono">{r.sub}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
