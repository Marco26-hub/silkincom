import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { getCategories, getMaterials, getProducts } from '@/data/catalog';
import { getFeaturedCollections } from '@/data/collections-db';
import { localizedAlternates } from '@/i18n/routing';
import { ProductFilters } from '@/components/collezioni/ProductFilters';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const COLLECTION_FALLBACK_IMAGES: Record<string, string> = {
  inverno: '/instagram/ig-10.webp',
  iconica: '/instagram/ig-11.webp',
  primavera: '/instagram/ig-05.webp',
};

const CATEGORY_EDITORIAL_IMAGES: Record<string, string> = {
  bellagio: '/instagram/ig-05.webp',
  cernobbio: '/instagram/ig-06.webp',
  tremezzo: '/instagram/ig-03.webp',
  varenna: '/instagram/ig-10.webp',
  'twilly-como': '/instagram/ig-02.webp',
  darsena: '/categorie/darsena-cappellino.webp',
  lario: '/categorie/lario-tshirt.webp',
  melzi: '/categorie/melzi-shorts.webp',
  riva: '/categorie/riva-camicia.webp',
  tivan: '/editorial/estate-lago-di-como-silkincom.webp',
};

const COLLECTIONS_META: Record<string, { title: string; description: string }> = {
  it: { title: 'Collezioni — Seta, Cashmere, Lana, Lino e Cotone', description: 'Scopri le collezioni SILKinCOM: foulard in seta da €75, sciarpe in lana da €70, cashmere da €120 e capi estivi Made in Italy.' },
  en: { title: 'Collections — Silk, Cashmere, Wool, Linen & Cotton', description: 'Discover SILKinCOM collections: silk scarves from €75, wool scarves from €70, cashmere from €120 and summer pieces Made in Italy.' },
  es: { title: 'Colecciones — Seda, Cachemir, Lana, Lino y Algodón', description: 'Descubre las colecciones SILKinCOM: pañuelos de seda desde 75 €, bufandas de lana desde 70 €, cachemir desde 120 € y prendas Made in Italy.' },
  fr: { title: 'Collections — Soie, Cachemire, Laine, Lin et Coton', description: 'Découvrez les collections SILKinCOM : foulards en soie dès 75 €, écharpes en laine dès 70 €, cachemire dès 120 € et pièces Made in Italy.' },
  de: { title: 'Kollektionen — Seide, Cashmere, Wolle, Leinen & Baumwolle', description: 'Entdecken Sie SILKinCOM: Seidentücher ab 75 €, Wollschals ab 70 €, Cashmere ab 120 € und sommerliche Stücke Made in Italy.' },
  pt: { title: 'Coleções — Seda, Caxemira, Lã, Linho e Algodão', description: 'Descubra as coleções SILKinCOM: lenços de seda desde 75 €, cachecóis de lã desde 70 €, caxemira desde 120 € e peças Made in Italy.' },
  nl: { title: 'Collecties — Zijde, Cashmere, Wol, Linnen & Katoen', description: 'Ontdek SILKinCOM: zijden sjaaltjes vanaf €75, wollen sjaals vanaf €70, cashmere vanaf €120 en zomerse stukken Made in Italy.' },
};

export async function generateMetadata() {
  const locale = await getLocale();
  const metadata = COLLECTIONS_META[locale] ?? COLLECTIONS_META.en;
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: localizedAlternates(locale, '/collezioni'),
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: locale === 'it' ? '/collezioni' : `/${locale}/collezioni`,
      images: [{ url: '/instagram/ig-11.webp', alt: metadata.title }],
    },
  };
}

