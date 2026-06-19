import { getLocale } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { CategoryLanding } from '@/components/seo/CategoryLanding';
import { getSeoCategory, pickLocale } from '@/data/seo-categories';

const SLUG = 'foulard-seta';

export async function generateMetadata() {
  const locale = await getLocale();
  const cfg = getSeoCategory(SLUG);
  if (!cfg) return {};
  return {
    title: pickLocale(cfg.title, locale),
    description: pickLocale(cfg.description, locale),
    alternates: localizedAlternates(locale, `/${SLUG}`),
  };
}

export default async function Page() {
  const locale = await getLocale();
  return <CategoryLanding slug={SLUG} locale={locale} />;
}
