import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { Search, Home, Package, ScrollText, Mail } from 'lucide-react';

export const metadata = {
  title: 'Pagina non trovata',
  robots: { index: false, follow: true },
};

const QUICK_LINKS = [
  { href: '/collezioni', labelKey: 'browseCollections', icon: Package },
  { href: '/trame-di-como', labelKey: 'journal', icon: ScrollText },
  { href: '/contatti', labelKey: 'contact', icon: Mail },
];

export default async function NotFound() {
  const t = await getTranslations('notFound');
  // Some legacy translations may not include the new keys; fall back gracefully.
  const safe = (k: string, fallback: string) => {
    try { return t(k); } catch { return fallback; }
  };

  return (
    <section className="min-h-[80vh] bg-warm-white flex items-center justify-center px-6 py-32">
      <div className="text-center max-w-2xl">
        {/* 404 numeral, premium typography */}
        <p className="font-display font-light text-[10rem] md:text-[14rem] leading-none text-gold-primary/15 select-none -mb-8 md:-mb-12">
          404
        </p>

        <span className="block text-[11px] uppercase tracking-[0.5em] text-gold-primary mb-5 relative">
          {t('tag')}
        </span>
        <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl text-soft-black mb-5 leading-tight">
          {t('title')}
        </h1>
        <p className="text-soft-grey font-light mb-10 leading-relaxed text-base md:text-lg max-w-lg mx-auto">
          {t('subtitle')}
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            {t('home')}
          </Link>
          <Link
            href="/collezioni"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:border-gold-primary hover:text-gold-primary transition-all duration-300"
          >
            <Search className="w-4 h-4" />
            {t('browseCollections')}
          </Link>
        </div>

        {/* Quick links — surface key sections so even a wrong URL ends up productive */}
        <div className="pt-8 border-t border-pearl-grey/60">
          <p className="text-[10px] uppercase tracking-[0.4em] text-soft-grey mb-5">
            {safe('exploreLabel', 'Esplora')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ href, labelKey, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-center gap-2 px-4 py-3 bg-ivory border border-pearl-grey hover:border-gold-primary text-xs uppercase tracking-[0.2em] text-soft-black hover:text-gold-dark transition-all duration-300"
              >
                <Icon className="w-3.5 h-3.5 text-gold-primary group-hover:text-gold-dark transition-colors" />
                {safe(labelKey, labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
