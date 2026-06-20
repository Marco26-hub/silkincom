import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Truck, RotateCcw, MapPin, Sparkles } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { PRODUCT_SLUGS, getCategories, getProduct, getProducts, getMaterials } from '@/data/catalog';
import { localizedAlternates } from '@/i18n/routing';
import { PRODUCT_CAT_TO_SEO, getSeoCategory, pickLocale } from '@/data/seo-categories';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductPurchaseSection } from '@/components/product/ProductPurchaseSection';
import { ReviewSchema } from '@/components/schemas/ReviewSchema';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ArtisanAttribution } from '@/components/product/ArtisanAttribution';
import { InventoryBadge } from '@/components/product/InventoryBadge';
import { SizeGuideModal } from '@/components/product/SizeGuideModal';
import { createServerClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/app-url';

function materialName(slug: string | undefined, locale: string): string {
  if (!slug) return '';
  return getMaterials(locale).find((m) => m.slug === slug)?.name ?? '';
}

// Pull the color/variant qualifier out of the slug (e.g. "cernobbio-azzurra"
// with category "cernobbio" -> "azzurra"). Returns '' for purely numeric
// variants (e.g. "bellagio-1") or when the slug doesn't start with category.
function colorFromSlug(slug: string, category: string): string {
  if (!category || !slug.startsWith(`${category}-`)) return '';
  const tail = slug.slice(category.length + 1).replace(/-/g, ' ').trim();
  return /^\d+$/.test(tail) ? '' : tail;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// First sentence of the description — the short "essence" line shown under
// the price. The source is curated prose, so it is shown whole: no length
// cap and no ellipsis (a mid-word "…" looked like broken text).
function shortComposition(c: string): string {
  if (!c) return '';
  const text = c.replace(/\s+/g, ' ').trim();
  const cut = text.search(/\.(\s|$)/);
  return cut >= 0 ? text.slice(0, cut + 1) : text;
}

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

// Commercial product TYPE per category-line (the DB categories are brand lines,
// not product types). Drives the buyer-intent keyword in title/description so
// each page ranks for what people actually search — and so a cap/tee/towel is
// never mislabelled "scarf". Localised; falls back to '' for unknown lines.
const TYPE_BY_CAT: Record<string, Record<string, string>> = {
  lario:        { it: 'T-shirt', en: 'T-shirt', de: 'T-Shirt', fr: 'T-shirt', es: 'Camiseta', pt: 'T-shirt', nl: 'T-shirt' },
  bellagio:     { it: 'Pashmina', en: 'Pashmina', de: 'Pashmina', fr: 'Pashmina', es: 'Pashmina', pt: 'Pashmina', nl: 'Pashmina' },
  'twilly-como':{ it: 'Foulard', en: 'Silk scarf', de: 'Seidentuch', fr: 'Foulard', es: 'Pañuelo de seda', pt: 'Lenço de seda', nl: 'Zijden sjaaltje' },
  darsena:      { it: 'Cappellino', en: 'Cap', de: 'Cap', fr: 'Casquette', es: 'Gorra', pt: 'Boné', nl: 'Pet' },
  tremezzo:     { it: 'Sciarpa', en: 'Scarf', de: 'Schal', fr: 'Écharpe', es: 'Bufanda', pt: 'Cachecol', nl: 'Sjaal' },
  varenna:      { it: 'Sciarpa', en: 'Scarf', de: 'Schal', fr: 'Écharpe', es: 'Bufanda', pt: 'Cachecol', nl: 'Sjaal' },
  cernobbio:    { it: 'Sciarpa', en: 'Scarf', de: 'Schal', fr: 'Écharpe', es: 'Bufanda', pt: 'Cachecol', nl: 'Sjaal' },
  melzi:        { it: 'Pantaloncini', en: 'Shorts', de: 'Shorts', fr: 'Short', es: 'Pantalón corto', pt: 'Calções', nl: 'Short' },
  riva:         { it: 'Camicia', en: 'Shirt', de: 'Hemd', fr: 'Chemise', es: 'Camisa', pt: 'Camisa', nl: 'Overhemd' },
  tivan:        { it: 'Telo mare', en: 'Beach towel', de: 'Strandtuch', fr: 'Serviette de plage', es: 'Toalla de playa', pt: 'Toalha de praia', nl: 'Strandlaken' },
};
const SHIP_SUFFIX: Record<string, string> = {
  it: 'Made in Como. Spedizione gratuita oltre €200.',
  en: 'Made in Como. Free shipping over €200.',
  de: 'Made in Como. Kostenloser Versand ab €200.',
  fr: 'Made in Como. Livraison gratuite dès €200.',
  es: 'Made in Como. Envío gratis desde €200.',
  pt: 'Made in Como. Portes grátis acima de €200.',
  nl: 'Made in Como. Gratis verzending vanaf €200.',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await getProduct(slug, locale);
  if (!p) return {};
  const mat = materialName(p.material, locale);
  const rawColor = colorFromSlug(p.slug, p.category);
  const color = rawColor && !p.name.toLowerCase().includes(rawColor.toLowerCase()) ? titleCase(rawColor) : '';
  const colorBit = color ? ` ${color}` : '';
  const type = TYPE_BY_CAT[p.category]?.[locale] ?? '';
  const typeMat = [type, mat].filter(Boolean).join(' · ');         // e.g. "Foulard · Seta"
  const ship = SHIP_SUFFIX[locale] ?? SHIP_SUFFIX.it;

  // The root layout applies a "%s | SILKinCOM" title template, so the brand is
  // appended automatically — don't add it here (it doubled before).
  const ogTitle = `${p.name}${colorBit}${typeMat ? ` — ${typeMat}` : ''}`;
  const title = ogTitle;
  // Keyword-first description: type+material+name up front (so the buying query
  // matches), then the native short copy, then the commercial shipping hook.
  const lead = `${type ? type + ' ' : ''}${p.name}${colorBit}${mat ? ' in ' + mat : ''}`.trim();
  const base = (p.descriptionShort || '').replace(/\s+/g, ' ').trim();
  let description = `${lead}. ${base ? base + ' ' : ''}${ship}`.replace(/\s+/g, ' ').trim();
  if (description.length > 160) description = description.slice(0, 157).trimEnd() + '…';

  const prefix = locale === 'it' ? '' : `/${locale}`;
  const url = `${APP_URL}${prefix}/prodotto/${slug}`;
  const image = p.images?.[0];
  return {
    title,
    description,
    alternates: localizedAlternates(locale, `/prodotto/${slug}`),
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: 'SILKinCOM',
      type: 'website',
      ...(image ? { images: [{ url: image, alt: ogTitle }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProdottoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await getProduct(slug, locale);
  if (!p) notFound();

  const t = await getTranslations('product');
  const tn = await getTranslations('nav');
  const cat = getCategories(locale).find((c) => c.slug === p.category);
  const materialLabel = materialName(p.material, locale);
  const rawColor = colorFromSlug(p.slug, p.category);
  const color = rawColor && !p.name.toLowerCase().includes(rawColor.toLowerCase()) ? rawColor : '';
  const colorLabel = color ? titleCase(color) : '';
  const altDescriptor = [p.name, color, materialLabel].filter(Boolean).join(' ');
  const related = (await getProducts(locale)).filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);
  const seoCatSlug = PRODUCT_CAT_TO_SEO[p.category];
  const seoCat = seoCatSlug ? getSeoCategory(seoCatSlug) : undefined;

  const prefix = locale === 'it' ? '' : `/${locale}`;
  const productUrl = `${APP_URL}${prefix}/prodotto/${p.slug}`;
  const availability = p.variants.length > 0 && p.variants.every((variant) => variant.available <= 0)
    ? 'https://schema.org/OutOfStock'
    : 'https://schema.org/InStock';

  // Auth check for review form (does not affect render of product details)
  let isAuthenticated = false;
  try {
    const sb = await createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }
  // Disambiguated product name for schema + breadcrumb leaf. If the raw product
  // name matches the category (e.g. "Cernobbio") and a color variant exists,
  // append the color so AI crawlers and Google Rich Results see a distinct leaf.
  const productFullName = `${p.name}${colorLabel ? ` ${colorLabel}` : ''}`;
  const collectionLeafName = cat ? `${cat.name} (collezione)` : undefined;
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: productFullName,
    description: p.description,
    sku: p.slug,
    // mpn (manufacturer part number) as the global identifier — artisan goods
    // have no GTIN, so brand + mpn satisfies Google. (Was `gtin: p.slug`, an
    // INVALID GTIN that triggered the Merchant "GTIN non valido" warning.)
    mpn: p.slug,
    image: p.images,
    url: productUrl,
    brand: { '@type': 'Brand', name: 'SILKinCOM' },
    material: materialLabel || 'Fibra naturale pregiata',
    color: colorLabel || undefined,
    countryOfOrigin: 'IT',
    category: cat?.name,
    manufacturer: { '@type': 'Organization', name: 'SILKinCOM', url: APP_URL },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'EUR',
      price: p.price.toFixed(2),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'SILKinCOM' },
      // Merchant listing enhancements (GSC "Schede commercianti": campi mancanti)
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IT',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        // Customer ships the return at their own expense via a carrier of their
        // choice (resi/recesso policy: "a carico del cliente, a proprie spese").
        // ReturnFeesCustomerResponsibility correctly models this WITHOUT requiring
        // a fixed returnShippingFeesAmount (which ReturnShippingFees would demand).
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: p.price >= 200 ? '0' : '9',
          currency: 'EUR',
        },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IT' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4, unitCode: 'DAY' },
        },
      },
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${APP_URL}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: 'Collezioni', item: `${APP_URL}${prefix}/collezioni` },
      ...(cat ? [{ '@type': 'ListItem', position: 3, name: collectionLeafName, item: `${APP_URL}${prefix}/collezioni/${cat.slug}` }] : []),
      { '@type': 'ListItem', position: cat ? 4 : 3, name: productFullName, item: productUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* AggregateRating + Review schema (emits only if approved reviews exist) */}
      <ReviewSchema
        productSlug={p.slug}
        productName={p.name}
        productUrl={productUrl}
        productImage={p.images?.[0]}
        productPrice={p.price}
      />
      <section className="bg-[#11100e] pb-24 pt-32">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
          {/* Breadcrumb */}
          <nav className="mb-10 flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-light uppercase tracking-[0.28em] text-warm-white/45">
            <Link href="/" className="hover:text-gold-primary transition-colors">{tn('home')}</Link>
            <span className="text-gold-primary/35">/</span>
            <Link href="/collezioni" className="hover:text-gold-primary transition-colors">{tn('collections')}</Link>
            {cat && (
              <>
                <span className="text-gold-primary/35">/</span>
                <Link href={`/collezioni/${cat.slug}`} className="hover:text-gold-primary transition-colors">{cat.name}</Link>
              </>
            )}
            <span className="text-gold-primary/35">/</span>
            <span className="text-warm-white/80">{p.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 xl:gap-16">
            {/* Gallery — 2-col on mobile + desktop, first spans full width */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {p.images.map((img, i) => (
                <div
                  key={i}
                  className={`group relative overflow-hidden border border-gold-primary/15 ${
                    i === 0 ? 'col-span-2 aspect-[4/5]' : 'aspect-square'
                  }`}
                  style={{
                    background: 'radial-gradient(ellipse at 50% 26%, #fdfaf4 0%, #f4eee3 60%, #e7dfd0 116%)',
                    boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.22), 0 28px 70px -38px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="pointer-events-none absolute inset-3 z-10 border border-warm-white/45 transition-colors duration-700 group-hover:border-gold-primary/65" />
                  {/* Floor shadow under product */}
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[55%] h-4 opacity-50 blur-md"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(23,23,23,0.30) 0%, transparent 70%)',
                    }}
                  />
                  <Image
                    src={img}
                    alt={`${altDescriptor} — vista ${i + 1}`}
                    fill
                    sizes={i === 0 ? '(max-width: 1024px) 100vw, 60vw' : '(max-width: 1024px) 50vw, 30vw'}
                    quality={95}
                    className={`object-contain mix-blend-multiply brightness-[1.06] transition-transform duration-[1800ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.04] drop-shadow-[0_12px_24px_rgba(23,23,23,0.12)] ${
                      i === 0 ? 'p-10 md:p-20 lg:p-24' : 'p-6 md:p-12'
                    }`}
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>

            {/* Sticky details */}
            <div className="bg-warm-white p-6 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.9)] sm:p-8 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:p-10">
              {materialLabel && (
                <span className="inline-block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4 font-light">
                  {materialLabel}{cat && ` — ${cat.name}`}
                </span>
              )}

              <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-soft-black">
                {p.name}{colorLabel ? ` ${colorLabel}` : ''}
              </h1>

              <p className="text-2xl md:text-3xl font-light text-soft-black mb-3 tracking-wide">
                {formatPrice(p.price)}
              </p>
              <p className="text-[11px] text-soft-grey font-light mb-10">
                {t('taxIncluded')}
              </p>

              {/* Short essence */}
              <p className="text-[15px] font-light text-soft-black/85 leading-[1.7] mb-10 max-w-md">
                {p.descriptionShort?.trim() || shortComposition(p.description)}
              </p>

              {/* Artisan attribution (renders only if mapped) */}
              <ArtisanAttribution productSlug={p.slug} />

              {/* Inventory urgency */}
              <div className="mb-3">
                <InventoryBadge productSlug={p.slug} />
              </div>

              {/* CTA — size selector (apparel) + AddToCart + Wishlist */}
              <div className="mb-10">
                <ProductPurchaseSection
                  slug={p.slug}
                  name={p.name}
                  price={p.price}
                  image={p.images[0] || ''}
                  variants={p.variants}
                />
              </div>

              {/* Heritage strip */}
              <div className="grid grid-cols-2 gap-4 py-6 border-y border-pearl-grey/60 mb-10 text-[10px] uppercase tracking-[0.2em] text-soft-grey font-light">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-gold-primary mt-0.5 flex-shrink-0" />
                  <span>{t('perks.madeInComo')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-gold-primary mt-0.5 flex-shrink-0" />
                  <span>{t('perks.artisan')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="w-3 h-3 text-gold-primary mt-0.5 flex-shrink-0" />
                  <span>{t('perks.shipping')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="w-3 h-3 text-gold-primary mt-0.5 flex-shrink-0" />
                  <span>{t('perks.returns')}</span>
                </div>
              </div>

              {/* Buyer-intent category up-link — internal linking + a path to a
                  sibling SKU for a hesitant visitor. */}
              {seoCat && seoCatSlug && (
                <Link
                  href={`/${seoCatSlug}`}
                  className="inline-flex items-center gap-2 mb-8 text-[11px] uppercase tracking-[0.25em] text-soft-black/70 border-b border-pearl-grey hover:text-gold-primary hover:border-gold-primary pb-0.5 transition-colors"
                >
                  {pickLocale(seoCat.h1, locale).split(' —')[0]}
                  <span aria-hidden>→</span>
                </Link>
              )}

              {/* Description full */}
              <details open className="group border-b border-pearl-grey/60 py-5">
                <summary className="flex justify-between items-center cursor-pointer list-none text-[11px] uppercase tracking-[0.3em] text-soft-black hover:text-gold-primary transition-colors">
                  <span>{t('tabs.description')}</span>
                  <span className="text-gold-primary text-lg font-thin transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-5 text-sm font-light text-soft-black/80 leading-[1.8] whitespace-pre-line">
                  {p.description}
                </p>
              </details>

              <details className="group border-b border-pearl-grey/60 py-5">
                <summary className="flex justify-between items-center cursor-pointer list-none text-[11px] uppercase tracking-[0.3em] text-soft-black hover:text-gold-primary transition-colors">
                  <span>{t('tabs.composition')}</span>
                  <span className="text-gold-primary text-lg font-thin transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-5 space-y-3 text-sm font-light text-soft-black/80 leading-[1.8]">
                  {p.composition && (
                    <p><span className="text-soft-grey uppercase text-[10px] tracking-[0.2em] block mb-1">{t('details.composition')}</span>{p.composition}</p>
                  )}
                  {p.dimensions && (
                    <p><span className="text-soft-grey uppercase text-[10px] tracking-[0.2em] block mb-1">{t('details.dimensions')}</span>{p.dimensions}</p>
                  )}
                  <p><span className="text-soft-grey uppercase text-[10px] tracking-[0.2em] block mb-1">{t('details.sku')}</span>{p.sku}</p>
                  <div className="flex gap-4 flex-wrap mt-2">
                    <Link href="/cura-prodotto" className="inline-block text-[11px] uppercase tracking-[0.25em] text-gold-primary border-b border-gold-primary/40 hover:border-gold-primary pb-0.5">
                      {t('tabs.care')}
                    </Link>
                    <SizeGuideModal />
                  </div>
                </div>
              </details>

              <details className="group border-b border-pearl-grey/60 py-5">
                <summary className="flex justify-between items-center cursor-pointer list-none text-[11px] uppercase tracking-[0.3em] text-soft-black hover:text-gold-primary transition-colors">
                  <span>{t('tabs.shipping')}</span>
                  <span className="text-gold-primary text-lg font-thin transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-5 text-sm font-light text-soft-black/80 leading-[1.8] space-y-2">
                  <p>{t('shippingDetails.standard')}</p>
                  <p>{t('shippingDetails.returns')}</p>
                  <Link href="/spedizioni" className="inline-block text-[11px] uppercase tracking-[0.25em] text-gold-primary border-b border-gold-primary/40 hover:border-gold-primary pb-0.5 mt-2">
                    {t('shippingDetails.allDetails')}
                  </Link>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="review" className="scroll-mt-24 border-t border-gold-primary/15 bg-warm-white py-20">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-12">
            <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4">
              {t('reviews.eyebrow')}
            </span>
            <span className="block w-px h-8 bg-gold-primary mx-auto mb-6" />
            <h2 className="font-display font-light text-3xl md:text-4xl">
              {t.rich('reviews.title', {
                name: p.name,
                em: (chunks) => <em className="italic text-gold-primary">{chunks}</em>,
              })}
            </h2>
          </div>
          <ProductReviews productSlug={p.slug} isAuthenticated={isAuthenticated} />
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-[#f2ede4] py-24">
          <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-3">
                  {t('related.eyebrow')}
                </span>
                <h2 className="font-display font-light text-3xl md:text-4xl lg:text-5xl">
                  {t('related.title')}
                </h2>
              </div>
              {cat && (
                <Link
                  href={`/collezioni/${cat.slug}`}
                  className="text-[11px] uppercase tracking-[0.25em] text-soft-black border-b border-soft-black hover:border-gold-primary hover:text-gold-primary pb-1 transition-all self-start md:self-end"
                >
                  {t('related.viewAll')} {cat.name}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {related.map((r) => <ProductCard key={r.slug} product={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
