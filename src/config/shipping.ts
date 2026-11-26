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

/** Italy: preparation up to one business day, transit two to three days.
 * Total customer-facing estimate: 2–4 business days. */
export const ITALY_DELIVERY = {
  handlingMin: 0, handlingMax: 1,
  transitMin: 2, transitMax: 3,
  totalMin: 2, totalMax: 4,
} as const;

const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

/** Published shipping policy. Without a destination, cart estimates use Italy. */
export function computeShipping(subtotal: number, country = 'IT'): number {
  const destination = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(destination)) throw new Error('Invalid shipping destination');
  if (destination === 'IT') return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  if (EU_COUNTRIES.has(destination)) return subtotal >= 350 ? 0 : 18;
  if (['GB', 'CH', 'NO'].includes(destination)) return 25;
  return 35;
}
