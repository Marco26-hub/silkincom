import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { APP_URL } from '@/lib/app-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('storia');
  return {
    title: `${t('titleP1')} ${t('titleP2')} ${t('titleAccent')}`,
    description: t('storyP1'),
    alternates: localizedAlternates(locale, '/la-nostra-storia'),
  };
}

export default async function StoriaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('storia');
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${APP_URL}${prefix}/la-nostra-storia#aboutpage`,
    url: `${APP_URL}${prefix}/la-nostra-storia`,
    name: `${t('titleP1')} ${t('titleP2')} ${t('titleAccent')}`,
    description: t('storyP1'),
    inLanguage: locale,
    mainEntity: {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'SILKinCOM',
      foundingLocation: 'Como, Italy',
      founder: {
        '@type': 'Person',
        '@id': `${APP_URL}/maison/marco-dibenedetto#person`,
        name: 'Marco Dibenedetto',
        worksFor: { '@id': `${APP_URL}/#organization` },
      },
    },
  };
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
