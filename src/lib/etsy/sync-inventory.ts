/**
 * Bidirectional inventory sync between SILKinCOM and Etsy.
 *
 * - Reads current stock from our inventory table
 * - Updates Etsy listing quantity to match
 * - Source of truth: SILKinCOM DB (our inventory → Etsy)
 */
import { etsyFetch, getShopId } from './client';
import type { SyncResult } from './types';

export async function syncInventoryToEtsy(supabase: any): Promise<SyncResult> {
  const shopId = getShopId();
  const result: SyncResult = { synced: 0, errors: [], skipped: 0 };

  const { data: mappings } = await supabase
    .from('etsy_product_map')
    .select('product_id, etsy_listing_id');

  if (!mappings?.length) return result;

  const productIds = mappings.map((m: any) => m.product_id);
  const { data: inventories } = await supabase
    .from('inventory')
    .select('product_id, available_quantity')
    .in('product_id', productIds);

  const stockMap = new Map<string, number>();
  (inventories || []).forEach((inv: any) => {
    stockMap.set(inv.product_id, inv.available_quantity);
  });

  for (const mapping of mappings) {
    try {
      const qty = stockMap.get(mapping.product_id) ?? 0;
      const etsyQty = Math.max(0, qty);
      const state = etsyQty > 0 ? 'active' : 'inactive';

      await etsyFetch(`/application/listings/${mapping.etsy_listing_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: etsyQty, state }),
      });

      await supabase
        .from('etsy_product_map')
        .update({ synced_at: new Date().toISOString() })
        .eq('product_id', mapping.product_id);

      result.synced++;
    } catch (err: any) {
      result.errors.push(`Product ${mapping.product_id}: ${err.message}`);
    }
  }

  return result;
}
