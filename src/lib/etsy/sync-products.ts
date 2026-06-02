/**
 * Push SILKinCOM products → Etsy listings.
 *
 * - Creates new listings for products not yet on Etsy
 * - Updates existing listings when product data changes
 * - Maps via etsy_listing_id stored in products table (or integrations_map)
 */
import { etsyFetch, resolveShopId } from './client';
import type { SyncResult } from './types';

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  description_short: string | null;
  description_long: string | null;
  composition: string | null;
  dimensions: string | null;
  care_instructions: string | null;
  status: string;
};

type ProductMapping = {
  product_id: string;
  etsy_listing_id: number | null;
};

function buildListingPayload(p: Product) {
  const description = [
    p.description_long || p.description_short || '',
    '',
    p.composition ? `Composizione: ${p.composition}` : '',
    p.dimensions ? `Dimensioni: ${p.dimensions}` : '',
    p.care_instructions ? `Cura: ${p.care_instructions}` : '',
    '',
    '100% Made in Como, Italia',
    'Tradizione tessile dal 1400',
  ].filter(Boolean).join('\n');

  return {
    title: `${p.name} — SILKinCOM | Made in Como`,
    description,
    price: p.price,
    quantity: 1,
    who_made: 'i_did' as const,
    when_made: '2020_2025',
    is_supply: false,
    taxonomy_id: 1125, // Scarves & Wraps
    tags: [
      'silk scarf', 'cashmere scarf', 'made in Italy', 'Como silk',
      'luxury scarf', 'Italian fashion', 'silk wrap', 'gift for her',
      'artisan made', 'Lake Como', 'SILKinCOM',
    ],
    materials: ['silk', 'cashmere', 'wool'],
    sku: [p.sku],
    state: p.status === 'published' ? 'active' : 'draft',
  };
}

export async function syncProductsToEtsy(supabase: any): Promise<SyncResult> {
  const shopId = await resolveShopId();
  const result: SyncResult = { synced: 0, errors: [], skipped: 0 };

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, sku, price, description_short, description_long, composition, dimensions, care_instructions, status')
    .in('status', ['published', 'draft']);

  if (!products?.length) return result;

  const { data: mappings } = await supabase
    .from('etsy_product_map')
    .select('product_id, etsy_listing_id');

  const mapById = new Map<string, number>();
  (mappings || []).forEach((m: ProductMapping) => {
    if (m.etsy_listing_id) mapById.set(m.product_id, m.etsy_listing_id);
  });

  for (const product of products as Product[]) {
    try {
      const payload = buildListingPayload(product);
      const existingId = mapById.get(product.id);

      if (existingId) {
        await etsyFetch(`/application/listings/${existingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        const created = await etsyFetch<{ listing_id: number }>(
          `/application/shops/${shopId}/listings`,
          { method: 'POST', body: JSON.stringify(payload) }
        );
        await supabase.from('etsy_product_map').upsert({
          product_id: product.id,
          etsy_listing_id: created.listing_id,
          synced_at: new Date().toISOString(),
        });
      }
      result.synced++;
    } catch (err: any) {
      result.errors.push(`${product.sku}: ${err.message}`);
    }
  }

  return result;
}

export async function syncProductImagesToEtsy(supabase: any, productId: string): Promise<void> {
  const shopId = await resolveShopId();

  const { data: mapping } = await supabase
    .from('etsy_product_map')
    .select('etsy_listing_id')
    .eq('product_id', productId)
    .single();

  if (!mapping?.etsy_listing_id) return;

  const { data: images } = await supabase
    .from('product_images')
    .select('image_url, alt_text, display_order')
    .eq('product_id', productId)
    .order('display_order');

  if (!images?.length) return;

  for (const img of images) {
    const imageRes = await fetch(img.image_url);
    const blob = await imageRes.blob();

    const formData = new FormData();
    formData.append('image', blob, `product-${Date.now()}.jpg`);
    formData.append('rank', String(img.display_order));
    if (img.alt_text) formData.append('alt_text', img.alt_text);

    await etsyFetch(
      `/application/shops/${shopId}/listings/${mapping.etsy_listing_id}/images`,
      { method: 'POST', body: formData, headers: {} }
    );
  }
}
