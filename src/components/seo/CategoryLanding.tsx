import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getProducts } from '@/data/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { getSeoCategory, pickLocale, SEO_CATEGORIES } from '@/data/seo-categories';
import { APP_URL } from '@/lib/app-url';

/**
 * Renders a typed, keyword-targeted category/landing page: localized H1 + intro,
 * curated product grid, and CollectionPage / ItemList / BreadcrumbList / FAQPage
 * structured data for rich results.
 */
export async function CategoryLanding({ slug, locale }: { slug: string; locale: string }) {
  const cfg = getSeoCategory(slug);
  if (!cfg) notFound();

  const all = await getProducts(locale);
  const products = all.filter((p) => cfg.categories.includes(p.category));

  const L = (m: Record<string, string>) => pickLocale(m, locale);
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const url = `${APP_URL}${prefix}/${slug}`;

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: L(cfg.h1),
    description: L(cfg.description),
    url,
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          url: `${APP_URL}${prefix}/prodotto/${p.slug}`,
          image: p.images?.[0],
          offers: { '@type': 'Offer', price: p.price.toFixed(2), priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
        },
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SILKinCOM', item: `${APP_URL}${prefix}` },
      { '@type': 'ListItem', position: 2, name: L(cfg.h1), item: url },
    ],
  };

  const faqSchema = cfg.faq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: cfg.faq.map((f) => ({
          '@type': 'Question',
          name: L(f.q),
          acceptedAnswer: { '@type': 'Answer', text: L(f.a) },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <section className="pt-28 md:pt-40 pb-14 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">{L(cfg.eyebrow)}</span>
          <h1 className="font-display font-light text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
            {L(cfg.h1)}
          </h1>
          <p className="max-w-2xl mx-auto text-base font-light text-soft-black/70 leading-relaxed">{L(cfg.intro)}</p>
        </div>
      </section>

      <section className="py-14 md:py-20 bg-warm-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      {cfg.faq.length > 0 && (
        <section className="pb-20 bg-warm-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="border-t border-pearl-grey/60 pt-12 space-y-7">
              {cfg.faq.map((f, i) => (
                <div key={i}>
                  <h2 className="font-display text-xl mb-1.5">{L(f.q)}</h2>
                  <p className="text-sm font-light text-soft-black/70 leading-relaxed">{L(f.a)}</p>
                </div>
              ))}
            </div>
            {/* Sibling commercial categories — internal links spread authority
                to every money page and keep a hesitant buyer moving toward a
                related (often higher-AOV) product instead of bouncing. */}
            <div className="mt-12 text-center">
              <span className="block text-[10px] uppercase tracking-[0.35em] text-soft-black/50 mb-4">
                {locale === 'it' ? 'Esplora anche' : 'Explore also'}
              </span>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
                {SEO_CATEGORIES.filter((c) => c.slug !== slug).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}`}
                    className="text-sm font-light text-soft-black/70 border-b border-pearl-grey hover:text-gold-primary hover:border-gold-primary pb-0.5 transition-colors"
                  >
                    {L(c.h1).split(' —')[0]}
                  </Link>
                ))}
              </div>
            </div>
            <p className="mt-10 text-center">
              <Link
                href="/collezioni"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-soft-black border-b border-pearl-grey hover:border-gold-primary hover:text-gold-primary pb-0.5 transition-colors"
              >
                {locale === 'it' ? 'Tutte le collezioni' : 'All collections'} →
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
