import type { Metadata } from 'next';
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
  return {
    title: 'Trame di Como — Journal SILKinCOM',
    description:
      'Editoriali, racconti e storie dalla Maison SILKinCOM. Tradizione tessile, artigiani e maestria del Lago di Como.',
    alternates: localizedAlternates(locale, '/trame-di-como'),
  };
}

export default function TrameDiComoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
