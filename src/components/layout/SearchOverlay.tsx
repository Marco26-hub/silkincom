'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { getProducts } from '@/data/catalog';

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);
}

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('search');
  const locale = useLocale();
  const products = getProducts(locale);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = query.trim().length >= 2
    ? products.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.material?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        );
      }).slice(0, 8)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-soft-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-warm-white mx-auto w-full max-w-2xl mt-20 shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-pearl-grey">
          <Search className="w-5 h-5 text-soft-black/40 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-soft-black/30 text-soft-black"
          />
          <button onClick={onClose} className="text-soft-black/40 hover:text-soft-black transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-pearl-grey/40">
            {results.map((p) => (
              <Link
                key={p.slug}
                href={`/prodotto/${p.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 px-6 py-4 hover:bg-ivory transition-colors"
              >
                {p.images?.[0] && (
                  <div className="w-14 h-14 relative flex-shrink-0 bg-ivory">
                    <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-light text-soft-black truncate">{p.name}</p>
                  {p.material && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold-primary mt-0.5">{p.material}</p>
                  )}
                </div>
                <p className="text-sm font-light text-soft-black/70 flex-shrink-0">{formatPrice(p.price)}</p>
              </Link>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && results.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-light text-soft-black/50">{t('noResults', { query })}</p>
          </div>
        )}

        {query.trim().length < 2 && (
          <div className="px-6 py-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-soft-black/30">{t('minChars')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
