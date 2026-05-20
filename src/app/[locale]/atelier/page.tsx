import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { getStaticPage } from '@/data/static-pages';
import { StaticPageBlocks } from '@/components/static-pages/StaticPageBlocks';
import { LegacyAtelier } from './_legacy';

export const metadata = {
  title: 'Atelier — Su misura',
  description: 'Sciarpe e foulard personalizzati: scegli colori, dimensioni e finiture insieme ai nostri tessitori comaschi.',
};

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
