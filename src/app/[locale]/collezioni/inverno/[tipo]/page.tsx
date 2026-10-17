import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getProducts } from '@/data/catalog';
import { normLocale } from '@/data/catalog-meta';
import { WINTER_AREAS, isWinterView, winterAreaProducts } from '@/data/winter-categories';
import { WINTER_CATEGORY_COPY, WINTER_SEASON } from '@/data/winter-category-copy';
import { WinterCatalog } from '@/components/collezioni/WinterCatalog';
import { Link } from '@/i18n/navigation';
import { localizedAlternates } from '@/i18n/routing';
import { APP_URL } from '@/lib/app-url';

export function generateStaticParams() {
  return [...WINTER_AREAS, 'tutti'].map(tipo => ({ tipo }));
}

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!isWinterView(tipo)) return {};
  const locale = await getLocale();
  const t = WINTER_CATEGORY_COPY[normLocale(locale)];
  const winter = (await getProducts(locale)).filter(product => product.collections.includes('inverno'));
  const products = tipo === 'tutti' ? winter : winterAreaProducts(winter, tipo);
  const name = tipo === 'tutti' ? t.all : t.areas[tipo].name;
  const description = tipo === 'tutti' ? t.intro : t.areas[tipo].description;
  return {
    title: `${name} · ${WINTER_SEASON[normLocale(locale)]}`,
    description,
    alternates: localizedAlternates(locale, `/collezioni/inverno/${tipo}`),
    ...(products.length === 0 || (process.env.NODE_ENV === 'development' && process.env.WINTER_2026_LOCAL_PREVIEW === 'true')
      ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${name} · SILKinCOM`, description, ...(products[0]?.images[0] ? { images: [products[0].images[0]] } : {}) },
  };
}

export default async function WinterCategoryPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!isWinterView(tipo)) notFound();
  const locale = await getLocale();
  const t = WINTER_CATEGORY_COPY[normLocale(locale)];
  const filters = await getTranslations('shop.filters');
  const winter = (await getProducts(locale)).filter(product => product.collections.includes('inverno'));
  const products = tipo === 'tutti' ? winter : winterAreaProducts(winter, tipo);
  const name = tipo === 'tutti' ? t.all : t.areas[tipo].name;
  const description = tipo === 'tutti' ? t.intro : t.areas[tipo].description;
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const url = `${APP_URL}${prefix}/collezioni/inverno/${tipo}`;
  const schema = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name, description, url, inLanguage: locale,
      isPartOf: { '@type': 'CollectionPage', url: `${APP_URL}${prefix}/collezioni/inverno` },
      mainEntity: { '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((product, index) => ({
        '@type': 'ListItem', position: index + 1, item: {
          '@type': 'Product', name: product.name, url: `${APP_URL}${prefix}/prodotto/${product.slug}`, image: product.images[0],
          offers: { '@type': 'Offer', price: product.price.toFixed(2), priceCurrency: 'EUR',
            availability: product.variants.length && product.variants.every(variant => variant.available <= 0)
              ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' },
        },
      })) },
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SILKinCOM', item: `${APP_URL}${prefix}` },
      { '@type': 'ListItem', position: 2, name: filters('collection'), item: `${APP_URL}${prefix}/collezioni` },
      { '@type': 'ListItem', position: 3, name: WINTER_SEASON[normLocale(locale)], item: `${APP_URL}${prefix}/collezioni/inverno` },
      { '@type': 'ListItem', position: 4, name, item: url },
    ] },
  ];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <header className="bg-[#f2ede4] px-6 pb-14 pt-40 md:pb-20 md:pt-48 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <Link href="/collezioni/inverno" className="text-[10px] uppercase tracking-[0.25em] text-gold-dark">← {WINTER_SEASON[normLocale(locale)]} · SILKinCOM</Link>
        <h1 className="mt-10 max-w-4xl font-display text-5xl font-light leading-[1.05] sm:text-6xl md:text-8xl">{name}</h1>
        <p className="mt-6 max-w-2xl text-sm font-light leading-relaxed text-soft-black/70 md:text-base">{description}</p>
      </div>
    </header>
    <WinterCatalog locale={locale} products={winter} active={tipo} heading={false} />
  </>;
}
