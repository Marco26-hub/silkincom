import { getCollections, normLocale } from './catalog-meta';
import { WINTER_CATEGORY_COPY } from './winter-category-copy';

const LABELS = {
  it: { caps: 'Cappellini', tshirts: 'T-shirt', shirts: 'Camicie', twilly: 'Twilly' },
  en: { caps: 'Caps', tshirts: 'T-shirts', shirts: 'Shirts', twilly: 'Twilly' },
  es: { caps: 'Gorras', tshirts: 'Camisetas', shirts: 'Camisas', twilly: 'Twilly' },
  fr: { caps: 'Casquettes', tshirts: 'T-shirts', shirts: 'Chemises', twilly: 'Twilly' },
  de: { caps: 'Kappen', tshirts: 'T-Shirts', shirts: 'Hemden', twilly: 'Twilly' },
  pt: { caps: 'Bonés', tshirts: 'T-shirts', shirts: 'Camisas', twilly: 'Twilly' },
  nl: { caps: 'Petten', tshirts: 'T-shirts', shirts: 'Overhemden', twilly: 'Twilly' },
} as const;

export type CollectionNavigation = {
  slug: string;
  label: string;
  href: string;
  links: Array<{ href: string; label: string }>;
};

export function getCollectionNavigation(locale: string): CollectionNavigation[] {
  const normalized = normLocale(locale);
  const labels = LABELS[normalized];
  const winterCopy = WINTER_CATEGORY_COPY[normalized];
  const links: Record<string, CollectionNavigation['links']> = {
    inverno: (['abbigliamento', 'pashmine', 'sciarpe'] as const).map(area => ({
      href: `/collezioni/inverno/${area}`,
      label: winterCopy.areas[area].name,
    })),
    primavera: [
      { href: '/collezioni/darsena', label: labels.caps },
      { href: '/collezioni/lario', label: labels.tshirts },
      { href: '/collezioni/riva', label: labels.shirts },
    ],
    iconica: [{ href: '/collezioni/twilly-como', label: labels.twilly }],
  };
  const collections = getCollections(normalized);
  return ['inverno', 'primavera', 'iconica'].map(slug => ({
    slug,
    label: collections.find(collection => collection.slug === slug)!.shortName,
    href: `/collezioni/${slug}`,
    links: links[slug],
  }));
}
