/**
 * Right-of-withdrawal ("recesso") helpers — art. 54-bis Codice del Consumo
 * (D.Lgs 209/2025 / Direttiva UE 2023/2673), obbligatorio dal 19/06/2026.
 *
 * Shared by the public lookup + confirm routes. The order is identified from a
 * public, non-authenticated interface by order number + email (the consumer
 * must be able to withdraw easily, without forcing an account login).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const WITHDRAWAL_WINDOW_DAYS = 14;

// Admin kill-switch. Stored in store_settings under `recesso_enabled` (jsonb
// boolean). FAIL-OPEN: any read error keeps the feature ON — a legally required
// function must never disappear because of a transient settings-read failure.
// Disabled only when an admin has explicitly set the flag to `false`.
let _flagCache: { value: boolean; at: number } | null = null;
const FLAG_TTL_MS = 30_000;

export async function isRecessoEnabled(): Promise<boolean> {
  if (_flagCache && Date.now() - _flagCache.at < FLAG_TTL_MS) return _flagCache.value;
  let enabled = true;
  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'recesso_enabled')
      .maybeSingle();
    if (data && data.value === false) enabled = false;
  } catch {
    enabled = true;
  }
  _flagCache = { value: enabled, at: Date.now() };
  return enabled;
}

export type WithdrawalItem = { name: string; quantity: number };

export type EligibleOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  total: number;
  currency: string;
  items: WithdrawalItem[];
  /** false once the 14-day window (from delivery) has elapsed. */
  withinWindow: boolean;
  /** true if a withdrawal was already filed for this order. */
  alreadyRequested: boolean;
  existingNumber?: string;
};

function nameFromShippingAddress(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return null;
  const a = addr as Record<string, unknown>;
  const full = (a.full_name || a.name) as string | undefined;
  if (full) return String(full);
  const first = (a.first_name || a.firstName) as string | undefined;
  const last = (a.last_name || a.lastName) as string | undefined;
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined || null;
}

/**
 * Find an order eligible for withdrawal. Returns null when no order matches the
 * (number, email) pair — callers MUST return a generic error so the endpoint
 * can't be used to probe which orders/emails exist.
 */
export async function findOrderForWithdrawal(
  supabase: SupabaseClient,
  orderNumberRaw: string,
  emailRaw: string,
): Promise<EligibleOrder | null> {
  const orderNumber = orderNumberRaw.trim();
  const email = emailRaw.trim().toLowerCase();
  if (!orderNumber || !email) return null;

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_email, status, total_amount, currency, delivered_at, created_at, shipping_address, is_test',
    )
    .eq('order_number', orderNumber)
    .single();

  if (!order) return null;
  if (order.is_test) return null;
  if (String(order.customer_email || '').trim().toLowerCase() !== email) return null;
  // Cancelled/refunded orders are no longer withdrawable.
  if (['cancelled', 'refunded'].includes(String(order.status))) return null;

  const { data: items } = await supabase
    .from('order_items')
    .select('product_name, quantity')
    .eq('order_id', order.id);

  // Window: the right exists from contract conclusion; the 14-day deadline runs
  // from receipt of goods (delivered_at). Not yet delivered → still in window.
  let withinWindow = true;
  if (order.delivered_at) {
    const deadline = new Date(order.delivered_at).getTime() + WITHDRAWAL_WINDOW_DAYS * 86_400_000;
    withinWindow = Date.now() <= deadline;
  }

  const { data: existing } = await supabase
    .from('withdrawals')
    .select('withdrawal_number')
    .eq('order_id', order.id)
    .limit(1);

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: nameFromShippingAddress(order.shipping_address),
    customerEmail: String(order.customer_email),
    total: Number(order.total_amount) || 0,
    currency: order.currency || 'EUR',
    items: (items || []).map((i) => ({
      name: String(i.product_name || ''),
      quantity: Number(i.quantity) || 1,
    })),
    withinWindow,
    alreadyRequested: !!(existing && existing.length > 0),
    existingNumber: existing && existing.length > 0 ? existing[0].withdrawal_number : undefined,
  };
}

export function formatItems(items: WithdrawalItem[]): string {
  return items
    .map((i) => (i.quantity > 1 ? `${i.name} (×${i.quantity})` : i.name))
    .join('; ');
}

/**
 * The withdrawal declaration text, in the consumer's own language, echoed back
 * in the durable-medium receipt. Falls back to English for unknown locales.
 */
export function buildDeclaration(
  locale: string,
  args: { orderNumber: string; name: string | null; items: WithdrawalItem[] },
): string {
  const items = formatItems(args.items) || '—';
  const who = args.name ? args.name : '—';
  const templates: Record<string, string> = {
    it: `Con la presente dichiaro di recedere dal contratto di acquisto n. ${args.orderNumber}, concluso a distanza su silkincom.com, relativamente ai seguenti beni: ${items}. Cliente: ${who}.`,
    en: `I hereby give notice that I withdraw from my purchase contract no. ${args.orderNumber}, concluded at a distance on silkincom.com, for the following goods: ${items}. Customer: ${who}.`,
    de: `Hiermit widerrufe ich den über silkincom.com im Fernabsatz geschlossenen Kaufvertrag Nr. ${args.orderNumber} über die folgenden Waren: ${items}. Kunde: ${who}.`,
    fr: `Je vous notifie par la présente ma rétractation du contrat d'achat n° ${args.orderNumber}, conclu à distance sur silkincom.com, portant sur les biens suivants : ${items}. Client : ${who}.`,
    es: `Por la presente comunico mi desistimiento del contrato de compra n.º ${args.orderNumber}, celebrado a distancia en silkincom.com, relativo a los siguientes bienes: ${items}. Cliente: ${who}.`,
    pt: `Pela presente comunico a minha rescisão do contrato de compra n.º ${args.orderNumber}, celebrado à distância em silkincom.com, relativo aos seguintes bens: ${items}. Cliente: ${who}.`,
    nl: `Hierbij deel ik mede dat ik de op silkincom.com op afstand gesloten koopovereenkomst nr. ${args.orderNumber} voor de volgende goederen herroep: ${items}. Klant: ${who}.`,
  };
  return templates[locale] || templates.en;
}
