import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CATEGORIES, COLLECTIONS, MATERIALS, PRODUCTS, getProductsByCategory, getProductsByCollection, getProductsByMaterial, type Material } from '@/data/catalog';
import { ProductFilters } from '@/components/collezioni/ProductFilters';

export function generateStaticParams() {
  return [...CATEGORIES, ...COLLECTIONS, ...MATERIALS].map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = [...CATEGORIES, ...COLLECTIONS, ...MATERIALS].find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.name} — SILKinCOM`,
    description: cat.description,
  };
}

export default async function CollezioneSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  const category = CATEGORIES.find((c) => c.slug === slug);
  const material = MATERIALS.find((m) => m.slug === slug);
  const meta = collection || category || material;
  if (!meta) notFound();

  const t = await getTranslations('shop.filters');
  const typeLabel = collection ? t('collection') : material ? t('material') : t('category');

  return (
    <>
      <section className="pt-40 pb-16 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            {typeLabel}
          </span>
          <h1 className="font-display font-light text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
            {meta.name}
          </h1>
          <p className="max-w-2xl mx-auto text-base font-light text-soft-black/70">
            {meta.description}
          </p>
        </div>
      </section>

      <section className="py-16 bg-warm-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <ProductFilters
            products={PRODUCTS}
            categories={CATEGORIES}
            materials={MATERIALS}
            collections={COLLECTIONS}
          />
        </div>
      </section>
    </>
  );
}
