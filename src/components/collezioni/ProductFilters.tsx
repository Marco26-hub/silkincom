'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Product, Material } from '@/data/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

type Props = {
  products: Product[];
  categories: Array<{ slug: string; name: string }>;
  materials?: Array<{ slug: string; name: string; code?: string }>;
  collections?: Array<{ slug: string; name: string }>;
};

export function ProductFilters({ products, categories, materials = [], collections = [] }: Props) {
  const pathname = usePathname();
  const t = useTranslations('shop');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [page, setPage] = useState(1);

  function resetPage() { setPage(1); }

  // Extract active slug from pathname (e.g. /collezioni/cashmere → cashmere)
  const activeSlug = pathname.startsWith('/collezioni/') ? pathname.split('/collezioni/')[1] : null;

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (activeSlug) {
        const matchCat = p.category === activeSlug;
        const matchMat = p.material === activeSlug;
        const matchCol = p.collections?.includes(activeSlug);
        if (!matchCat && !matchMat && !matchCol) return false;
      }
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      return true;
    });

    if (sortBy === 'price-asc') result = [...result].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
    else result = [...result].sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, activeSlug, priceRange, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filtersPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-pearl-grey pb-4">
        <h3 className="text-[11px] uppercase tracking-[0.3em] font-medium">{t('filters.title')}</h3>
        {activeSlug && (
          <Link href="/collezioni" className="text-[10px] uppercase tracking-[0.2em] text-gold-primary hover:underline">
            {t('results.clearTag')}
          </Link>
        )}
      </div>

      {/* Collection */}
      {collections.length > 0 && (
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.25em] text-soft-black/75 font-semibold">{t('filters.collection')}</label>
          <div className="space-y-1">
            <Link
              href="/collezioni"
              onClick={() => setMobileOpen(false)}
              className={`w-full block px-3 py-1.5 text-sm transition-colors ${
                !activeSlug ? 'text-gold-dark font-semibold bg-gold-primary/10' : 'text-soft-black/85 hover:text-gold-dark'
              }`}
            >
              {t('filters.all')}
            </Link>
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collezioni/${c.slug}`}
                onClick={() => setMobileOpen(false)}
                className={`w-full block px-3 py-1.5 text-sm transition-colors ${
                  activeSlug === c.slug ? 'text-gold-dark font-semibold bg-gold-primary/10' : 'text-soft-black/85 hover:text-gold-dark'
                }`}
              >
                {c.name.replace('Collezione ', '')}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Material */}
      {materials.length > 0 && (
        <div className="space-y-3 border-t border-pearl-grey pt-5">
          <label className="text-[10px] uppercase tracking-[0.25em] text-soft-black/75 font-semibold">{t('filters.material')}</label>
          <div className="space-y-1">
            <Link
              href="/collezioni"
              onClick={() => setMobileOpen(false)}
              className={`w-full block px-3 py-1.5 text-sm transition-colors ${
                !activeSlug ? 'text-gold-dark font-semibold bg-gold-primary/10' : 'text-soft-black/85 hover:text-gold-dark'
              }`}
            >
              {t('filters.all')}
            </Link>
            {materials.map((m) => (
              <Link
                key={m.slug}
                href={`/collezioni/${m.slug}`}
                onClick={() => setMobileOpen(false)}
                className={`w-full block px-3 py-1.5 text-sm transition-colors ${
                  activeSlug === m.slug ? 'text-gold-dark font-semibold bg-gold-primary/10' : 'text-soft-black/85 hover:text-gold-dark'
                }`}
              >
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      <div className="space-y-3 border-t border-pearl-grey pt-5">
        <label className="text-[10px] uppercase tracking-[0.25em] text-soft-black/75 font-semibold">{t('filters.category')}</label>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <Link
            href="/collezioni"
            onClick={() => setMobileOpen(false)}
            className={`w-full block px-3 py-1.5 text-sm transition-colors ${
              !activeSlug ? 'text-gold-dark font-semibold bg-gold-primary/10' : 'text-soft-black/85 hover:text-gold-dark'
            }`}
          >
            {t('filters.all')}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/collezioni/${c.slug}`}
              onClick={() => setMobileOpen(false)}
              className={`w-full block px-3 py-1.5 text-sm transition-colors ${
                activeSlug === c.slug ? 'text-gold-dark font-semibold bg-gold-primary/10' : 'text-soft-black/85 hover:text-gold-dark'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="space-y-3 border-t border-pearl-grey pt-5">
        <label className="text-[10px] uppercase tracking-[0.25em] text-soft-black/75 font-semibold">{t('filters.price')}</label>
        <div className="space-y-3">
          <div className="flex gap-2 text-sm">
            <input
              type="number"
              min="0"
              value={priceRange[0]}
              onChange={(e) => { setPriceRange([Math.min(+e.target.value, priceRange[1]), priceRange[1]]); resetPage(); }}
              className="w-1/2 px-2 py-1.5 border border-pearl-grey text-center focus:outline-none focus:border-gold-primary"
            />
            <span className="px-1 py-1.5">—</span>
            <input
              type="number"
              max="1000"
              value={priceRange[1]}
              onChange={(e) => { setPriceRange([priceRange[0], Math.max(+e.target.value, priceRange[0])]); resetPage(); }}
              className="w-1/2 px-2 py-1.5 border border-pearl-grey text-center focus:outline-none focus:border-gold-primary"
            />
          </div>
          <p className="text-[11px] text-soft-black/70 text-center font-medium">€ {priceRange[0]} — € {priceRange[1]}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-32 bg-warm-white p-6 border border-pearl-grey/60">
          {filtersPanel}
        </div>
      </aside>

      {/* Mobile filter button */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-pearl-grey text-sm uppercase tracking-[0.2em] text-soft-black"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('filters.title')} {activeSlug && `(1)`}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-warm-white p-6 overflow-y-auto lg:hidden">
          <div className="flex justify-between items-center mb-6 border-b border-pearl-grey pb-4">
            <h3 className="text-[12px] uppercase tracking-[0.3em] font-medium">{t('filters.title')}</h3>
            <button onClick={() => setMobileOpen(false)} aria-label={t('filters.clear')}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {filtersPanel}
          <button
            onClick={() => setMobileOpen(false)}
            className="w-full mt-8 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em]"
          >
            {t('filters.showResults', { count: filtered.length })}
          </button>
        </div>
      )}

      {/* Results */}
      <div>
        {/* Sort and count bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-pearl-grey/60">
          <p className="text-sm text-soft-black/75">
            <span className="font-semibold text-soft-black">{filtered.length}</span>{' '}
            {filtered.length === 1 ? t('results.productSingular') : t('results.productPlural')}
          </p>
          <div className="flex items-center gap-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-soft-black/70 font-medium">{t('results.sortLabel')}</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as typeof sortBy); resetPage(); }}
              className="text-sm bg-transparent border-b border-pearl-grey focus:outline-none focus:border-gold-primary py-1 cursor-pointer"
            >
              <option value="name">{t('filters.recommended')}</option>
              <option value="price-asc">{t('sort.priceAsc')}</option>
              <option value="price-desc">{t('sort.priceDesc')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {paginated.length > 0 ? (
            paginated.map((p) => <ProductCard key={p.slug} product={p} />)
          ) : (
            <div className="col-span-full text-center py-16">
              <p className="text-soft-grey font-light mb-4">{t('results.noResults')}</p>
              <Link
                href="/collezioni"
                className="text-[11px] uppercase tracking-[0.25em] text-gold-primary border-b border-gold-primary/40 hover:border-gold-primary pb-1"
              >
                {t('results.clearFilters')}
              </Link>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page === 1}
              className="p-2 border border-pearl-grey hover:border-gold-primary transition-colors disabled:opacity-30"
              aria-label="Pagina precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => changePage(n)}
                className={`w-9 h-9 text-sm transition-colors border ${
                  n === page
                    ? 'bg-soft-black text-warm-white border-soft-black'
                    : 'border-pearl-grey text-soft-black hover:border-gold-primary'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => changePage(page + 1)}
              disabled={page === totalPages}
              className="p-2 border border-pearl-grey hover:border-gold-primary transition-colors disabled:opacity-30"
              aria-label="Pagina successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
