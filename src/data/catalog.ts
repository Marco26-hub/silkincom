import productsJson from './products.json';
import { LOCALES, type Locale } from '@/i18n/routing';

export type Material = 'seta' | 'cashmere' | 'lana' | 'lino' | 'cotone' | 'misto';
export type ProductGroup = 'abbigliamento' | 'accessori';

// Localized string. `it` is the source of truth; other locales are optional.
// Resolution falls back: requested locale -> en -> it.
export type L10n = { it: string } & Partial<Record<Exclude<Locale, 'it'>, string>>;

const L = (it: string, en?: string): L10n => (en ? { it, en } : { it });

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

const CATEGORIES_RAW: RawCategory[] = [
  { slug: 'bellagio',    name: 'Bellagio',    material: L('Cashmere', 'Cashmere'), description: L('Pashmine in puro cashmere, ispirate alla raffinatezza del Lago di Como.', 'Pure cashmere pashminas, inspired by the refined elegance of Lake Como.'), image: WIX('b58e91_6653f43860d34a5eb0143cae9523a134~mv2.jpg') },
  { slug: 'cernobbio',   name: 'Cernobbio',   material: L('Cashmere', 'Cashmere'), description: L('Sciarpe in cashmere, eleganza discreta.', 'Cashmere scarves, understated elegance.'), image: WIX('a34b56_3ccd9aefbaca4c5d9363c8711f5b3338~mv2.jpg') },
  { slug: 'tremezzo',    name: 'Tremezzo',    material: L('Lana', 'Wool'),         description: L('Sciarpe in lana, calore avvolgente.', 'Wool scarves, enveloping warmth.'), image: WIX('a34b56_1af2743a614c4ac1b255dd1e53c8f436~mv2.jpg') },
  { slug: 'varenna',     name: 'Varenna',     material: L('Cashmere', 'Cashmere'), description: L('Sciarpe in puro cashmere, leggerezza che dura.', 'Pure cashmere scarves, lightness that lasts.'), image: WIX('a34b56_e76f0bb5106c49df8f2ef2b5d8602b0e~mv2.jpg') },
  { slug: 'twilly-como', name: 'Twilly Como', material: L('Seta', 'Silk'),         description: L('Il foulard a nastro in seta, reinterpretato.', 'The silk ribbon scarf, reimagined.'), image: WIX('b58e91_6e113b7ba95f4d81854d2300b10860e8~mv2.jpg') },
  { slug: 'darsena',     name: 'Darsena',     material: L('Cotone', 'Cotton'),     description: L('Cappellini in cotone, eleganza casual.', 'Cotton caps, casual elegance.'), image: WIX('a34b56_0f40416a402e4011a78dba5f2849cf6f~mv2.jpg') },
  { slug: 'lario',       name: 'Lario',       material: L('Cotone', 'Cotton'),     description: L('T-shirt in cotone pregiato, Made in Como.', 'Premium cotton t-shirts, Made in Como.'), image: WIX('a34b56_e9e62902bbed4ae4963738ab0861a880~mv2.jpg') },
  { slug: 'melzi',       name: 'Melzi',       material: L('Lino', 'Linen'),        description: L('Pantaloncini in lino, freschezza estiva sul Lago.', 'Linen shorts, summer freshness on the lake.'), image: WIX('a34b56_4cdb7894efaa4a128d5fb0714b80e743~mv2.jpg') },
  { slug: 'riva',        name: 'Riva',        material: L('Lino', 'Linen'),        description: L('Camicie in misto lino e cotone.', 'Linen and cotton blend shirts.'), image: WIX('a34b56_f44d83eee24c4e9d986b9c183bcfcccc~mv2.jpg') },
  { slug: 'tivan',       name: 'Tivan',       material: L('Cotone', 'Cotton'),     description: L('Teli mare in cotone, qualità e praticità.', 'Cotton beach towels, quality and practicality.'), image: WIX('a34b56_7f5a6eb5f5ec474098fb2a72445ec974~mv2.jpg') },
];

