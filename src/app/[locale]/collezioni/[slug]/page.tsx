import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { TAXONOMY_SLUGS, getCategories, getMaterials, getProducts } from '@/data/catalog';
import { getFeaturedCollections, getFeaturedCollection } from '@/data/collections-db';
import { localizedAlternates } from '@/i18n/routing';
import { ProductFilters } from '@/components/collezioni/ProductFilters';
import { LarioGrouped } from '@/components/collezioni/LarioGrouped';
import { APP_URL } from '@/lib/app-url';

export function generateStaticParams() {
  return TAXONOMY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const collection = await getFeaturedCollection(slug, locale);
  const cat = collection || [...getCategories(locale), ...getMaterials(locale)].find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.description,
    alternates: localizedAlternates(locale, `/collezioni/${slug}`),
  };
}

export default async function CollezioneSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const collection = await getFeaturedCollection(slug, locale);
  const category = getCategories(locale).find((c) => c.slug === slug);
  const material = getMaterials(locale).find((m) => m.slug === slug);
  const meta = collection || category || material;
  if (!meta) notFound();

  const t = await getTranslations('shop.filters');
  const typeLabel = collection ? t('collection') : material ? t('material') : t('category');

  // CollectionPage + ItemList schema — enumerate products for AI/search engines

  const prefix = locale === 'it' ? '' : `/${locale}`;
  const inList = (await getProducts(locale)).filter(
    (p) => p.category === slug || p.material === slug || p.collections?.includes(slug),
  );
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.name,
    description: meta.description,
    url: `${APP_URL}${prefix}/collezioni/${slug}`,
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: inList.length,
      itemListElement: inList.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          url: `${APP_URL}${prefix}/prodotto/${p.slug}`,
          image: p.images?.[0],
          offers: { '@type': 'Offer', price: p.price.toFixed(2), priceCurrency: 'EUR' },
        },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <section className="pt-28 md:pt-40 pb-16 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            {typeLabel}
          </span>
          <h1 className="font-display font-light text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
            {meta.name}
          </h1>
          <p className="max-w-2xl mx-auto text-base font-light text-soft-black/70">
            {meta.description}
          </p>
        </div>
      </section>

      <section className="py-16 bg-warm-white">
        {slug === 'lario' ? (
          <LarioGrouped products={inList} />
        ) : (
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
            <ProductFilters
              products={await getProducts(locale)}
              categories={getCategories(locale)}
              materials={getMaterials(locale)}
              collections={await getFeaturedCollections(locale)}
            />
          </div>
        )}
      </section>
    </>
  );
}
