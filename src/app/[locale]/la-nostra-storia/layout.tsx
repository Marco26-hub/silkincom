import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';
import { APP_URL } from '@/lib/app-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'La Nostra Storia — Eleganza e Artigianato di Como',
    description:
      'SILKinCOM nasce dal cuore del distretto serico di Como. Una tradizione tessile secolare reinterpretata con design contemporaneo.',
    alternates: localizedAlternates(locale, '/la-nostra-storia'),
  };
}

// AboutPage schema strengthens E-E-A-T signals for AI/GEO crawlers
// and makes the founder attribution explicit.
const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${APP_URL}/la-nostra-storia#aboutpage`,
  url: `${APP_URL}/la-nostra-storia`,
  name: 'La Nostra Storia — SILKinCOM',
  description:
    'Heritage tessile di SILKinCOM nel distretto serico di Como, fondazione, valori e visione di Marco Dibenedetto.',
  mainEntity: {
    '@type': 'Organization',
    '@id': `${APP_URL}/#organization`,
    name: 'SILKinCOM',
    foundingLocation: 'Como, Italia',
    founder: {
      '@type': 'Person',
      name: 'Marco Dibenedetto',
      jobTitle: 'Fondatore',
      worksFor: { '@id': `${APP_URL}/#organization` },
    },
  },
};

export default function StoriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      {children}
    </>
  );
}
