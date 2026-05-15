/**
 * Artisans roster — populated as Batch A user content arrives.
 *
 * To add an artisan:
 *  1. Drop hi-res portrait in /public/artisans/<slug>.jpg
 *  2. Add entry below
 *  3. Optionally map products → artisan in PRODUCT_ARTISAN_MAP
 *
 * Empty array means no attribution shown — graceful degradation.
 */

export type Artisan = {
  slug: string;
  name: string;
  role: string;            // 'Maestro Tessitore', 'Stampatore', etc.
  city: string;            // 'Cermenate (CO)'
  experienceYears?: number;
  bio: string;             // 50-120 words
  portrait?: string;       // path under /public, e.g. '/artisans/laura-bianchi.jpg'
  specialties?: string[];  // ['twill di seta', 'orlo a mano']
};

export const ARTISANS: Artisan[] = [
  // {
  //   slug: 'esempio-maestro',
  //   name: 'Nome Cognome',
  //   role: 'Maestro Tessitore',
  //   city: 'Cermenate (CO)',
  //   experienceYears: 30,
  //   bio: '...',
  //   portrait: '/artisans/esempio-maestro.jpg',
  //   specialties: ['twill di seta'],
  // },
];

/**
 * Map product slug → artisan slug.
 * Products without mapping fall through to no attribution.
 */
export const PRODUCT_ARTISAN_MAP: Record<string, string> = {
  // 'bellagio-1': 'esempio-maestro',
};

export function getArtisan(slug: string): Artisan | undefined {
  return ARTISANS.find((a) => a.slug === slug);
}

export function getProductArtisan(productSlug: string): Artisan | undefined {
  const artisanSlug = PRODUCT_ARTISAN_MAP[productSlug];
  return artisanSlug ? getArtisan(artisanSlug) : undefined;
}
