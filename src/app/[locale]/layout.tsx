import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Inter, Libre_Baskerville } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { isRecessoEnabled } from '@/lib/recesso';
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

const baskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-baskerville',
  display: 'swap',
});

const OG_LOCALE: Record<string, string> = {
  it: 'it_IT', en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', pt: 'pt_PT', nl: 'nl_NL',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ogLocale = OG_LOCALE[locale] ?? 'it_IT';
  return {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'SILKinCOM — Sciarpe in seta e cashmere, Made in Como',
    template: '%s | SILKinCOM',
  },
  description:
    'Sciarpe, foulard e pashmine in seta e cashmere, 100% Made in Como dal distretto serico più importante d\'Europa. Spedizione gratuita oltre €200.',
  keywords: [
    'sciarpe seta Como',
    'foulard seta italiano',
    'pashmina cashmere',
    'twilly seta Como',
    'accessori cashmere lusso',
    'made in Como',
    'sciarpe lusso italiane',
    'tessile comasco',
    'lago di Como brand',
    'silkincom',
    'cashmere mongolo Como',
    'lino estate Italia',
    'cotone extra lungo',
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
    title: 'SILKinCOM — Sciarpe in seta e cashmere, Made in Como',
    description:
      'Sciarpe, foulard, pashmine in seta e cashmere. 100% Made in Como dal distretto serico. Spedizione gratuita oltre €200.',
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
    site: '@silkincom.official',
    creator: '@silkincom.official',
    title: 'SILKinCOM | Sciarpe e Accessori in Seta e Cashmere',
    description:
      'Accessori premium 100% Made in Como. Seta, cashmere e fibre naturali pregiate.',
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
  icons: {
    // Official Lake Como mark (gold #D4AF37 on soft-black) from the brand PDF.
    // SVG first — modern browsers prefer it and it scales crisp at any DPR.
    // .ico (16/32/48) is the legacy fallback; icon.png the hi-res raster
    // fallback; apple-icon.png the iOS home-screen tile (iOS ignores SVG).
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
  },
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
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 45.7408,
    longitude: 9.0856,
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
    'https://www.linkedin.com/company/silkincom',
    'https://www.youtube.com/@silkincom',
    'https://www.wikidata.org/wiki/Special:Search?search=SILKinCOM',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${APP_URL}/#website`,
  url: APP_URL,
  name: 'SILKinCOM',
  inLanguage: 'it-IT',
  publisher: { '@id': `${APP_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${APP_URL}/collezioni?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
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
  const recessoEnabled = await isRecessoEnabled();

  return (
    <html lang={locale} className={`${cormorant.variable} ${inter.variable} ${baskerville.variable}`}>
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
          <PublicChrome announcementSection={announcementSection} recessoEnabled={recessoEnabled}>{children}</PublicChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
