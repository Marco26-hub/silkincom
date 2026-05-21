// Server-only catalog module: DB-backed product queries.
// Uses Supabase via createServerClient (next/headers) — do NOT import from
// client components. For types and sync taxonomy getters use catalog-meta.ts.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';
import {
  type Product,
  type ProductVariant,
  type Size,
  type Material,
  type ProductGroup,
  translationMap,
  buildProductMeta,
  normLocale,
  pick,
} from './catalog-meta';

const SIZE_ORDER: Record<string, number> = {
  XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, XXXL: 7, UNI: 8,
};

// Re-export client-safe API so server-side importers keep one entry point.
export * from './catalog-meta';

// ========== DB FETCH ==========

type I18nMap = Partial<Record<string, string>> | null;

type DBProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  description_long: string;
  description_short: string;
  composition: string;
  dimensions: string;
  name_i18n: I18nMap;
  description_long_i18n: I18nMap;
  description_short_i18n: I18nMap;
  composition_i18n: I18nMap;
  product_images: Array<{ image_url: string; display_order: number }>;
  product_categories: Array<{ category_id: string; categories: { slug: string } | null }>;
  product_collections: Array<{ collection_id: string; collections: { slug: string } | null }>;
  product_variants: Array<{
    id: string;
    variant_sku: string;
    size: string | null;
    price_override: number | null;
    inventory: Array<{ quantity_available: number }> | null;
  }>;
};

async function fetchProductsFromDB(): Promise<DBProduct[]> {
  const supabase = createPublicClient();
  const { data: products, error } = await supabase
    .from('products')
    .select(
      `id, slug, name, sku, price, description_long, description_short, composition, dimensions,
       name_i18n, description_long_i18n, description_short_i18n, composition_i18n,
       product_images(image_url, display_order),
       product_categories(
         category_id,
         categories(slug)
       ),
       product_collections(
         collection_id,
         collections(slug)
       ),
       product_variants(
         id,
         variant_sku,
         size,
         price_override,
         inventory(quantity_available)
       )`
    )
    .eq('status', 'published')
    .order('created_at');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (products as unknown as DBProduct[]) || [];
}

// Cached at the data layer. Admin mutations call revalidateTag('products')
// for an immediate refresh; the 60s revalidate is a safety net.
const getCachedProducts = unstable_cache(
  fetchProductsFromDB,
  ['catalog-products'],
  { revalidate: 60, tags: ['products'] }
);

// Italian is the source language: it always reads the DB source column and
// reflects admin edits immediately. For the other 6 locales the resolution
// order is: DB *_i18n column (filled by the admin "Translate" button) ->
// products.json (legacy translation pipeline) -> DB source (Italian).
function localizeProduct(dbProduct: DBProduct, locale: Locale): Product {
  const translations = translationMap.get(dbProduct.slug);
  const meta = buildProductMeta(dbProduct.slug);

  function resolve(i18n: I18nMap, fileField: 'name' | 'description' | 'composition', source: string): string {
    if (locale === 'it') return source;
    const fromDb = i18n?.[locale];
    if (fromDb) return fromDb;
    if (translations) return pick(translations[fileField], locale);
    return source;
  }

  // Only expose variants with an actual size attribute (apparel). Legacy
  // variants without a size aren't surfaced on the storefront — they exist
  // for admin/SKU tracking only.
  const variants: ProductVariant[] = (dbProduct.product_variants ?? [])
    .filter((v) => v.size !== null && v.size !== undefined)
    .map((v) => ({
      id: v.id,
      sku: v.variant_sku,
      size: v.size as Size,
      priceOverride: v.price_override,
      available: v.inventory?.[0]?.quantity_available ?? 0,
    }))
    .sort((a, b) => (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99));

  return {
    slug: dbProduct.slug,
    name: resolve(dbProduct.name_i18n, 'name', dbProduct.name),
    sku: dbProduct.sku,
    price: dbProduct.price,
    description: resolve(dbProduct.description_long_i18n, 'description', dbProduct.description_long),
    descriptionShort:
      locale === 'it'
        ? (dbProduct.description_short ?? '')
        : (dbProduct.description_short_i18n?.[locale] ?? dbProduct.description_short ?? ''),
    composition: resolve(dbProduct.composition_i18n, 'composition', dbProduct.composition),
    dimensions: dbProduct.dimensions,
    images: [...dbProduct.product_images]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((img) => img.image_url),
    category: meta.category,
    collections: meta.collections,
    material: meta.material,
    group: meta.group,
    variants,
  };
}

// ========== PUBLIC ASYNC API ==========

export async function getProducts(locale: string): Promise<Product[]> {
  const l = normLocale(locale);
  const dbProducts = await getCachedProducts();
  return dbProducts.map((p) => localizeProduct(p, l));
}

export async function getProduct(slug: string, locale: string): Promise<Product | undefined> {
  const dbProducts = await getCachedProducts();
  const p = dbProducts.find((x) => x.slug === slug);
  return p ? localizeProduct(p, normLocale(locale)) : undefined;
}

export async function getProductsByCategory(category: string, locale: string): Promise<Product[]> {
  const products = await getProducts(locale);
  return products.filter((p) => p.category === category);
}

export async function getProductsByCollection(collection: string, locale: string): Promise<Product[]> {
  const products = await getProducts(locale);
  return products.filter((p) => p.collections.includes(collection));
}

export async function getProductsByMaterial(material: Material, locale: string): Promise<Product[]> {
  const products = await getProducts(locale);
  return products.filter((p) => p.material === material);
}

export async function getProductsByGroup(group: ProductGroup, locale: string): Promise<Product[]> {
  const products = await getProducts(locale);
  return products.filter((p) => p.group === group);
}

export async function getFeaturedProducts(locale: string, limit = 8): Promise<Product[]> {
  const products = await getProducts(locale);
  return products.slice(0, limit);
}
