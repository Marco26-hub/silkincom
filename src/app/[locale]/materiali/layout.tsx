import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { getMaterials } from '@/data/catalog-meta';
import { APP_URL } from '@/lib/app-url';

// Server-only layout: the materiali page is 'use client', so metadata +
// canonical/hreflang alternates have to live here in a server file.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('materialiPage');
  return {
    title: `${t('titleP1')} — ${t('titleAccent')}`,
    description: t('description'),
    alternates: localizedAlternates(locale, '/materiali'),
  };
}

export default async function MaterialiLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('materialiPage');
  const prefix = locale === 'it' ? '' : `/${locale}`;
  const materials = getMaterials(locale);
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${APP_URL}${prefix}/materiali#itemlist`,
    name: `${t('titleP1')} ${t('titleAccent')}`,
    numberOfItems: materials.length,
    itemListElement: materials.map((material, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Thing',
        name: material.name,
        description: material.description,
        url: `${APP_URL}${prefix}/collezioni/${material.slug}`,
      },
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SILKinCOM', item: `${APP_URL}${prefix || '/'}` },
      { '@type': 'ListItem', position: 2, name: t('titleP1'), item: `${APP_URL}${prefix}/materiali` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
