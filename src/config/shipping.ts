/**
 * Shipping configuration — single source of truth.
 *
 * To change free-shipping threshold across the site (cart drawer, cart page,
 * checkout summary, payment intent), update FREE_SHIPPING_THRESHOLD here.
 *
 * Audit recommendation (May 2026): consider lowering to 150 if AOV stays in
 * €70-€150 range — current €200 threshold sits above typical order value
 * and may suppress conversion.
 */
export const FREE_SHIPPING_THRESHOLD = 200;

/** Standard shipping cost (EUR) when below threshold. */
export const STANDARD_SHIPPING_COST = 9;

/** Helper: compute shipping for given subtotal. */
export function computeShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
}
