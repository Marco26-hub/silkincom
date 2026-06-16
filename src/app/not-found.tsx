// Root-level not-found.tsx — this is the only correct place for Next.js App Router
// to set HTTP 404. A not-found.tsx under a dynamic segment like [locale] renders
// with HTTP 200 (soft-404 bug), so we handle it here and delete the [locale] one.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Cormorant_Garamond, Inter, Libre_Baskerville } from 'next/font/google';
import { Home, Search, Package, ScrollText, Mail } from 'lucide-react';
import { DEFAULT_LOCALE, isValidLocale } from '@/i18n/routing';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const baskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-baskerville',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pagina non trovata | SILKinCOM',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const headersList = await headers();
  // next-intl middleware sets x-next-intl-locale on every request.
  const localeHeader = headersList.get('x-next-intl-locale');
  const locale = isValidLocale(localeHeader) ? localeHeader : DEFAULT_LOCALE;

  // Load translations outside next-intl provider context.
  let nf: Record<string, string> = {};
  try {
    const mod = await import(`../../messages/${locale}.json`);
    const msgs = mod.default as Record<string, unknown>;
    nf = (msgs.notFound ?? {}) as Record<string, string>;
  } catch {
    // fallback: inline defaults below
  }
  const t = (key: string, fallback: string): string => nf[key] ?? fallback;

  // With localePrefix:'as-needed', default locale has no prefix.
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  const QUICK_LINKS = [
    { href: `${prefix}/collezioni`, label: t('browseCollections', 'Esplora le collezioni'), icon: Package },
    { href: `${prefix}/trame-di-como`, label: t('journal', 'Journal'), icon: ScrollText },
    { href: `${prefix}/contatti`, label: t('contact', 'Contatti'), icon: Mail },
  ];

  return (
    <html lang={locale} className={`${cormorant.variable} ${inter.variable} ${baskerville.variable}`}>
      <body className="min-h-screen bg-warm-white text-soft-black antialiased">
        <section className="min-h-[80vh] bg-warm-white flex items-center justify-center px-6 py-32">
          <div className="text-center max-w-2xl">
            <p className="font-display font-light text-[10rem] md:text-[14rem] leading-none text-gold-primary/15 select-none -mb-8 md:-mb-12">
              404
            </p>

            <span className="block text-[11px] uppercase tracking-[0.5em] text-gold-primary mb-5 relative">
              {t('tag', '404')}
            </span>
            <h1 className="font-display font-light text-4xl md:text-5xl lg:text-6xl text-soft-black mb-5 leading-tight">
              {t('title', 'Pagina non trovata')}
            </h1>
            <p className="text-soft-grey font-light mb-10 leading-relaxed text-base md:text-lg max-w-lg mx-auto">
              {t('subtitle', 'La pagina che stai cercando non esiste o è stata spostata.')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <Link
                href={prefix || '/'}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
              >
                <Home className="w-4 h-4" />
                {t('home', 'Home')}
              </Link>
              <Link
                href={`${prefix}/collezioni`}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:border-gold-primary hover:text-gold-primary transition-all duration-300"
              >
                <Search className="w-4 h-4" />
                {t('browseCollections', 'Esplora le collezioni')}
              </Link>
            </div>

            <div className="pt-8 border-t border-pearl-grey/60">
              <p className="text-[10px] uppercase tracking-[0.4em] text-soft-grey mb-5">
                {t('exploreLabel', 'Esplora')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center justify-center gap-2 px-4 py-3 bg-ivory border border-pearl-grey hover:border-gold-primary text-xs uppercase tracking-[0.2em] text-soft-black hover:text-gold-dark transition-all duration-300"
                  >
                    <Icon className="w-3.5 h-3.5 text-gold-primary group-hover:text-gold-dark transition-colors" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
