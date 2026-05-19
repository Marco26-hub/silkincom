import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <section className="min-h-screen bg-warm-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6">
          {t('tag')}
        </span>
        <h1 className="font-display font-light text-5xl text-soft-black mb-4">
          {t('title')}
        </h1>
        <p className="text-soft-grey font-light mb-10 leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/collezioni"
            className="px-8 py-3 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
          >
            {t('browseCollections')}
          </Link>
          <Link
            href="/"
            className="px-8 py-3 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:border-gold-primary hover:text-gold-primary transition-all duration-300"
          >
            {t('home')}
          </Link>
        </div>
      </div>
    </section>
  );
}
