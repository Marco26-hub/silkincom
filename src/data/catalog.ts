import productsJson from './products.json';
import catalogI18n from './catalog-i18n.json';
import { LOCALES, type Locale } from '@/i18n/routing';

export type Material = 'seta' | 'cashmere' | 'lana' | 'lino' | 'cotone' | 'misto';
export type ProductGroup = 'abbigliamento' | 'accessori';

// Localized string. `it` is the source of truth; other locales are optional.
// Resolution falls back: requested locale -> en -> it.
export type L10n = { it: string } & Partial<Record<Exclude<Locale, 'it'>, string>>;

// Catalog metadata translations (categories, collections, materials, groups) — all 7 locales.
type CatI18n = {
  materialName: Record<string, L10n>;
  materialDescription: Record<string, L10n>;
  categoryDescription: Record<string, L10n>;
  collectionName: Record<string, L10n>;
  collectionTagline: Record<string, L10n>;
  collectionDescription: Record<string, L10n>;
  groupName: Record<string, L10n>;
};
const i18n = catalogI18n as unknown as CatI18n;

function pick(field: L10n, locale: string): string {
  return field[locale as Locale] ?? field.en ?? field.it;
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function normLocale(locale: string): Locale {
  return isLocale(locale) ? locale : 'it';
}

// Raw product as stored in products.json (translatable fields are localized)
type RawProduct = {
  slug: string;
  name: L10n;
  sku: string;
  price: number;
  description: L10n;
  composition: L10n;
  dimensions: string;
  images: string[];
};

// Localized product as consumed by the UI
export type Product = {
  slug: string;
  name: string;
  sku: string;
  price: number;
  description: string;
  composition: string;
  dimensions: string;
  images: string[];
  category: string;
  collections: string[];
  material: Material;
  group?: ProductGroup;
};

const rawProducts = productsJson as RawProduct[];

// Material per category — single source of truth, matches the live silkincom.com taxonomy
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

// Macro-group per category: clothing vs accessories
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
  const collections: string[] = [];
  // Iconica: twilly e cappellini
  if (['twilly-como', 'darsena'].includes(category)) collections.push('iconica');
  // Inverno: winter materials (cashmere, wool scarves/pashminas)
  if (['bellagio', 'cernobbio', 'tremezzo', 'varenna'].includes(category)) collections.push('inverno');
  // Primavera: spring/summer materials (cotton, linen)
  if (['darsena', 'lario', 'melzi', 'riva', 'tivan'].includes(category)) collections.push('primavera');
  return collections;
}

// Catalog metadata for every product, derived once at module load (locale-agnostic)
type ProductMeta = { category: string; collections: string[]; material: Material; group?: ProductGroup };
const PRODUCT_META: Record<string, ProductMeta> = {};
for (const p of rawProducts) {
  const category = categoryOf(p.slug);
  PRODUCT_META[p.slug] = {
    category,
    collections: collectionsOf(category),
    material: CATEGORY_MATERIAL[category] || 'misto',
    group: CATEGORY_GROUP[category],
  };
}

function localizeProduct(p: RawProduct, locale: Locale): Product {
  const meta = PRODUCT_META[p.slug];
  return {
    slug: p.slug,
    name: pick(p.name, locale),
    sku: p.sku,
    price: p.price,
    description: pick(p.description, locale),
    composition: pick(p.composition, locale),
    dimensions: p.dimensions,
    images: p.images,
    category: meta.category,
    collections: meta.collections,
    material: meta.material,
    group: meta.group,
  };
}

// Product slugs — locale-agnostic, for generateStaticParams / sitemap
export const PRODUCT_SLUGS: string[] = rawProducts.map((p) => p.slug);

export function getProducts(locale: string): Product[] {
  const l = normLocale(locale);
  return rawProducts.map((p) => localizeProduct(p, l));
}

export function getProduct(slug: string, locale: string): Product | undefined {
  const p = rawProducts.find((x) => x.slug === slug);
  return p ? localizeProduct(p, normLocale(locale)) : undefined;
}

export function getProductsByCategory(category: string, locale: string): Product[] {
  return getProducts(locale).filter((p) => p.category === category);
}

export function getProductsByCollection(collection: string, locale: string): Product[] {
  return getProducts(locale).filter((p) => p.collections.includes(collection));
}

export function getProductsByMaterial(material: Material, locale: string): Product[] {
  return getProducts(locale).filter((p) => p.material === material);
}

export function getProductsByGroup(group: ProductGroup, locale: string): Product[] {
  return getProducts(locale).filter((p) => p.group === group);
}

export function getFeaturedProducts(locale: string, limit = 8): Product[] {
  return getProducts(locale).slice(0, limit);
}

// Categories with material/style information
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

// Main collections shown as featured
type RawCollection = { slug: string; name: L10n; tagline: L10n; description: L10n; image: string };
export type Collection = { slug: string; name: string; tagline: string; description: string; image: string };

const COLLECTION_META: { slug: string; image: string }[] = [
  { slug: 'inverno',   image: '/instagram/ig-06.jpg' },
  { slug: 'iconica',   image: '/instagram/ig-02.jpg' },
  { slug: 'primavera', image: '/instagram/ig-01.jpg' },
];

const COLLECTIONS_RAW: RawCollection[] = COLLECTION_META.map((c) => ({
  slug: c.slug,
  name: i18n.collectionName[c.slug],
  tagline: i18n.collectionTagline[c.slug],
  description: i18n.collectionDescription[c.slug],
  image: c.image,
}));

// Material info for filtering UI
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

// Macro-groups for top-level navigation
type RawGroup = { slug: ProductGroup; name: L10n; categories: string[] };
export type Group = { slug: ProductGroup; name: string; categories: string[] };

const GROUPS_RAW: RawGroup[] = [
  { slug: 'abbigliamento', name: i18n.groupName.abbigliamento, categories: ['lario', 'riva', 'melzi', 'darsena'] },
  { slug: 'accessori',     name: i18n.groupName.accessori,     categories: ['bellagio', 'cernobbio', 'tremezzo', 'varenna', 'twilly-como', 'tivan'] },
];

// Taxonomy slugs — locale-agnostic, for generateStaticParams / sitemap
export const CATEGORY_SLUGS: string[] = CATEGORIES_RAW.map((c) => c.slug);
export const COLLECTION_SLUGS: string[] = COLLECTIONS_RAW.map((c) => c.slug);
export const MATERIAL_SLUGS: string[] = MATERIALS_RAW.map((m) => m.slug);
export const TAXONOMY_SLUGS: string[] = [...CATEGORY_SLUGS, ...COLLECTION_SLUGS, ...MATERIAL_SLUGS];

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

export function getCollections(locale: string): Collection[] {
  const l = normLocale(locale);
  return COLLECTIONS_RAW.map((c) => ({
    slug: c.slug,
    name: pick(c.name, l),
    tagline: pick(c.tagline, l),
    description: pick(c.description, l),
    image: c.image,
  }));
}

export function getMaterials(locale: string): MaterialInfo[] {
  const l = normLocale(locale);
  return MATERIALS_RAW.map((m) => ({
    slug: m.slug,
    name: pick(m.name, l),
    code: m.code,
    description: pick(m.description, l),
  }));
}

export function getGroups(locale: string): Group[] {
  const l = normLocale(locale);
  return GROUPS_RAW.map((g) => ({ slug: g.slug, name: pick(g.name, l), categories: g.categories }));
}
