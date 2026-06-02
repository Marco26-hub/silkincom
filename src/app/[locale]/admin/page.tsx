import { createServiceClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { ShoppingBag, Euro, Package, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function AdminOverview() {
  const supabase = createServiceClient();
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const start7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [
    { data: ordersToday },
    { data: orders7d },
    { count: pendingCount },
    { count: toShipCount },
    { data: invRows },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('orders').select('total_amount').gte('created_at', startToday).eq('payment_status', 'succeeded'),
    supabase.from('orders').select('total_amount').gte('created_at', start7d).eq('payment_status', 'succeeded'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    // All inventory rows + product status — we aggregate per product below so a
    // multi-variant product (e.g. sizes) shows its TRUE total, not one row, and
    // archived/duplicate products are excluded.
    supabase.from('inventory').select('product_id, quantity_available, products(name, slug, status)'),
    supabase.from('orders').select('id, order_number, customer_email, total_amount, status, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const revenueToday = (ordersToday ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0);
  const revenue7d = (orders7d ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Low stock: sum available across all inventory rows of each PUBLISHED product,
  // then keep those under the threshold. Aggregating fixes two bugs — variant
  // rows were shown individually (a product with M=1,L=1 looked like "0"), and
  // archived duplicates polluted the list.
  const LOW_STOCK_THRESHOLD = 5;
  const stockByProduct = new Map<string, { name: string; qty: number }>();
  for (const r of (invRows ?? []) as any[]) {
    // Supabase types the joined relation as array; at runtime it's the related
    // row (object) for a to-one FK — handle either shape.
    const prod = Array.isArray(r.products) ? r.products[0] : r.products;
    if (!prod || prod.status !== 'published') continue;
    const cur = stockByProduct.get(r.product_id) ?? { name: prod.name as string, qty: 0 };
    cur.qty += (r.quantity_available as number) ?? 0;
    stockByProduct.set(r.product_id, cur);
  }
  const lowStock = [...stockByProduct.entries()]
    .map(([product_id, v]) => ({ product_id, name: v.name, qty: v.qty }))
    .filter((v) => v.qty < LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 10);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Overview</h1>
        <p className="text-soft-grey text-sm">Riepilogo attività shop</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Euro} label="Fatturato oggi" value={formatPrice(revenueToday)} />
        <Stat icon={Euro} label="Fatturato 7 giorni" value={formatPrice(revenue7d)} />
        <Stat icon={ShoppingBag} label="Ordini pending" value={pendingCount?.toString() ?? '0'} accent="warning" />
        <Stat icon={Package} label="Da spedire" value={toShipCount?.toString() ?? '0'} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="border border-pearl-grey bg-white">
          <header className="px-6 py-4 border-b border-pearl-grey flex justify-between items-center">
            <h2 className="font-medium">Ordini recenti</h2>
            <Link href="/admin/ordini" className="text-xs text-gold-primary hover:underline">Vedi tutti</Link>
          </header>
          <div className="divide-y divide-pearl-grey/60">
            {(recentOrders ?? []).map((o) => (
              <Link key={o.id} href={`/admin/ordini/${o.id}`} className="px-6 py-3 flex justify-between items-center hover:bg-warm-white transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{o.order_number}</p>
                  <p className="text-xs text-soft-grey truncate">{o.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatPrice(Number(o.total_amount))}</p>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
            {!recentOrders?.length && <p className="px-6 py-8 text-sm text-soft-grey text-center">Nessun ordine</p>}
          </div>
        </section>

        <section className="border border-pearl-grey bg-white">
          <header className="px-6 py-4 border-b border-pearl-grey flex justify-between items-center">
            <h2 className="font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Scorta bassa
            </h2>
            <Link href="/admin/magazzino" className="text-xs text-gold-primary hover:underline">Magazzino</Link>
          </header>
          <div className="divide-y divide-pearl-grey/60">
            {lowStock.map((row) => (
              <div key={row.product_id} className="px-6 py-3 flex justify-between items-center">
                <span className="text-sm truncate">{row.name || '—'}</span>
                <span className={`text-sm font-medium ${row.qty === 0 ? 'text-red-600' : 'text-amber-600'}`}>{row.qty}</span>
              </div>
            ))}
            {!lowStock.length && <p className="px-6 py-8 text-sm text-soft-grey text-center">Tutti i prodotti hanno scorta sufficiente</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: 'warning' | 'success' }) {
  return (
    <div className="border border-pearl-grey bg-white p-5">
      <div className="flex items-center gap-2 text-soft-grey mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className={`font-display text-3xl ${accent === 'warning' ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-700',
    refunded: 'bg-gray-100 text-gray-700',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
