/**
 * Shared catalogue → Google Merchant mapping.
 *
 * The same field-resolution that powers the RSS scheduled-fetch feed
 * (`/api/google-merchant/feed.xml`) is reused here so the Content API push and
 * the feed never drift on the tricky bits (colour / material inference). The
 * feed keeps its own XML serialisation; this module additionally builds the
 * JSON `product` resource for the Content API for Shopping (v2.1).
 */
import { APP_URL } from '@/lib/app-url';
import type { SupabaseClient } from '@supabase/supabase-js';

export const BRAND = 'SILKinCOM';
export const TARGET_COUNTRY = 'IT';
export const GOOGLE_PRODUCT_CATEGORY = '1786'; // Apparel & Accessories > Clothing Accessories > Scarves & Shawls
const PRODUCT_TYPE = 'Apparel & Accessories > Clothing Accessories > Scarves & Shawls';

// Colours are not stored as structured data (product_colors is empty), so we
// derive them from the Italian product name (the colour is the trailing token,
// e.g. "Varenna Azzurra" → Light Blue) plus a few explicit overrides where the
// name is a style, not a colour.
const COLOR_IT_EN: Record<string, string> = {
  azzurra: 'Light Blue', azzurro: 'Light Blue',
  beige: 'Beige',
  grigia: 'Grey', grigio: 'Grey',
  bianco: 'White', bianca: 'White',
  blu: 'Blue', navy: 'Navy',
  nero: 'Black', nera: 'Black',
  verde: 'Green', rosa: 'Pink', viola: 'Purple',
  cipria: 'Powder Pink',
};

export function resolveColor(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.startsWith('bellagio')) return 'Powder Pink'; // "Cipria", logo colour is just a variant
  if (n.startsWith('como ')) return 'Blue';           // Como silk twillys are blue
  if (n === 'tivan') return 'Turquoise';              // turquoise beach towel
  if (n.includes('blu navy')) return 'Navy';
  if (n.includes('grigio melange')) return 'Grey';
  const tokens = n.replace(/[—–-]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (COLOR_IT_EN[tokens[i]]) return COLOR_IT_EN[tokens[i]];
  }
  return 'Multicolor';
}

// Primary fibre, translated to English. composition is e.g. "100% cashmere",
// "53% lino, 47% cotone", "Frontale 100% cotone, retro 100% poliestere" — the
// first fibre listed is the dominant one.
const FIBER_IT_EN: Record<string, string> = {
  seta: 'Silk', cotone: 'Cotton', lana: 'Wool', lino: 'Linen',
  cashmere: 'Cashmere', poliestere: 'Polyester', elastan: 'Elastane',
};

export function resolveMaterial(composition?: string): string {
  const c = (composition || '').toLowerCase();
  let best: { idx: number; en: string } | null = null;
  for (const [it, en] of Object.entries(FIBER_IT_EN)) {
    const idx = c.indexOf(it);
    if (idx >= 0 && (best === null || idx < best.idx)) best = { idx, en };
  }
  return best ? best.en : 'Silk';
}

// Columns required to build a Merchant item — shared by the feed and the API
// push so a query change can't silently desync them.
export const PRODUCT_SELECT = `
  id, slug, name, sku, price, compare_at_price, currency,
  description_short, description_long, composition,
  name_i18n, description_short_i18n, description_long_i18n,
  product_images(image_url, is_primary, display_order),
  inventory(quantity_available)
`;

export type CatalogProduct = Record<string, any>;

export async function fetchPublishedProducts(
  supabase: SupabaseClient,
): Promise<CatalogProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'published');
  if (error) throw new Error(`Catalog query failed: ${error.message}`);
  return data ?? [];
}

/** Normalise a catalogue row into the fields both serialisers need. */
export function normalizeItem(p: CatalogProduct, lang: 'it' | 'en') {
  const sortedImages = (p.product_images || []).slice().sort((a: any, b: any) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.display_order || 0) - (b.display_order || 0);
  });
  const primaryImage = sortedImages[0]?.image_url || `${APP_URL}/og-image.jpg`;
  const additionalImages: string[] = sortedImages.slice(1, 11).map((i: any) => i.image_url);

  // A product is "in stock" if any size/variant has quantity.
  const stock = (p.inventory || []).reduce(
    (sum: number, row: any) => sum + (row?.quantity_available ?? 0),
    0,
  );

  const title = (lang === 'en' ? p.name_i18n?.en : p.name_i18n?.it) || p.name;
  const description = (lang === 'en'
    ? (p.description_long_i18n?.en || p.description_short_i18n?.en)
    : (p.description_long_i18n?.it || p.description_short_i18n?.it))
    || p.description_long
    || p.description_short
    || `${title} — Made in Como`;

  const currency = p.currency || 'EUR';
  const priceValue = Number(p.price).toFixed(2);
  const shippingPrice = Number(p.price) >= 200 ? '0.00' : '9.00';

  return {
    offerId: String(p.sku || p.id),
    slug: p.slug,
    title,
    description,
    primaryImage,
    additionalImages,
    stock,
    currency,
    priceValue,
    shippingPrice,
    color: resolveColor(p.name),
    material: resolveMaterial(p.composition),
    composition: p.composition || 'silk',
  };
}

/**
 * Build the Content API for Shopping (v2.1) `product` resource for a catalogue
 * row in the requested language. Mirrors the feed's attributes; availability
 * uses the API spelling ("in stock"/"out of stock", with a space).
 */
export function buildContentApiProduct(p: CatalogProduct, lang: 'it' | 'en') {
  const it = normalizeItem(p, lang);
  return {
    offerId: it.offerId,
    title: `${it.title} — SILKinCOM`,
    description: it.description,
    link: `${APP_URL}/prodotto/${it.slug}`,
    imageLink: it.primaryImage,
    additionalImageLinks: it.additionalImages,
    contentLanguage: lang,
    targetCountry: TARGET_COUNTRY,
    channel: 'online',
    availability: it.stock > 0 ? 'in stock' : 'out of stock',
    condition: 'new',
    price: { value: it.priceValue, currency: it.currency },
    brand: BRAND,
    color: it.color,
    gender: 'unisex',
    ageGroup: 'adult',
    material: it.material,
    googleProductCategory: GOOGLE_PRODUCT_CATEGORY,
    productTypes: [PRODUCT_TYPE],
    shipping: [{ country: TARGET_COUNTRY, service: 'Standard', price: { value: it.shippingPrice, currency: 'EUR' } }],
    customLabel0: 'made-in-como',
    customLabel1: it.composition,
    identifierExists: false,
  };
}
