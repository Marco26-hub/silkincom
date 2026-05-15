/**
 * Brand credentials — populated as proof-points become available.
 *
 * Pattern: each item has a label (visible alt-text) + image (logo) + url (where to verify).
 * Footer shows grids only when arrays are non-empty.
 *
 * To populate:
 *  1. Drop logo SVG/PNG (transparent bg, monochrome dark, ≥120px wide) into /public/credentials/
 *  2. Add entry below
 *  3. Footer renders automatically
 */

export type Credential = {
  label: string;
  image: string;     // path under /public
  url?: string;      // optional verification link
};

/**
 * Industry / supply-chain certifications.
 * Examples: OEKO-TEX, Seri.co, Made in Italy consortium, GOTS.
 */
export const CERTIFICATIONS: Credential[] = [
  // { label: 'OEKO-TEX Standard 100', image: '/credentials/oeko-tex.png', url: 'https://www.oeko-tex.com' },
  // { label: 'Seri.co', image: '/credentials/serico.png', url: 'https://www.textilecomo.com' },
];

/**
 * Awards / recognitions.
 */
export const AWARDS: Credential[] = [];
