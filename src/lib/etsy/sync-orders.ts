/**
 * Pull Etsy receipts (orders) → SILKinCOM orders table.
 *
 * - Fetches recent paid receipts from Etsy
 * - Creates orders in our DB with source='etsy'
 * - Maps SKU → product_id for order_items
 * - Decrements inventory
 */
import { etsyFetch, resolveShopId } from './client';
import type { EtsyReceipt, SyncResult } from './types';

export async function syncOrdersFromEtsy(supabase: any): Promise<SyncResult> {
  const shopId = await resolveShopId();
  const result: SyncResult = { synced: 0, errors: [], skipped: 0 };

  const data = await etsyFetch<{ results: EtsyReceipt[] }>(
    `/application/shops/${shopId}/receipts?was_paid=true&limit=25`
  );

  const receipts = data.results || [];

  for (const receipt of receipts) {
    try {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('etsy_receipt_id', receipt.receipt_id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const totalEur = receipt.grandtotal.amount / receipt.grandtotal.divisor;

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_email: receipt.buyer_email,
          status: receipt.is_shipped ? 'shipped' : 'paid',
          payment_status: 'paid',
          total_amount: totalEur,
          currency: receipt.grandtotal.currency_code || 'EUR',
          source: 'etsy',
          etsy_receipt_id: receipt.receipt_id,
          shipping_address: {
            full_name: receipt.name,
            street: receipt.first_line,
            street2: receipt.second_line,
            city: receipt.city,
            state: receipt.state,
            zip: receipt.zip,
            country: receipt.country_iso,
          },
          paid_at: new Date(receipt.create_timestamp * 1000).toISOString(),
        })
        .select('id')
        .single();

      if (orderErr) {
        result.errors.push(`Receipt ${receipt.receipt_id}: ${orderErr.message}`);
        continue;
      }

      for (const tx of receipt.transactions) {
        const sku = tx.sku;
        let productId: string | null = null;
        let productName = tx.title;

        if (sku) {
          const { data: prod } = await supabase
            .from('products')
            .select('id, name')
            .eq('sku', sku)
            .maybeSingle();
          if (prod) {
            productId = prod.id;
            productName = prod.name;
          }
        }

        const unitPrice = tx.price.amount / tx.price.divisor;

        await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: productId,
          product_name: productName,
          product_slug: null,
          quantity: tx.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * tx.quantity,
        });

        if (productId) {
          await supabase.rpc('apply_inventory_movement', {
            p_product_id: productId,
            p_variant_id: null,
            p_quantity_change: -tx.quantity,
            p_movement_type: 'sale',
            p_reason: `Etsy order #${receipt.receipt_id}`,
            p_reference_order_id: order.id,
          });
        }
      }

      result.synced++;
    } catch (err: any) {
      result.errors.push(`Receipt ${receipt.receipt_id}: ${err.message}`);
    }
  }

  return result;
}

export async function pushTrackingToEtsy(
  supabase: any,
  orderId: string,
  trackingNumber: string,
  carrier: string
): Promise<void> {
  const shopId = await resolveShopId();

  const { data: order } = await supabase
    .from('orders')
    .select('etsy_receipt_id')
    .eq('id', orderId)
    .single();

  if (!order?.etsy_receipt_id) return;

  const carrierMap: Record<string, string> = {
    'brt': 'bartolini',
    'dhl': 'dhl',
    'gls': 'gls-italy',
    'sda': 'sda-express-courier',
    'poste': 'poste-italiane',
    'ups': 'ups',
    'fedex': 'fedex',
    'tnt': 'tnt',
  };

  const etsyCarrier = carrierMap[carrier.toLowerCase()] || carrier.toLowerCase();

  await etsyFetch(
    `/application/shops/${shopId}/receipts/${order.etsy_receipt_id}/tracking`,
    {
      method: 'POST',
      body: JSON.stringify({
        tracking_code: trackingNumber,
        carrier_name: etsyCarrier,
      }),
    }
  );
}
