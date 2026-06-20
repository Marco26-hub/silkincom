import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountClient } from './AccountClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  };
}

export default function AccountPage() {
  return <AccountClient />;
}
