import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Truck, RotateCcw, MapPin, Sparkles } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { PRODUCT_SLUGS, getCategories, getProduct, getProducts, getMaterials } from '@/data/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { WishlistButton } from '@/components/product/WishlistButton';
import { ReviewSchema } from '@/components/schemas/ReviewSchema';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ArtisanAttribution } from '@/components/product/ArtisanAttribution';
import { InventoryBadge } from '@/components/product/InventoryBadge';
import { SizeGuideModal } from '@/components/product/SizeGuideModal';
import { createServerClient } from '@/lib/supabase/server';

function materialName(slug: string | undefined, locale: string): string {
  if (!slug) return '';
  return getMaterials(locale).find((m) => m.slug === slug)?.name ?? '';
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// Extract first sentence from composition (often "100% cashmere ...")
function shortComposition(c: string): string {
  if (!c) return '';
  const firstLine = c.split(/[\.\n]/).map((s) => s.trim()).filter(Boolean)[0] || c;
  return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
}

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const p = getProduct(slug, locale);
  if (!p) return {};
  const mat = materialName(p.material, locale);
  return {
    title: `${p.name}${mat ? ` — ${mat}` : ''} | SILKinCOM`,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/prodotto/${slug}` },
  };
}

export default async function ProdottoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const p = getProduct(slug, locale);
  if (!p) notFound();

  const t = await getTranslations('product');
  const tn = await getTranslations('nav');
  const cat = getCategories(locale).find((c) => c.slug === p.category);
  const materialLabel = materialName(p.material, locale);
  const related = getProducts(locale).filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app';
  const productUrl = `${baseUrl}/prodotto/${p.slug}`;

  // Auth check for review form (does not affect render of product details)
  let isAuthenticated = false;
  try {
    const sb = await createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: p.name,
    description: p.description,
    sku: p.slug,
    image: p.images,
    brand: { '@type': 'Brand', name: 'SILKinCOM' },
    material: materialLabel || 'Fibra naturale pregiata',
    countryOfOrigin: 'IT',
    manufacturer: { '@type': 'Organization', name: 'SILKinCOM', url: baseUrl },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'EUR',
      price: p.price.toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'SILKinCOM' },
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Collezioni', item: `${baseUrl}/collezioni` },
      ...(cat ? [{ '@type': 'ListItem', position: 3, name: cat.name, item: `${baseUrl}/collezioni/${cat.slug}` }] : []),
      { '@type': 'ListItem', position: cat ? 4 : 3, name: p.name, item: productUrl },
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
      <section className="pt-32 pb-24 bg-warm-white">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
          {/* Breadcrumb */}
          <nav className="text-[10px] uppercase tracking-[0.25em] text-soft-grey mb-10 flex flex-wrap gap-x-2 gap-y-1 font-light">
            <Link href="/" className="hover:text-gold-primary transition-colors">{tn('home')}</Link>
            <span className="text-pearl-grey">/</span>
            <Link href="/collezioni" className="hover:text-gold-primary transition-colors">{tn('collections')}</Link>
            {cat && (
              <>
                <span className="text-pearl-grey">/</span>
                <Link href={`/collezioni/${cat.slug}`} className="hover:text-gold-primary transition-colors">{cat.name}</Link>
              </>
            )}
            <span className="text-pearl-grey">/</span>
            <span className="text-soft-black">{p.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-20">
            {/* Gallery — 2-col on mobile + desktop, first spans full width */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {p.images.map((img, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden group ${
                    i === 0 ? 'col-span-2 aspect-[4/5]' : 'aspect-square'
                  }`}
                  style={{
                    background: 'radial-gradient(ellipse at 50% 30%, #FFFDF8 0%, #F7F2EA 60%, #EDE3D3 100%)',
                    boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.06), 0 18px 48px -24px rgba(23,23,23,0.10)',
                  }}
                >
                  {/* Floor shadow under product */}
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[55%] h-4 opacity-50 blur-md"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(23,23,23,0.30) 0%, transparent 70%)',
                    }}
                  />
                  <Image
                    src={img}
                    alt={`${p.name} — ${i + 1}`}
                    fill
                    sizes={i === 0 ? '(max-width: 1024px) 100vw, 60vw' : '(max-width: 1024px) 50vw, 30vw'}
                    quality={95}
                    className={`object-contain transition-transform duration-[1800ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.04] drop-shadow-[0_12px_24px_rgba(23,23,23,0.10)] ${
                      i === 0 ? 'p-10 md:p-20 lg:p-24' : 'p-6 md:p-12'
                    }`}
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>

            {/* Sticky details */}
            <div className="lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-2">
              {materialLabel && (
                <span className="inline-block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4 font-light">
                  {materialLabel}{cat && ` — ${cat.name}`}
                </span>
              )}

              <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-soft-black">
                {p.name}
              </h1>

              <p className="text-2xl md:text-3xl font-light text-soft-black mb-3 tracking-wide">
                {formatPrice(p.price)}
              </p>
              <p className="text-[11px] text-soft-grey font-light mb-10">
                {t('taxIncluded')}
              </p>

              {/* Short essence */}
              <p className="text-[15px] font-light text-soft-black/85 leading-[1.7] mb-10 max-w-md">
                {shortComposition(p.description)}
              </p>

              {/* Artisan attribution (renders only if mapped) */}
              <ArtisanAttribution productSlug={p.slug} />

              {/* Inventory urgency */}
              <div className="mb-3">
                <InventoryBadge productSlug={p.slug} />
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-3 mb-10">
                <AddToCartButton
                  slug={p.slug}
                  name={p.name}
                  price={p.price}
                  image={p.images[0] || ''}
                />
                <WishlistButton productSlug={p.slug} />
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
      <section id="review" className="py-20 bg-warm-white border-t border-pearl-grey/40 scroll-mt-24">
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
        <section className="py-24 bg-ivory">
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
