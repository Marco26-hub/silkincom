import { getLocale, getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';
import { ContattiClient } from './ContattiClient';

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations('contatti');
  return {
    title: t('title'),
    description: t('description'),
    alternates: localizedAlternates(locale, '/contatti'),
  };
}

export default function ContattiPage() {
  return <ContattiClient />;
}
