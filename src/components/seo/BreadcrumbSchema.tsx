import { APP_URL } from '@/lib/app-url';
/**
 * Reusable JSON-LD BreadcrumbList injector.
 *
 * Usage (in any server or client component, but typically a page):
 *   <BreadcrumbSchema
 *     trail={[
 *       { name: 'Home', path: '/' },
 *       { name: 'Contatti', path: '/contatti' },
 *     ]}
 *   />
 *
 * - First item is always Home.
 * - URLs are built from NEXT_PUBLIC_APP_URL (or silkincom.com fallback) so
 *   they automatically follow the cutover.
 * - Renders a single <script type="application/ld+json"> — invisible to
 *   users, surfaced to Google + AI crawlers.
 */

export type BreadcrumbItem = {
  name: string;
  path: string; // e.g. '/contatti'  — leading slash, default locale (Italian unprefixed)
};

export function BreadcrumbSchema({ trail, locale }: { trail: BreadcrumbItem[]; locale?: string }) {
  const prefix = locale && locale !== 'it' ? `/${locale}` : '';
  const itemListElement = trail.map((t, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: t.name,
    item: t.path === '/' ? `${APP_URL}${prefix || '/'}` : `${APP_URL}${prefix}${t.path}`,
  }));

  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
