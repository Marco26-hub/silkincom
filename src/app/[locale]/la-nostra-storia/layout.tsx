import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';

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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

// AboutPage schema strengthens E-E-A-T signals for AI/GEO crawlers
// and makes the founder attribution explicit.
const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${BASE_URL}/la-nostra-storia#aboutpage`,
  url: `${BASE_URL}/la-nostra-storia`,
  name: 'La Nostra Storia — SILKinCOM',
  description:
    'Heritage tessile di SILKinCOM nel distretto serico di Como, fondazione, valori e visione di Marco Dibenedetto.',
  mainEntity: {
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'SILKinCOM',
    foundingLocation: 'Como, Italia',
    founder: {
      '@type': 'Person',
      name: 'Marco Dibenedetto',
      jobTitle: 'Fondatore',
      worksFor: { '@id': `${BASE_URL}/#organization` },
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
