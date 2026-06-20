import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localizedAlternates } from '@/i18n/routing';

// Server-only layout: the trame-di-como page itself is a client component
// ('use client'), so metadata + canonical/hreflang alternates have to live
// here in a server file.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('journal');
  return {
    title: `${t('title')} — SILKinCOM`,
    description: t('intro'),
    alternates: localizedAlternates(locale, '/trame-di-como'),
  };
}

export default function TrameDiComoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
