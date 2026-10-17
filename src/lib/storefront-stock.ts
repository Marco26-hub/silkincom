import type {SupabaseClient} from '@supabase/supabase-js';

export type StorefrontStock = {product_id: string;variant_id: string | null;product_slug: string;quantity_available: number};

export async function readStorefrontStock(db: SupabaseClient, slugs?: string[]): Promise<StorefrontStock[] | null> {
  const {data, error} = await db.rpc('get_storefront_stock', {p_slugs: slugs ?? null});
  if (error?.code === 'PGRST202') {
    // Explicit pre-migration compatibility. Checkout itself fails closed until
    // migration 057 is installed; no new hold can exist during this interval.
    console.warn('[stock] Reservation RPC not installed; using physical stock for the existing checkout integration.');
    return null;
  }
  if (error) throw new Error(`Storefront availability failed: ${error.message}`);
  return data as StorefrontStock[];
}
