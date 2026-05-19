import { Link } from '@/i18n/navigation';
import { Check, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('newsletterPages');
  return {
    title: t('confirmed.metaTitle'),
    robots: { index: false },
  };
}

export default async function ConfirmedPage() {
  const t = await getTranslations('newsletterPages');
  return (
    <section className="pt-44 pb-32 bg-warm-white min-h-[70vh]">
      <div className="max-w-md mx-auto px-6 text-center">
        <span className="inline-flex w-14 h-14 items-center justify-center border border-gold-primary/40 rounded-full mb-6">
          <Check className="w-6 h-6 text-gold-primary stroke-1" />
        </span>
        <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4">
          {t('confirmed.eyebrow')}
        </span>
        <h1 className="font-display font-light text-4xl md:text-5xl mb-4">
          {t('confirmed.title')}
        </h1>
        <p className="text-sm text-soft-black/70 font-light leading-relaxed mb-10">
          {t('confirmed.body')}
        </p>
        <Link
          href="/collezioni"
          className="inline-flex items-center gap-3 px-12 py-4 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.4em] hover:bg-gold-primary hover:text-soft-black transition-colors"
        >
          {t('confirmed.cta')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
