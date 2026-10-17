import { Link } from '@/i18n/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { normLocale, type Product } from '@/data/catalog-meta';
import { WINTER_AREAS, getWinterArea, winterAreaProducts, type WinterView } from '@/data/winter-categories';
import { WINTER_CATEGORY_COPY } from '@/data/winter-category-copy';

export function WinterCategoryNav({ locale, active }: { locale: string; active?: WinterView }) {
  const t = WINTER_CATEGORY_COPY[normLocale(locale)];
  return (
    <nav aria-label={t.title} className="mb-12 flex flex-wrap gap-2">
      {[{ slug: undefined, name: t.categories }, ...WINTER_AREAS.map(slug => ({ slug, name: t.areas[slug].name })), { slug: 'tutti' as const, name: t.all }].map(item => (
        <Link key={item.slug ?? 'categories'} href={item.slug ? `/collezioni/inverno/${item.slug}#catalogo-inverno` : '/collezioni/inverno#catalogo-inverno'}
          aria-current={active === item.slug ? 'page' : undefined}
          className={`border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition-colors ${active === item.slug ? 'border-soft-black bg-soft-black text-warm-white' : 'border-black/20 text-soft-black hover:border-gold-primary'}`}>
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

export function WinterCatalog({ locale, products, active, heading = true }: { locale: string; products: Product[]; active?: WinterView; heading?: boolean }) {
  const t = WINTER_CATEGORY_COPY[normLocale(locale)];
  const areas = active && active !== 'tutti' ? [active] : WINTER_AREAS;
  const unclassified = products.filter(product => product.collections.includes('inverno') && !getWinterArea(product));
  if (unclassified.length) console.warn('[winter-catalog] Omitted from dedicated areas: unknown winter product category', unclassified.map(product => product.slug));
  return (
    <section id="catalogo-inverno" className="scroll-mt-32 bg-[#f2ede4] py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        {heading && <div className="mb-10 max-w-3xl">
          <h2 className="font-display text-4xl font-light md:text-6xl">{t.title}</h2>
          <p className="mt-5 text-sm font-light leading-relaxed text-soft-black/70">{t.intro}</p>
        </div>}
        <WinterCategoryNav locale={locale} active={active} />
        {active === 'tutti' ? <div data-winter-area="tutti" className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 md:gap-x-8">
          {products.map(product => <ProductCard key={product.slug} product={product} />)}
        </div> : <div className="space-y-20 md:space-y-28">
          {areas.map(area => {
            const items = winterAreaProducts(products, area);
            return <section key={area} id={`inverno-${area}`} data-winter-area={area} className="scroll-mt-32 border-t border-black/15 pt-10">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                <div className="max-w-3xl">
                  <h2 className="font-display text-3xl font-light md:text-5xl">{t.areas[area].name}</h2>
                  <p className="mt-4 text-sm font-light leading-relaxed text-soft-black/70">{t.areas[area].description}</p>
                </div>
                {!active && <Link href={`/collezioni/inverno/${area}`} className="border-b border-gold-primary text-[10px] uppercase tracking-[0.2em] pb-1">{t.discover} →</Link>}
              </div>
              {items.length ? <div className={`grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-8 ${items.length > 2 ? 'md:grid-cols-3 lg:grid-cols-4' : 'max-w-4xl'}`}>
                {items.map(product => <ProductCard key={product.slug} product={product} />)}
              </div> : <p className="text-sm font-light text-soft-black/60">{t.empty}</p>}
            </section>;
          })}
        </div>}
      </div>
    </section>
  );
}
