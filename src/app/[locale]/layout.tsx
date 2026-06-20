import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { Analytics } from '@/components/analytics/Analytics';
import { FirstPartyBeacon } from '@/components/analytics/FirstPartyBeacon';
import { routing } from '@/i18n/routing';
import { getHomeSection } from '@/data/home-content';
import { APP_URL } from '@/lib/app-url';

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

const OG_LOCALE: Record<string, string> = {
  it: 'it_IT', en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', pt: 'pt_PT', nl: 'nl_NL',
};

const SITE_META: Record<string, { title: string; description: string; socialTitle: string }> = {
  it: { title: 'SILKinCOM — Seta, Cashmere e Fibre Naturali Made in Como', description: 'Foulard in seta da €75, sciarpe in lana da €70 e cashmere da €120, confezionati nel distretto tessile di Como. Cofanetto Maison incluso.', socialTitle: 'SILKinCOM | Seta e Cashmere dal Lago di Como' },
  en: { title: 'SILKinCOM — Silk, Cashmere & Natural Fibres from Como', description: 'Silk scarves from €75, wool scarves from €70 and cashmere from €120, made in the Como textile district. Maison gift box included.', socialTitle: 'SILKinCOM | Silk & Cashmere from Lake Como' },
  es: { title: 'SILKinCOM — Seda, Cachemir y Fibras Naturales de Como', description: 'Pañuelos de seda desde 75 €, bufandas de lana desde 70 € y cachemir desde 120 €, confeccionados en el distrito textil de Como.', socialTitle: 'SILKinCOM | Seda y Cachemir del Lago de Como' },
  fr: { title: 'SILKinCOM — Soie, Cachemire et Fibres Naturelles de Côme', description: 'Foulards en soie dès 75 €, écharpes en laine dès 70 € et cachemire dès 120 €, confectionnés dans le district textile de Côme.', socialTitle: 'SILKinCOM | Soie et Cachemire du Lac de Côme' },
  de: { title: 'SILKinCOM — Seide, Cashmere & Naturfasern aus Como', description: 'Seidentücher ab 75 €, Wollschals ab 70 € und Cashmere ab 120 €, gefertigt im Textilbezirk von Como. Maison-Geschenkbox inklusive.', socialTitle: 'SILKinCOM | Seide & Cashmere vom Comer See' },
  pt: { title: 'SILKinCOM — Seda, Caxemira e Fibras Naturais de Como', description: 'Lenços de seda desde 75 €, cachecóis de lã desde 70 € e caxemira desde 120 €, confecionados no distrito têxtil de Como.', socialTitle: 'SILKinCOM | Seda e Caxemira do Lago de Como' },
  nl: { title: 'SILKinCOM — Zijde, Cashmere & Natuurlijke Vezels uit Como', description: 'Zijden sjaaltjes vanaf €75, wollen sjaals vanaf €70 en cashmere vanaf €120, gemaakt in het textieldistrict van Como.', socialTitle: 'SILKinCOM | Zijde & Cashmere van het Comomeer' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ogLocale = OG_LOCALE[locale] ?? 'it_IT';
  const metadata = SITE_META[locale] ?? SITE_META.en;
  return {
  metadataBase: new URL(APP_URL),
  title: {
    default: metadata.title,
    template: '%s | SILKinCOM',
  },
  description: metadata.description,
  keywords: [
    'sciarpe cashmere Como',
    'foulard seta italiano',
    'pashmina cashmere',
    'twilly seta Como',
    'accessori cashmere lusso',
    'made in Como',
    'sciarpe lusso italiane',
    'tessile comasco',
    'lago di Como brand',
    'silkincom',
    'lino estate Italia',
    'cotone Made in Italy',
  ],
  authors: [{ name: 'SILKinCOM', url: APP_URL }],
  creator: 'SILKinCOM',
  publisher: 'SILKinCOM',
  category: 'fashion',
  openGraph: {
    type: 'website',
    locale: ogLocale,
    alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== ogLocale),
    siteName: 'SILKinCOM',
    title: metadata.title,
    description: metadata.description,
    url: '/',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SILKinCOM — Accessori in seta e cashmere Made in Como',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: metadata.socialTitle,
    description: metadata.description,
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Icons are auto-detected from src/app/{icon.svg,icon.png,favicon.ico,apple-icon.png}
  // by the App Router — no metadata.icons block (the old one pointed at /public
  // files that don't exist → 404s + duplicate <link> tags). The Lake Como mark
  // (gold #E8C76A on #11100e) lives in those app/ files as the single source.
  verification: {
    google: 'LBplwrKCDJvhwLKGVo1iCSoJt9NUa1Anw5Fpk1KmcdA',
    other: {
      'msvalidate.01': '',
    },
  },
  };
}

// JSON-LD: Organization + LocalBusiness — boost AI/GEO discoverability
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  '@id': `${APP_URL}/#organization`,
  name: 'SILKinCOM',
  alternateName: 'SILK in COM',
  url: APP_URL,
  logo: `${APP_URL}/logo-official.png`,
  image: `${APP_URL}/og-image.jpg`,
  description:
    'SILKinCOM produce sciarpe, foulard, twilly e pashmine in pura seta e cashmere, interamente disegnate e confezionate a Como, capitale italiana del tessile di lusso.',
  foundingLocation: 'Como, Italia',
  areaServed: ['IT', 'EU', 'Worldwide'],
  knowsAbout: ['Seta di Como', 'Cashmere', 'Lana Merino', 'Lino', 'Cotone Extra-Lungo', 'Tessile di lusso', 'Made in Italy'],
  brand: { '@type': 'Brand', name: 'SILKinCOM' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Via Giuseppe Verdi 2/B',
    addressLocality: 'Cermenate',
    addressRegion: 'CO',
    postalCode: '22072',
    addressCountry: 'IT',
  },
  vatID: 'IT03786790133',
  founder: {
    '@type': 'Person',
    name: 'Marco Dibenedetto',
    jobTitle: 'Fondatore',
    url: `${APP_URL}/maison/marco-dibenedetto`,
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@silkincom.com',
      areaServed: ['IT', 'EU', 'Worldwide'],
      availableLanguage: ['Italian', 'English', 'Spanish', 'French', 'German', 'Portuguese', 'Dutch'],
    },
  ],
  sameAs: [
    'https://www.instagram.com/silkincom.official/',
    'https://www.facebook.com/profile.php?id=61581900780447',
    'https://it.pinterest.com/silkincomofficial',
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Reject any locale that isn't one we support so unknown prefixes 404.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this request's locale.
  setRequestLocale(locale);

  const messages = await getMessages();
  const announcementSection = await getHomeSection('announcement_bar', locale);
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${APP_URL}${prefix}/#website`,
    url: `${APP_URL}${prefix || '/'}`,
    name: 'SILKinCOM',
    inLanguage: OG_LOCALE[locale]?.replace('_', '-') ?? locale,
    publisher: { '@id': `${APP_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${APP_URL}${prefix}/collezioni?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang={locale} className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/* Preconnect critical third-party origins */}
        <link rel="preconnect" href="https://fjudulhxsafjizcmrifw.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://static.wixstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen bg-warm-white text-soft-black antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Analytics />
          <FirstPartyBeacon />
          <PublicChrome announcementSection={announcementSection}>{children}</PublicChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
