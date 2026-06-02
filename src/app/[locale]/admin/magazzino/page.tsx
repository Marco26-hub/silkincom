import { createServiceClient } from '@/lib/supabase/server';
import { WarehouseDashboard } from '@/components/admin/WarehouseDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Magazzino — Admin SILKinCOM', robots: { index: false } };

export default async function AdminWarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab as 'giacenze' | 'movimenti' | 'fornitori' | 'resi') || 'giacenze';
  const filter = (sp.filter as 'all' | 'low' | 'out') || 'all';

  const supabase = createServiceClient();

  // ---------- Giacenze (inventory + product + variant join) ----------
  let invQ = supabase
    .from('inventory')
    .select(
      `id, product_id, variant_id, quantity_total, quantity_available, quantity_reserved,
       warehouse_location, last_restocked_at, reorder_threshold, reorder_quantity,
       supplier_name, supplier_sku,
       products(name, slug, sku, status, price, cost_price, purchase_vat_rate),
       product_variants(id, variant_sku, size)`
    )
    .limit(300);
  if (filter === 'low') invQ = invQ.lt('quantity_available', 5).gt('quantity_available', 0);
  if (filter === 'out') invQ = invQ.eq('quantity_available', 0);
  const { data: rawInventory } = await invQ;

  // Group + canonical size ordering. Variant rows sit under their product
  // parent so the dashboard reads top-to-bottom per article.
  const SIZE_ORDER: Record<string, number> = {
    XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, XXXL: 6, UNI: 9,
  };
  type RawInv = {
    id: string;
    product_id: string;
    variant_id: string | null;
    quantity_total: number;
    quantity_available: number;
    quantity_reserved: number;
    warehouse_location: string | null;
    last_restocked_at: string | null;
    reorder_threshold: number | null;
    reorder_quantity: number | null;
    supplier_name: string | null;
    supplier_sku: string | null;
    products: { name: string; slug: string; sku: string; status: string; price: number; cost_price: number | null; purchase_vat_rate: number | null } | null;
    product_variants: { id: string; variant_sku: string; size: string | null } | null;
  };
  const inventory = ((rawInventory ?? []) as unknown as RawInv[]).slice().sort((a, b) => {
    const an = a.products?.name ?? '';
    const bn = b.products?.name ?? '';
    if (an !== bn) return an.localeCompare(bn, 'it');
    const as = a.product_variants?.size ?? null;
    const bs = b.product_variants?.size ?? null;
    // Product-level row (variant_id null) always before its variant siblings.
    if (a.variant_id === null && b.variant_id !== null) return -1;
    if (a.variant_id !== null && b.variant_id === null) return 1;
    const ao = as ? SIZE_ORDER[as] ?? 99 : 99;
    const bo = bs ? SIZE_ORDER[bs] ?? 99 : 99;
    if (ao !== bo) return ao - bo;
    return a.quantity_available - b.quantity_available;
  });

  // ---------- KPI totals (all inventory, ignore filter) ----------
  const { data: kpiRows } = await supabase
    .from('inventory')
    .select('quantity_available, quantity_reserved, quantity_total, products(price, cost_price)');

  type KpiRow = { quantity_available: number; quantity_reserved: number; quantity_total: number; products: { price: number | null; cost_price: number | null } | null };
  const kpis = (kpiRows ?? []).reduce(
    (acc, r) => {
      const row = r as unknown as KpiRow;
      const price = row.products?.price ?? 0;
      const cost = row.products?.cost_price ?? 0;
      const qty = row.quantity_available ?? 0;
      acc.products += 1;
      acc.unitsAvailable += qty;
      acc.unitsReserved += row.quantity_reserved ?? 0;
      acc.value += qty * Number(price ?? 0);
      acc.costValue += qty * Number(cost ?? 0);
      if (row.quantity_available === 0) acc.outStock += 1;
      else if ((row.quantity_available ?? 0) < 5) acc.lowStock += 1;
      return acc;
    },
    { products: 0, unitsAvailable: 0, unitsReserved: 0, value: 0, costValue: 0, lowStock: 0, outStock: 0 }
  );

  // ---------- Today movements + open returns + open POs ----------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: movementsToday } = await supabase
    .from('inventory_movements')
    .select('id', { count: 'exact', head: true })
    .gte('performed_at', today.toISOString());

  const { count: openReturns } = await supabase
    .from('returns')
    .select('id', { count: 'exact', head: true })
    .in('status', ['requested', 'approved', 'received']);

  const { count: openPO } = await supabase
    .from('purchase_orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['draft', 'submitted', 'pending']);

  // ---------- Tab payloads (only the active one fetched fully) ----------
  let movements: unknown[] = [];
  let returns: unknown[] = [];
  let purchaseOrders: unknown[] = [];

  if (tab === 'movimenti') {
    const { data } = await supabase
      .from('inventory_movements')
      .select(
        `id, movement_type, quantity_change, quantity_before, quantity_after,
         reason, performed_at, reference_order_id, products(name, sku, slug)`
      )
      .order('performed_at', { ascending: false })
      .limit(150);
    movements = data ?? [];
  }
  if (tab === 'resi') {
    const { data } = await supabase
      .from('returns')
      .select('id, return_number, status, reason, refund_amount, refund_method, refunded_at, created_at, order_id, customer_id')
      .order('created_at', { ascending: false })
      .limit(100);
    returns = data ?? [];
  }
  if (tab === 'fornitori') {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_name, status, total_cost, expected_delivery, received_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    purchaseOrders = data ?? [];
  }

  return (
    <WarehouseDashboard
      kpis={{
        ...kpis,
        movementsToday: movementsToday ?? 0,
        openReturns: openReturns ?? 0,
        openPO: openPO ?? 0,
      }}
      activeTab={tab}
      activeFilter={filter}
      inventory={(inventory ?? []) as never[]}
      movements={movements as never[]}
      returns={returns as never[]}
      purchaseOrders={purchaseOrders as never[]}
    />
  );
}
