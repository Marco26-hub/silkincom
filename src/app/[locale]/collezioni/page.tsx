import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { getCollections, getCategories, getMaterials, getProducts } from '@/data/catalog';
import { localizedAlternates } from '@/i18n/routing';
import { ProductFilters } from '@/components/collezioni/ProductFilters';

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: 'Collezioni — Sciarpe e Foulard in Seta e Cashmere',
    description: 'Scopri le collezioni SILKinCOM: Inverno, Iconica, Primavera 2026. Cashmere, lana, seta, lino e cotone. Made in Como.',
    alternates: localizedAlternates(locale, '/collezioni'),
  };
}

export default async function CollezioniPage() {
  const t = await getTranslations('collezioni');
  const locale = await getLocale();
  const collections = getCollections(locale);
  const categories = getCategories(locale);
  const materials = getMaterials(locale);
  return (
    <>
      <section className="pt-40 pb-16 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            {t('eyebrow')}
          </span>
          <h1 className="font-display font-light text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
            {t('titlePlain')} <em className="italic text-gold-primary">{t('titleAccent')}</em>
          </h1>
          <p className="max-w-2xl mx-auto text-base font-light text-soft-black/70">
            {t('description')}
          </p>
        </div>
      </section>

      {/* Featured collections — 3 columns: Inverno, Iconica, Primavera */}
      <section className="py-20 bg-warm-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collezioni/${c.slug}`}
                className="group relative block overflow-hidden bg-beige-light aspect-[3/4]"
              >
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/85 via-soft-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-warm-white">
                  <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-2">
                    {t('collectionLabel')}
                  </span>
                  <h2 className="font-display font-light text-3xl md:text-4xl mb-2 leading-tight">
                    {c.name.replace('Collezione ', '')}
                  </h2>
                  <p className="text-xs font-light leading-relaxed text-warm-white/80 max-w-xs">
                    {c.tagline}
                  </p>
                  <span className="inline-block mt-4 text-[10px] uppercase tracking-[0.3em] text-gold-primary border-b border-gold-primary/40 pb-1 group-hover:border-gold-primary transition-colors">
                    {t('explore')} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Material shortcuts */}
      <section className="py-16 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-10">
            <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-3">
              {t('browseBy')}
            </span>
            <h2 className="font-display font-light text-3xl md:text-4xl">
              <em className="italic">{t('byMaterial')}</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {materials.map((m) => (
              <Link
                key={m.slug}
                href={`/collezioni/${m.slug}`}
                className="group block bg-warm-white border border-pearl-grey/40 px-6 py-8 text-center hover:border-gold-primary transition-all duration-300"
              >
                <span className="block text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-2">
                  ({m.code})
                </span>
                <h3 className="font-display text-2xl font-light mb-2 group-hover:text-gold-primary transition-colors">
                  {m.name}
                </h3>
                <p className="text-[11px] text-soft-grey font-light leading-relaxed">
                  {m.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories grid — luxury editorial cards */}
      <section className="py-24 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-16">
            <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4">
              {t('browseBy')}
            </span>
            <h2 className="font-display font-light text-4xl md:text-5xl">
              <em className="italic">{t('byCategory')}</em>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-pearl-grey/30">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/collezioni/${c.slug}`}
                className="group relative block bg-warm-white overflow-hidden"
              >
                {/* Product image — clean, fits naturally with breathing room */}
                <div className="relative aspect-[3/4] overflow-hidden bg-ivory">
                  {'image' in c && c.image ? (
                    <Image
                      src={c.image as string}
                      alt={c.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-contain p-6 md:p-8 object-center transition-transform duration-[1800ms] ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-beige-light" />
                  )}
                  {/* Extremely subtle vignette — product breathes */}
                  <div className="absolute inset-0 bg-gradient-to-t from-soft-black/30 via-transparent to-transparent opacity-50 pointer-events-none" />

                  {/* Gold hairline border appears on hover */}
                  <div className="absolute inset-0 border border-gold-primary/0 group-hover:border-gold-primary/60 transition-all duration-700 pointer-events-none" />
                </div>

                {/* Text block — always visible, below image */}
                <div className="px-4 py-5 border-t border-pearl-grey/40 group-hover:border-gold-primary/30 transition-colors duration-700 bg-warm-white">
                  {/* Material label — ultra tracked */}
                  {'material' in c && (
                    <span className="block text-[9px] uppercase tracking-[0.4em] text-gold-primary mb-1.5 font-light">
                      {(c as { material: string }).material}
                    </span>
                  )}
                  <h3 className="font-display font-light text-lg md:text-xl leading-none group-hover:text-gold-primary transition-colors duration-500">
                    {c.name}
                  </h3>
                  {/* Description — measured reveal */}
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-light text-soft-grey leading-relaxed mt-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-75">
                      {c.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] text-gold-primary mt-3 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                      {t('explore')} <ArrowUpRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All products with filters */}
      <section className="py-16 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-center mb-10">
            <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-3">
              {t('allLabel')}
            </span>
            <h2 className="font-display font-light text-3xl md:text-4xl">
              <em className="italic">{t('allTitle')}</em>
            </h2>
          </div>
          <ProductFilters products={await getProducts(locale)} categories={categories} materials={materials} collections={collections} />
        </div>
      </section>
    </>
  );
}
