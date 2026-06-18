// Client-safe catalog module: types, taxonomy and sync getters.
// No server-only dependencies — importable from client components.
// DB-backed product queries live in catalog.ts (server-only).

import catalogI18n from './catalog-i18n.json';
import productsJson from './products.json';
import { LOCALES, type Locale } from '@/i18n/routing';

export type Material = 'seta' | 'cashmere' | 'lana' | 'lino' | 'cotone' | 'misto';
export type ProductGroup = 'abbigliamento' | 'accessori';

export type L10n = { it: string } & Partial<Record<Exclude<Locale, 'it'>, string>>;

type CatI18n = {
  materialName: Record<string, L10n>;
  materialDescription: Record<string, L10n>;
  categoryDescription: Record<string, L10n>;
  collectionName: Record<string, L10n>;
  collectionTagline: Record<string, L10n>;
  collectionDescription: Record<string, L10n>;
  collectionShortName: Record<string, L10n>;
  collectionAccent: Record<string, L10n>;
  groupName: Record<string, L10n>;
};
const i18n = catalogI18n as unknown as CatI18n;

export function pick(field: L10n, locale: string): string {
  return field[locale as Locale] ?? field.en ?? field.it;
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function normLocale(locale: string): Locale {
  return isLocale(locale) ? locale : 'it';
}

// ========== PRODUCT TYPES ==========

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'UNI';

export type ProductVariant = {
  id: string;
  sku: string;
  size: Size;
  priceOverride: number | null;
  available: number;
};

export type Product = {
  slug: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  descriptionShort: string;
  composition: string;
  dimensions: string;
  images: string[];
  category: string;
  collections: string[];
  material: Material;
  group?: ProductGroup;
  // Optional override for the type eyebrow shown on cards. When null/empty
  // we fall back to the category-derived default (lario→tshirt, darsena→cap,
  // …). Admin sets this per-product from /admin/prodotti/[id] when the
  // default mapping doesn't read right.
  productType?: string | null;
  // Size variants — populated for apparel categories (lario, melzi, riva,
  // tivan). Empty array for accessories (scarves, foulards). Sorted in
  // canonical XS→XXXL order.
  variants: ProductVariant[];
};

export type RawProduct = {
  slug: string;
  name: L10n;
  sku: string;
  price: number;
  description: L10n;
  composition: L10n;
  dimensions: string;
  images: string[];
};

const productsJsonData = productsJson as RawProduct[];
export const translationMap = new Map(productsJsonData.map((p) => [p.slug, p]));

export const PRODUCT_SLUGS: string[] = productsJsonData.map((p) => p.slug);

// ========== TAXONOMY ==========

const CATEGORY_MATERIAL: Record<string, Material> = {
  bellagio: 'cashmere',
  cernobbio: 'cashmere',
  tremezzo: 'lana',
  varenna: 'cashmere',
  'twilly-como': 'seta',
  darsena: 'cotone',
  lario: 'cotone',
  melzi: 'lino',
  riva: 'lino',
  tivan: 'cotone',
};

const CATEGORY_GROUP: Record<string, ProductGroup> = {
  darsena: 'abbigliamento',
  lario: 'abbigliamento',
  melzi: 'abbigliamento',
  riva: 'abbigliamento',
  bellagio: 'accessori',
  cernobbio: 'accessori',
  tremezzo: 'accessori',
  varenna: 'accessori',
  'twilly-como': 'accessori',
  tivan: 'accessori',
};

function categoryOf(slug: string): string {
  const s = slug.toLowerCase();
  if (s.startsWith('bellagio')) return 'bellagio';
  if (s.startsWith('cernobbio')) return 'cernobbio';
  if (s.startsWith('tremezzo')) return 'tremezzo';
  if (s.startsWith('varenna')) return 'varenna';
  if (s.startsWith('como')) return 'twilly-como';
  if (s.startsWith('darsena')) return 'darsena';
  if (s.startsWith('lario')) return 'lario';
  if (s.startsWith('melzi')) return 'melzi';
  if (s.startsWith('riva')) return 'riva';
  if (s.startsWith('tivan')) return 'tivan';
  return '';
}

function collectionsOf(category: string): string[] {
  // Some categories deliberately appear in multiple seasonal collections.
  // Twilly Como (silk neck pieces) are positioned as a year-round signature
  // — they belong to the Iconica capsule AND the Spring/Summer drop.
  // Darsena (lightweight caps) sits in the same bucket. Both surface twice
  // in the storefront so customers find them from either entry point.
  const collections: string[] = [];
  if (['twilly-como', 'darsena'].includes(category)) collections.push('iconica');
  if (['bellagio', 'cernobbio', 'tremezzo', 'varenna'].includes(category)) collections.push('inverno');
  if (['twilly-como', 'darsena', 'lario', 'melzi', 'riva', 'tivan'].includes(category)) collections.push('primavera');
  return collections;
}

export type ProductMeta = { category: string; collections: string[]; material: Material; group?: ProductGroup };

export function buildProductMeta(slug: string): ProductMeta {
  const category = categoryOf(slug);
  return {
    category,
    collections: collectionsOf(category),
    material: CATEGORY_MATERIAL[category] || 'misto',
    group: CATEGORY_GROUP[category],
  };
}

// ========== CATEGORIES ==========

const WIX = (id: string, w = 800, h = 1000) =>
  `https://static.wixstatic.com/media/${id}/v1/fill/w_${w},h_${h},al_c,q_90,usm_0.66_1.00_0.01/file.jpg`;

type RawCategory = { slug: string; name: string; material: L10n; description: L10n; image: string };
export type Category = { slug: string; name: string; material: string; description: string; image: string };

const CATEGORY_META: { slug: string; name: string; image: string }[] = [
  { slug: 'bellagio',    name: 'Bellagio',    image: WIX('b58e91_6653f43860d34a5eb0143cae9523a134~mv2.jpg') },
  { slug: 'cernobbio',   name: 'Cernobbio',   image: WIX('a34b56_3ccd9aefbaca4c5d9363c8711f5b3338~mv2.jpg') },
  { slug: 'tremezzo',    name: 'Tremezzo',    image: WIX('a34b56_1af2743a614c4ac1b255dd1e53c8f436~mv2.jpg') },
  { slug: 'varenna',     name: 'Varenna',     image: WIX('a34b56_e76f0bb5106c49df8f2ef2b5d8602b0e~mv2.jpg') },
  { slug: 'twilly-como', name: 'Twilly Como', image: WIX('b58e91_6e113b7ba95f4d81854d2300b10860e8~mv2.jpg') },
  { slug: 'darsena',     name: 'Darsena',     image: WIX('a34b56_0f40416a402e4011a78dba5f2849cf6f~mv2.jpg') },
  { slug: 'lario',       name: 'Lario',       image: WIX('a34b56_e9e62902bbed4ae4963738ab0861a880~mv2.jpg') },
  { slug: 'melzi',       name: 'Melzi',       image: WIX('a34b56_4cdb7894efaa4a128d5fb0714b80e743~mv2.jpg') },
  { slug: 'riva',        name: 'Riva',        image: WIX('a34b56_f44d83eee24c4e9d986b9c183bcfcccc~mv2.jpg') },
  { slug: 'tivan',       name: 'Tivan',       image: WIX('a34b56_7f5a6eb5f5ec474098fb2a72445ec974~mv2.jpg') },
];

const CATEGORIES_RAW: RawCategory[] = CATEGORY_META.map((c) => ({
  slug: c.slug,
  name: c.name,
  material: i18n.materialName[CATEGORY_MATERIAL[c.slug]],
  description: i18n.categoryDescription[c.slug],
  image: c.image,
}));

export const CATEGORY_SLUGS: string[] = CATEGORIES_RAW.map((c) => c.slug);

export function getCategories(locale: string): Category[] {
  const l = normLocale(locale);
  return CATEGORIES_RAW.map((c) => ({
    slug: c.slug,
    name: c.name,
    material: pick(c.material, l),
    description: pick(c.description, l),
    image: c.image,
  }));
}

// ========== COLLECTIONS ==========

type RawCollection = {
  slug: string;
  name: L10n;
  shortName: L10n;
  accent: L10n;
  tagline: L10n;
  description: L10n;
  image: string;
};
export type Collection = {
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  tagline: string;
  description: string;
  image: string;
};

const COLLECTION_META: { slug: string; image: string }[] = [
  { slug: 'inverno',   image: '/instagram/ig-06.webp' },
  { slug: 'iconica',   image: '/instagram/ig-02.webp' },
  { slug: 'primavera', image: '/instagram/ig-01.webp' },
];

const COLLECTIONS_RAW: RawCollection[] = COLLECTION_META.map((c) => ({
  slug: c.slug,
  name: i18n.collectionName[c.slug],
  shortName: i18n.collectionShortName[c.slug],
  accent: i18n.collectionAccent[c.slug],
  tagline: i18n.collectionTagline[c.slug],
  description: i18n.collectionDescription[c.slug],
  image: c.image,
}));

export const COLLECTION_SLUGS: string[] = COLLECTIONS_RAW.map((c) => c.slug);

export function getCollections(locale: string): Collection[] {
  const l = normLocale(locale);
  return COLLECTIONS_RAW.map((c) => ({
    slug: c.slug,
    name: pick(c.name, l),
    shortName: pick(c.shortName, l),
    accent: pick(c.accent, l),
    tagline: pick(c.tagline, l),
    description: pick(c.description, l),
    image: c.image,
  }));
}

// ========== MATERIALS ==========

type RawMaterialInfo = { slug: string; name: L10n; code: string; description: L10n };
export type MaterialInfo = { slug: string; name: string; code: string; description: string };

const MATERIAL_META: { slug: string; code: string }[] = [
  { slug: 'cashmere', code: 'WS' },
  { slug: 'lana',     code: 'WO' },
  { slug: 'seta',     code: 'SE' },
  { slug: 'lino',     code: 'LI' },
  { slug: 'cotone',   code: 'CO' },
];

const MATERIALS_RAW: RawMaterialInfo[] = MATERIAL_META.map((m) => ({
  slug: m.slug,
  name: i18n.materialName[m.slug],
  code: m.code,
  description: i18n.materialDescription[m.slug],
}));

export const MATERIAL_SLUGS: string[] = MATERIALS_RAW.map((m) => m.slug);

export function getMaterials(locale: string): MaterialInfo[] {
  const l = normLocale(locale);
  return MATERIALS_RAW.map((m) => ({
    slug: m.slug,
    name: pick(m.name, l),
    code: m.code,
    description: pick(m.description, l),
  }));
}

// ========== GROUPS ==========

type RawGroup = { slug: ProductGroup; name: L10n; categories: string[] };
export type Group = { slug: ProductGroup; name: string; categories: string[] };

const GROUPS_RAW: RawGroup[] = [
  { slug: 'abbigliamento', name: i18n.groupName.abbigliamento, categories: ['lario', 'riva', 'melzi', 'darsena'] },
  { slug: 'accessori',     name: i18n.groupName.accessori,     categories: ['bellagio', 'cernobbio', 'tremezzo', 'varenna', 'twilly-como', 'tivan'] },
];

export function getGroups(locale: string): Group[] {
  const l = normLocale(locale);
  return GROUPS_RAW.map((g) => ({ slug: g.slug, name: pick(g.name, l), categories: g.categories }));
}

// ========== TAXONOMY SLUGS ==========

export const TAXONOMY_SLUGS: string[] = [...CATEGORY_SLUGS, ...COLLECTION_SLUGS, ...MATERIAL_SLUGS];
