import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Inter, Libre_Baskerville } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { Analytics } from '@/components/analytics/Analytics';
import { routing } from '@/i18n/routing';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app'),
  title: {
    default: 'SILKinCOM | Sciarpe e Accessori in Seta e Cashmere — Made in Como',
    template: '%s | SILKinCOM',
  },
  description:
    'SILKinCOM crea sciarpe, foulard, twilly e pashmine in pura seta e cashmere, interamente disegnate e confezionate sul Lago di Como. Tradizione tessile comasca dal 1400, eleganza italiana 100% Made in Italy.',
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
  authors: [{ name: 'SILKinCOM', url: process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app' }],
  creator: 'SILKinCOM',
  publisher: 'SILKinCOM',
  category: 'fashion',
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: 'SILKinCOM',
    title: 'SILKinCOM | Sciarpe e Accessori in Seta e Cashmere — Made in Como',
    description:
      'Accessori premium in seta, cashmere, lana, lino e cotone. 100% Made in Como, sul Lago di Como. Tradizione tessile dal 1400.',
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
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.svg',
  },
  verification: {
    other: {
      'msvalidate.01': '',
    },
  },
};

// JSON-LD: Organization + LocalBusiness — boost AI/GEO discoverability
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  '@id': 'https://silkincom.com/#organization',
  name: 'SILKinCOM',
  alternateName: 'SILK in COM',
  url: 'https://silkincom.vercel.app',
  logo: 'https://silkincom.vercel.app/logo-official.png',
  image: 'https://silkincom.vercel.app/og-image.jpg',
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
  founder: { '@type': 'Person', name: 'Marco Dibenedetto' },
  sameAs: [
    'https://www.instagram.com/silkincom.official/',
    'https://www.facebook.com/profile.php?id=61581900780447',
    'https://it.pinterest.com/silkincomofficial',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://silkincom.com/#website',
  url: 'https://silkincom.vercel.app',
  name: 'SILKinCOM',
  inLanguage: 'it-IT',
  publisher: { '@id': 'https://silkincom.com/#organization' },
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://silkincom.vercel.app/collezioni?q={search_term_string}',
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

  return (
    <html lang={locale} className={`${cormorant.variable} ${inter.variable} ${baskerville.variable}`}>
      <head>
        {/* Preconnect critical third-party origins */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://static.wixstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
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
          <PublicChrome>{children}</PublicChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