// Main collections shown as featured
type RawCollection = { slug: string; name: L10n; tagline: L10n; description: L10n; image: string };
export type Collection = { slug: string; name: string; tagline: string; description: string; image: string };

const COLLECTIONS_RAW: RawCollection[] = [
  {
    slug: 'inverno',
    name: L('Collezione Inverno', 'Winter Collection'),
    tagline: L('Calore avvolgente delle fibre nobili', 'The enveloping warmth of noble fibres'),
    description: L(
      'Pashmine in cashmere, sciarpe in lana e accessori pensati per la stagione fredda. La tradizione tessile comasca incontra il comfort delle migliori fibre invernali.',
      'Cashmere pashminas, wool scarves and accessories designed for the cold season. The textile tradition of Como meets the comfort of the finest winter fibres.',
    ),
    image: '/instagram/ig-06.jpg',
  },
  {
    slug: 'iconica',
    name: L('Collezione Iconica', 'Iconic Collection'),
    tagline: L("L'essenza del tuo stile, firmata Como", 'The essence of your style, signed by Como'),
    description: L(
      "I pezzi che rappresentano l'anima di SILKinCOM. Twilly in seta e cappellini in cotone, lavorati interamente nel distretto comasco.",
      'The pieces that capture the soul of SILKinCOM. Silk twillies and cotton caps, crafted entirely in the Como district.',
    ),
    image: '/instagram/ig-02.jpg',
  },
  {
    slug: 'primavera',
    name: L('Collezione Primavera & Estate', 'Spring & Summer Collection'),
    tagline: L('Toni del lago al risveglio', 'Lake tones at first light'),
    description: L(
      'La nuova stagione si apre con cotoni e lini leggeri, t-shirt e camicie pensate per le mezze stagioni sul Lario.',
      'The new season opens with lightweight cottons and linens, t-shirts and shirts designed for the mid-seasons on Lake Como.',
    ),
    image: '/instagram/ig-01.jpg',
  },
];

// Material info for filtering UI
type RawMaterialInfo = { slug: string; name: L10n; code: string; description: L10n };
export type MaterialInfo = { slug: string; name: string; code: string; description: string };

const MATERIALS_RAW: RawMaterialInfo[] = [
  { slug: 'cashmere', name: L('Cashmere', 'Cashmere'), code: 'WS', description: L('Fibra pregiata di origine asiatica, calda e leggera.', 'A precious fibre of Asian origin, warm and lightweight.') },
  { slug: 'lana',     name: L('Lana', 'Wool'),         code: 'WO', description: L('Naturalmente traspirante e termoregolatrice.', 'Naturally breathable and temperature-regulating.') },
  { slug: 'seta',     name: L('Seta', 'Silk'),         code: 'SE', description: L('La seta di Como, lucentezza e raffinatezza senza tempo.', 'The silk of Como, timeless lustre and refinement.') },
  { slug: 'lino',     name: L('Lino', 'Linen'),        code: 'LI', description: L("Freschezza naturale per l'estate mediterranea.", 'Natural freshness for the Mediterranean summer.') },
  { slug: 'cotone',   name: L('Cotone', 'Cotton'),     code: 'CO', description: L('Cotone naturale di qualità superiore, morbidezza setosa.', 'Superior-quality natural cotton, silky softness.') },
];

// Macro-groups for top-level navigation
type RawGroup = { slug: ProductGroup; name: L10n; categories: string[] };
export type Group = { slug: ProductGroup; name: string; categories: string[] };

const GROUPS_RAW: RawGroup[] = [
  { slug: 'abbigliamento', name: L('Abbigliamento', 'Clothing'),    categories: ['lario', 'riva', 'melzi', 'darsena'] },
  { slug: 'accessori',     name: L('Accessori', 'Accessories'),     categories: ['bellagio', 'cernobbio', 'tremezzo', 'varenna', 'twilly-como', 'tivan'] },
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
