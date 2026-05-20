import type { Metadata } from 'next';
import { localizedAlternates } from '@/i18n/routing';

// Server-only layout: the materiali page is 'use client', so metadata +
// canonical/hreflang alternates have to live here in a server file.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Materiali — Seta, Cashmere, Lana, Lino, Cotone Made in Como',
    description:
      'Le fibre naturali nobili di SILKinCOM: seta comasca, cashmere mongolo, lana merino, lino europeo e cotone extra-lungo. Materie prime tracciate, lavorate sul Lago di Como.',
    alternates: localizedAlternates(locale, '/materiali'),
  };
}

export default function MaterialiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
