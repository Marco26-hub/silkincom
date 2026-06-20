import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { getProducts } from '@/data/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { getSeoCategory, pickLocale, SEO_CATEGORIES } from '@/data/seo-categories';
import { APP_URL } from '@/lib/app-url';

const CATEGORY_HERO_IMAGES: Record<string, string> = {
  'foulard-seta': '/instagram/ig-02.webp',
  'sciarpe-seta': '/instagram/ig-10.webp',
  'pashmine-cashmere': '/instagram/ig-05.webp',
  'camicie-lino': '/instagram/ig-01.webp',
  'teli-mare': '/editorial/estate-lago-di-como-silkincom.webp',
  'regalo-seta-donna': '/instagram/ig-08.webp',
};

const UI_COPY = {
  shop: { it: 'Scopri i modelli', en: 'Shop the edit', es: 'Descubre los modelos', fr: 'Découvrir les modèles', de: 'Modelle entdecken', pt: 'Descobrir os modelos', nl: 'Ontdek de modellen' },
  from: { it: 'Da', en: 'From', es: 'Desde', fr: 'Dès', de: 'Ab', pt: 'Desde', nl: 'Vanaf' },
  gift: { it: 'Cofanetto Maison incluso', en: 'Maison gift box included', es: 'Caja Maison incluida', fr: 'Coffret Maison inclus', de: 'Maison-Geschenkbox inklusive', pt: 'Caixa Maison incluída', nl: 'Maison-geschenkdoos inbegrepen' },
  shipping: { it: 'Spedizione gratuita oltre €200', en: 'Free shipping over €200', es: 'Envío gratuito desde 200 €', fr: 'Livraison offerte dès 200 €', de: 'Kostenloser Versand ab 200 €', pt: 'Envio grátis acima de 200 €', nl: 'Gratis verzending vanaf €200' },
  returns: { it: 'Recesso entro 14 giorni', en: '14-day right of withdrawal', es: 'Desistimiento en 14 días', fr: 'Rétractation sous 14 jours', de: '14 Tage Widerrufsrecht', pt: 'Livre resolução em 14 dias', nl: '14 dagen bedenktijd' },
  explore: { it: 'Esplora anche', en: 'Explore also', es: 'Explora también', fr: 'Explorer aussi', de: 'Auch entdecken', pt: 'Explorar também', nl: 'Ontdek ook' },
  all: { it: 'Tutte le collezioni', en: 'All collections', es: 'Todas las colecciones', fr: 'Toutes les collections', de: 'Alle Kollektionen', pt: 'Todas as coleções', nl: 'Alle collecties' },
} as const;

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
  const U = (m: Record<string, string>) => m[locale] ?? m.en ?? m.it;
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const url = `${APP_URL}${prefix}/${slug}`;
  const heroImage = CATEGORY_HERO_IMAGES[slug] || '/editorial/materiali-seta-cashmere-lana.webp';
  const minimumPrice = products.length ? Math.min(...products.map((product) => product.price)) : null;

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
          description: p.descriptionShort || p.description,
          sku: p.sku,
          url: `${APP_URL}${prefix}/prodotto/${p.slug}`,
          image: p.images?.[0],
          brand: { '@type': 'Brand', name: 'SILKinCOM' },
          offers: {
            '@type': 'Offer',
            url: `${APP_URL}${prefix}/prodotto/${p.slug}`,
            price: p.price.toFixed(2),
            priceCurrency: 'EUR',
            availability: p.variants.length > 0 && p.variants.every((variant) => variant.available <= 0)
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: 'SILKinCOM' },
          },
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

      <section className="relative overflow-hidden bg-[#11100e] pt-32 text-warm-white md:pt-40">
        <div className="mx-auto grid min-h-[58svh] max-w-[1500px] items-stretch md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 flex flex-col justify-end px-7 pb-14 pt-16 sm:px-10 md:px-14 md:pb-20 lg:px-20">
            <span className="mb-5 block h-px w-12 bg-gold-primary" />
            <span className="mb-4 block text-[9px] uppercase tracking-[0.42em] text-gold-primary">{L(cfg.eyebrow)}</span>
            <h1 className="font-display text-[3rem] font-light leading-[0.96] tracking-[-0.025em] sm:text-6xl lg:text-7xl">
              {L(cfg.h1)}
            </h1>
            <p className="mt-7 max-w-xl text-sm font-light leading-[1.85] text-warm-white/70 md:text-base">{L(cfg.intro)}</p>
            <a
              href="#products"
              className="mt-8 inline-flex w-fit items-center gap-3 border-b border-gold-primary/55 pb-1.5 text-[9px] uppercase tracking-[0.32em] text-gold-primary transition-colors hover:border-gold-primary hover:text-warm-white"
            >
              {U(UI_COPY.shop)} {minimumPrice !== null ? `· ${U(UI_COPY.from)} €${minimumPrice}` : ''} →
            </a>
          </div>
          <div className="relative min-h-[48svh] overflow-hidden border-l border-gold-primary/15 md:min-h-0">
            <Image src={heroImage} alt={L(cfg.h1)} fill priority sizes="(max-width: 767px) 100vw, 55vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10 md:bg-gradient-to-r md:from-[#11100e]/35 md:to-transparent" />
            <div className="absolute inset-4 border border-gold-primary/25 md:inset-6" />
            <span className="absolute bottom-8 right-8 text-[8px] uppercase tracking-[0.36em] text-gold-primary">Made in Como</span>
          </div>
        </div>
      </section>

      <section aria-label="Servizi SILKinCOM" className="border-b border-soft-black/10 bg-warm-white">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 divide-y divide-soft-black/10 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-10">
          {[UI_COPY.gift, UI_COPY.shipping, UI_COPY.returns].map((item) => (
            <p key={item.it} className="px-4 py-5 text-center text-[9px] uppercase tracking-[0.25em] text-soft-black/65 sm:py-6">
              {U(item)}
            </p>
          ))}
        </div>
      </section>

      <section id="products" className="scroll-mt-28 bg-[#f2ede4] py-16 md:py-24">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
          <div className="mb-10 flex items-end justify-between border-b border-soft-black/15 pb-6">
            <span className="text-[9px] uppercase tracking-[0.38em] text-gold-dark">SILKinCOM · Como</span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-soft-black/45">{products.length} · SILKinCOM</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      {cfg.faq.length > 0 && (
        <section className="bg-[#f2ede4] pb-24">
          <div className="max-w-3xl mx-auto px-6">
            <div className="space-y-7 border-t border-soft-black/15 pt-12">
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
                {U(UI_COPY.explore)}
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
                {U(UI_COPY.all)} →
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
