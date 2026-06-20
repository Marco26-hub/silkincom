import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { getStaticPage } from '@/data/static-pages';
import { StaticPageBlocks } from '@/components/static-pages/StaticPageBlocks';
import { LegacyAtelier } from './_legacy';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [page, t] = await Promise.all([getStaticPage('atelier', locale), getTranslations('atelier')]);
  return {
    title: page?.metaTitle || `${t('titleP1')} — ${t('titleAccent')}`,
    description: page?.metaDescription || t('subtitle'),
    alternates: localizedAlternates(locale, '/atelier'),
  };
}

export default async function AtelierPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await getStaticPage('atelier', locale);
  return (
    <>
      <BreadcrumbSchema
        trail={[
          { name: 'Home', path: '/' },
          { name: 'Atelier', path: '/atelier' },
        ]}
      />
      {page && page.blocks && page.blocks.length > 0 ? (
        <StaticPageBlocks blocks={page.blocks} locale={locale} />
      ) : (
        <LegacyAtelier />
      )}
    </>
  );
}
