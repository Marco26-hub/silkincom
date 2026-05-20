import { getStaticPage } from '@/data/static-pages';
import { StaticPageBlocks } from '@/components/static-pages/StaticPageBlocks';
import { LegacyStoria } from './_legacy';

export default async function StoriaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await getStaticPage('la-nostra-storia', locale);
  if (page && page.blocks && page.blocks.length > 0) {
    return <StaticPageBlocks blocks={page.blocks} locale={locale} />;
  }
  return <LegacyStoria />;
}
