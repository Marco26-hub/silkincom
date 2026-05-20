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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

const MATERIALS_LIST = [
  { slug: 'seta', name: 'Seta di Como', desc: 'Tradizione comasca dal XV secolo. Fibra proteica luminosa, ipoallergenica, traspirante.' },
  { slug: 'cashmere', name: 'Cashmere Mongolia', desc: 'Sottopelo finissimo 12–16 micron, raccolto a mano, calore senza peso.' },
  { slug: 'lana', name: 'Lana Merino', desc: 'Naturalmente traspirante e termoregolatrice.' },
  { slug: 'lino', name: 'Lino Europeo', desc: "Freschezza naturale per l'estate mediterranea." },
  { slug: 'cotone', name: 'Cotone Extra-Lungo', desc: 'Fibra superiore oltre 35 mm, morbidezza setosa.' },
];

const itemListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  '@id': `${BASE_URL}/materiali#itemlist`,
  name: 'Materiali SILKinCOM',
  numberOfItems: MATERIALS_LIST.length,
  itemListElement: MATERIALS_LIST.map((m, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Product',
      name: m.name,
      description: m.desc,
      category: 'Materiale tessile',
      url: `${BASE_URL}/collezioni/${m.slug}`,
    },
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Materiali', item: `${BASE_URL}/materiali` },
  ],
};

export default function MaterialiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
