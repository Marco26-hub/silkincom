// Server-only catalog module: DB-backed product queries.
// Uses Supabase via createServerClient (next/headers) — do NOT import from
// client components. For types and sync taxonomy getters use catalog-meta.ts.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';
import {
  type Product,
  type Material,
  type ProductGroup,
  translationMap,
  buildProductMeta,
  normLocale,
  pick,
} from './catalog-meta';

// Re-export client-safe API so server-side importers keep one entry point.
export * from './catalog-meta';

// ========== DB FETCH ==========

type DBProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  description_long: string;
  composition: string;
  dimensions: string;
  product_images: Array<{ image_url: string }>;
  product_categories: Array<{ category_id: string; categories: { slug: string } | null }>;
  product_collections: Array<{ collection_id: string; collections: { slug: string } | null }>;
};

async function fetchProductsFromDB(): Promise<DBProduct[]> {
  const supabase = createPublicClient();
  const { data: products, error } = await supabase
    .from('products')
    .select(
      `id, slug, name, sku, price, description_long, composition, dimensions,
       product_images(image_url),
       product_categories(
         category_id,
         categories(slug)
       ),
       product_collections(
         collection_id,
         collections(slug)
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

// Italian is the source language and lives in the DB — so `it` always reads
// from the DB and reflects admin edits immediately. The other 6 locales come
// from products.json (filled by the translation pipeline); if a translation
// is missing, fall back to the DB (Italian) value.
function localizeProduct(dbProduct: DBProduct, locale: Locale): Product {
  const translations = translationMap.get(dbProduct.slug);
  const meta = buildProductMeta(dbProduct.slug);

  const translated = locale !== 'it' && translations
    ? {
        name: pick(translations.name, locale),
        description: pick(translations.description, locale),
        composition: pick(translations.composition, locale),
      }
    : null;

  return {
    slug: dbProduct.slug,
    name: translated?.name || dbProduct.name,
    sku: dbProduct.sku,
    price: dbProduct.price,
    description: translated?.description || dbProduct.description_long,
    composition: translated?.composition || dbProduct.composition,
    dimensions: dbProduct.dimensions,
    images: dbProduct.product_images.map((img) => img.image_url),
    category: meta.category,
    collections: meta.collections,
    material: meta.material,
    group: meta.group,
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