export default async function CollezioniPage() {
  const t = await getTranslations('collezioni');
  const locale = await getLocale();
  const [collections, products] = await Promise.all([
    getFeaturedCollections(locale),
    getProducts(locale),
  ]);
  const categories = getCategories(locale);
  const materials = getMaterials(locale);

  return (
    <>
      <BreadcrumbSchema
        trail={[
          { name: 'Home', path: '/' },
          { name: 'Collezioni', path: '/collezioni' },
        ]}
      />

      <section className="relative flex min-h-[72svh] items-end overflow-hidden bg-[#11100e] pt-32 text-warm-white">
        <Image
          src="/instagram/ig-11.webp"
          alt="Tessitura artigianale SILKinCOM sul Lago di Como"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.28),rgba(17,16,14,0.48)_45%,rgba(17,16,14,0.96))]" />
        <div className="absolute inset-4 border border-gold-primary/25 sm:inset-7" />
        <div className="relative mx-auto w-full max-w-[1500px] px-8 pb-16 sm:px-12 md:pb-20 lg:px-16">
          <span className="mb-5 block text-[10px] uppercase tracking-[0.48em] text-gold-primary">
            {t('eyebrow')}
          </span>
          <div className="grid items-end gap-7 md:grid-cols-[1fr_0.55fr]">
            <h1 className="max-w-4xl font-display text-[3.4rem] font-light leading-[0.88] tracking-[-0.035em] sm:text-7xl md:text-8xl lg:text-[7.5rem]">
              {t('titlePlain')} <em className="block italic text-gold-primary">{t('titleAccent')}</em>
            </h1>
            <div className="max-w-md md:justify-self-end">
              <span className="mb-5 block h-px w-14 bg-gold-primary" />
              <p className="text-sm font-light leading-[1.8] text-warm-white/75 md:text-base">
                {t('description')}
              </p>
              <Link href="#collezioni-editoriali" className="mt-7 inline-flex items-center gap-3 text-[9px] uppercase tracking-[0.32em] text-gold-primary">
                {t('explore')} <ArrowDown className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="collezioni-editoriali" className="bg-[#11100e] py-20 text-warm-white md:py-28">
        <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
          <div className="mb-12 flex items-end justify-between border-b border-gold-primary/20 pb-6">
            <div>
              <span className="mb-3 block text-[9px] uppercase tracking-[0.42em] text-gold-primary">SILKinCOM</span>
              <h2 className="font-display text-4xl font-light md:text-5xl">{t('collectionLabel')}</h2>
            </div>
            <span className="hidden text-[9px] uppercase tracking-[0.35em] text-warm-white/40 md:block">Como · Italia</span>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-7">
            {collections.map((collection, index) => (
              <Link
                key={collection.slug}
                href={`/collezioni/${collection.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden border border-gold-primary/20 bg-[#1b1916]"
              >
                <Image
                  src={collection.image || COLLECTION_FALLBACK_IMAGES[collection.slug] || '/instagram/ig-10.webp'}
                  alt={collection.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[1600ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/5" />
                <div className="absolute inset-3 border border-warm-white/15 transition-colors duration-700 group-hover:border-gold-primary/60" />
                <span className="absolute left-7 top-7 text-[9px] uppercase tracking-[0.34em] text-gold-primary">0{index + 1}</span>
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <h3 className="font-display text-4xl font-light leading-none md:text-5xl">
                    {collection.shortName || collection.name.replace('Collezione ', '')}
                  </h3>
                  <p className="mt-3 max-w-xs text-xs font-light leading-relaxed text-warm-white/70">{collection.tagline}</p>
                  <span className="mt-6 inline-flex items-center gap-2 border-b border-gold-primary/40 pb-1 text-[9px] uppercase tracking-[0.3em] text-gold-primary">
                    {t('explore')} <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gold-primary/20 bg-[#181613] py-16 text-warm-white md:py-20">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="mb-9 text-center">
            <span className="mb-3 block text-[9px] uppercase tracking-[0.44em] text-gold-primary">{t('browseBy')}</span>
            <h2 className="font-display text-3xl font-light md:text-4xl"><em className="italic">{t('byMaterial')}</em></h2>
          </div>
          <div className="grid grid-cols-2 border-l border-t border-gold-primary/20 md:grid-cols-5">
            {materials.map((material) => (
              <Link
                key={material.slug}
                href={`/collezioni/${material.slug}`}
                className="group border-b border-r border-gold-primary/20 px-4 py-7 text-center transition-colors duration-500 hover:bg-gold-primary hover:text-soft-black md:px-6 md:py-9"
              >
                <span className="mb-2 block text-[8px] uppercase tracking-[0.28em] text-gold-primary transition-colors group-hover:text-soft-black/60">({material.code})</span>
                <h3 className="font-display text-2xl font-light md:text-3xl">{material.name}</h3>
                <p className="mx-auto mt-2 hidden max-w-[13rem] text-[10px] font-light leading-relaxed text-warm-white/50 transition-colors group-hover:text-soft-black/65 lg:block">{material.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#11100e] py-20 text-warm-white md:py-28">
        <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
          <div className="mb-12 md:mb-16">
            <span className="mb-4 block h-px w-14 bg-gold-primary" />
            <span className="mb-3 block text-[9px] uppercase tracking-[0.44em] text-gold-primary">{t('browseBy')}</span>
            <h2 className="font-display text-4xl font-light md:text-6xl"><em className="italic">{t('byCategory')}</em></h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-5">
            {categories.map((category) => {
              const image = CATEGORY_EDITORIAL_IMAGES[category.slug] || ('image' in category ? category.image as string : '');
              return (
                <Link
                  key={category.slug}
                  href={`/collezioni/${category.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden border border-gold-primary/20 bg-[#24211c]"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-[1500ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.07]"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                  <div className="absolute inset-2 border border-warm-white/10 transition-colors duration-700 group-hover:border-gold-primary/65 md:inset-3" />
                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                    {'material' in category && (
                      <span className="mb-2 block text-[8px] uppercase tracking-[0.32em] text-gold-primary md:text-[9px]">{category.material as string}</span>
                    )}
                    <h3 className="font-display text-2xl font-light leading-[0.95] md:text-3xl">{category.name}</h3>
                    <p className="mt-3 hidden text-[10px] font-light leading-relaxed text-warm-white/60 md:line-clamp-2 md:block">{category.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.27em] text-gold-primary md:text-[9px]">
                      {t('explore')} <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f2ede4] py-20 md:py-28">
        <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
          <div className="mb-12 border-b border-soft-black/15 pb-8 text-center">
            <span className="mb-3 block text-[9px] uppercase tracking-[0.44em] text-gold-dark">{t('allLabel')}</span>
            <h2 className="font-display text-4xl font-light md:text-5xl"><em className="italic">{t('allTitle')}</em></h2>
          </div>
          <ProductFilters products={products} categories={categories} materials={materials} collections={collections} />
        </div>
      </section>
    </>
  );
}
