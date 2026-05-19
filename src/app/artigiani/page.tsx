import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LocalBusinessSchema } from '@/components/schemas/LocalBusinessSchema';

export async function generateMetadata() {
  const t = await getTranslations('artigianiPage');
  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
    alternates: { canonical: '/artigiani' },
  };
}

export default async function ArtigianiPage() {
  const t = await getTranslations('artigianiPage');

  const artisans = [
    {
      name: t('artisans.lorenzo.name'),
      role: t('artisans.lorenzo.role'),
      city: t('artisans.lorenzo.city'),
      image: '/artisans/telaio-artigiano-principale.png',
      alt: t('artisans.lorenzo.alt'),
      caption: t('artisans.lorenzo.caption'),
      story: t('artisans.lorenzo.story'),
    },
    {
      name: t('artisans.telaio.name'),
      role: t('artisans.telaio.role'),
      city: t('artisans.telaio.city'),
      image: '/artisans/telaio-silkincom-blu.png',
      alt: t('artisans.telaio.alt'),
      caption: t('artisans.telaio.caption'),
      story: t('artisans.telaio.story'),
    },
    {
      name: t('artisans.twill.name'),
      role: t('artisans.twill.role'),
      city: t('artisans.twill.city'),
      image: '/artisans/twill-dettaglio-jacquard.png',
      alt: t('artisans.twill.alt'),
      caption: t('artisans.twill.caption'),
      story: t('artisans.twill.story'),
    },
  ];

  return (
    <>
      <LocalBusinessSchema />

      {/* Hero */}
      <section className="pt-44 pb-20 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('hero.eyebrow')}
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
            {t.rich('hero.title', {
              em: (chunks) => (
                <em className="italic text-gold-primary">{chunks}</em>
              ),
            })}
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed text-soft-black/70">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-20 md:py-28 bg-warm-white">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-beige-light/70 to-warm-white" />
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 md:gap-12 items-end mb-14 md:mb-20">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-dark mb-4">
                {t('weaving.eyebrow')}
              </span>
              <h2 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
                {t('weaving.title')}
              </h2>
            </div>
            <p className="font-display italic text-xl md:text-2xl text-soft-black/70 leading-relaxed max-w-3xl lg:justify-self-end">
              {t('weaving.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {artisans.map((a) => (
              <div
                key={a.name}
                className="group overflow-hidden border border-pearl-grey/70 bg-ivory shadow-soft transition-all duration-500 hover:border-gold-primary/60 hover:shadow-luxe"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-beige-light">
                  <Image
                    src={a.image}
                    alt={a.alt}
                    fill
                    sizes="(min-width: 1024px) 31vw, (min-width: 640px) 47vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-soft-black/65 to-transparent pt-16 pb-5 px-5">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-warm-white/85">
                      {a.caption}
                    </p>
                  </div>
                </div>
                <div className="p-7 md:p-9">
                  <div className="flex items-start justify-between gap-5 mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-gold-dark mb-3">
                        {a.role}
                      </p>
                      <h3 className="font-display text-2xl font-light leading-tight">
                        {a.name}
                      </h3>
                    </div>
                    <span className="mt-1 h-px w-12 shrink-0 bg-gold-primary" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-lake-blue mb-5">
                    {a.city}
                  </p>
                  <p className="text-sm text-soft-black/75 font-light leading-relaxed">
                    {a.story}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              href="/la-nostra-storia"
              className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-soft-black border-b border-soft-black hover:border-gold-primary hover:text-gold-primary pb-1 transition-colors group"
            >
              {t('cta.label')}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
