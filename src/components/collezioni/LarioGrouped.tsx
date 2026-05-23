import type { Product } from '@/data/catalog-meta';
import { ProductCard } from '@/components/product/ProductCard';
import { getTranslations } from 'next-intl/server';

// Lario T-shirts split into two compositional families so a customer browsing
// the line immediately sees whether they're looking at a stretch tee or a pure
// cotton one. The keyword "elastan" / "elastane" tags the stretch group; the
// rest fall into pure cotton. Render order: stretch first (it's the flagship —
// fewer SKUs, premium fabric) then 100% cotton.
function isStretch(product: Product): boolean {
  const c = (product.composition || '').toLowerCase();
  return c.includes('elastan'); // matches IT "elastan" and EN "elastane"
}

export async function LarioGrouped({ products }: { products: Product[] }) {
  const t = await getTranslations('collectionPage.groups');

  const stretch = products.filter(isStretch);
  const pure = products.filter((p) => !isStretch(p));

  function group(title: string, subtitle: string, items: Product[]) {
    if (items.length === 0) return null;
    return (
      <div className="mb-16">
        <header className="mb-8">
          <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-3">
            {subtitle}
          </span>
          <h2 className="font-display font-light text-2xl md:text-3xl text-soft-black">
            {title}
          </h2>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
      {group(t('stretchCotton'), t('stretchCottonEyebrow'), stretch)}
      {group(t('pureCotton'), t('pureCottonEyebrow'), pure)}
    </div>
  );
}
