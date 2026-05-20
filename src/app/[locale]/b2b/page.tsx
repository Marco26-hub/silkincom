import { Link } from '@/i18n/navigation';
import { ArrowRight, Hotel, Gift, Briefcase } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export async function generateMetadata() {
  const t = await getTranslations('b2bPage');
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: { canonical: '/b2b' },
  };
}

export default async function B2BPage() {
  const t = await getTranslations('b2bPage');
  return (
    <>
      <BreadcrumbSchema
        trail={[
          { name: 'Home', path: '/' },
          { name: 'B2B', path: '/b2b' },
        ]}
      />

      {/* Hero */}
      <section className="pt-28 md:pt-44 pb-20 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('hero.eyebrow')}
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
            {t('hero.titleLine1')}<br />
            <em className="italic text-gold-primary">{t('hero.titleLine2')}</em>
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg font-light leading-relaxed text-soft-black/70">
            {t('hero.description')}
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 md:py-28 bg-warm-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {[
              {
                icon: Hotel,
                title: t('pillars.hotel.title'),
                body: t('pillars.hotel.body'),
              },
              {
                icon: Gift,
                title: t('pillars.gifting.title'),
                body: t('pillars.gifting.body'),
              },
              {
                icon: Briefcase,
                title: t('pillars.whiteLabel.title'),
                body: t('pillars.whiteLabel.body'),
              },
            ].map((p) => (
              <div key={p.title} className="text-center md:text-left">
                <span className="inline-flex w-12 h-12 items-center justify-center border border-gold-primary/40 mb-6">
                  <p.icon className="w-5 h-5 text-gold-primary stroke-1" />
                </span>
                <h3 className="font-display font-light text-2xl md:text-3xl mb-4">
                  {p.title}
                </h3>
                <p className="text-sm font-light leading-relaxed text-soft-black/70">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-soft-black text-warm-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('cta.eyebrow')}
          </span>
          <span className="block w-px h-8 bg-gold-primary mx-auto mb-7" />
          <h2 className="font-display font-light text-3xl md:text-4xl mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-sm font-light text-warm-white/70 mb-10 leading-relaxed">
            {t('cta.description')}
          </p>
          <Link
            href="mailto:b2b@silkincom.com?subject=Richiesta%20Listino%20B2B"
            className="inline-flex items-center gap-3 px-12 py-5 bg-gold-primary text-soft-black text-[10px] uppercase tracking-[0.4em] hover:bg-warm-white transition-all duration-500 group"
          >
            {t('cta.button')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
}
