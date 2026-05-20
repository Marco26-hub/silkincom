import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { OrderStatusForm } from '@/components/admin/OrderStatusForm';
import { PacklinkShipPanel } from '@/components/admin/PacklinkShipPanel';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, product_variants(size)), order_status_history(previous_status, new_status, changed_at, notes)')
    .eq('id', id)
    .single();

  if (!order) notFound();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <Link href="/admin/ordini" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" />
        Tutti gli ordini
      </Link>

      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl mb-1">{order.order_number}</h1>
          <p className="text-soft-grey text-sm">{order.customer_email}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-display">{formatPrice(Number(order.total_amount))}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-soft-grey mt-1">Totale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <section className="border border-pearl-grey bg-white">
            <header className="px-6 py-4 border-b border-pearl-grey">
              <h2 className="font-medium">Articoli</h2>
            </header>
            <div className="divide-y divide-pearl-grey/60">
              {(order.order_items ?? []).map((item: any) => {
                const size: string | null = item.product_variants?.size ?? null;
                // Strip any "(Taglia X)" suffix already baked into product_name
                // to avoid duplication when we render the badge.
                const cleanName = typeof item.product_name === 'string'
                  ? item.product_name.replace(/\s*\(Taglia\s+[A-Z]+\)\s*$/i, '')
                  : item.product_name;
                return (
                  <div key={item.id} className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {cleanName}
                        {size ? (
                          <span className="ml-2 inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 text-[9px] font-medium tracking-wider bg-soft-black text-warm-white uppercase">
                            {size}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-soft-grey">×{item.quantity} · {formatPrice(Number(item.price_per_unit))}</p>
                    </div>
                    <p className="text-sm font-medium">{formatPrice(Number(item.total_price))}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-pearl-grey space-y-2 text-sm">
              <div className="flex justify-between text-soft-grey">
                <span>Subtotale</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-soft-grey">
                <span>Spedizione</span>
                <span>{Number(order.shipping_cost) === 0 ? 'Gratuita' : formatPrice(Number(order.shipping_cost))}</span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-gold-dark">
                  <span>Sconto coupon</span>
                  <span>−{formatPrice(Number(order.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t border-pearl-grey">
                <span>Totale</span>
                <span>{formatPrice(Number(order.total_amount))}</span>
              </div>
            </div>
          </section>

          <section className="border border-pearl-grey bg-white">
            <header className="px-6 py-4 border-b border-pearl-grey">
              <h2 className="font-medium">Cronologia stati</h2>
            </header>
            <div className="divide-y divide-pearl-grey/60">
              {(order.order_status_history ?? []).map((h: any, i: number) => (
                <div key={i} className="px-6 py-3 flex justify-between text-sm">
                  <span>
                    {h.previous_status ? `${h.previous_status} → ` : ''}
                    <span className="font-medium">{h.new_status}</span>
                  </span>
                  <span className="text-xs text-soft-grey">{new Date(h.changed_at).toLocaleString('it-IT')}</span>
                </div>
              ))}
              {!order.order_status_history?.length && <p className="px-6 py-4 text-sm text-soft-grey">Nessun cambio stato</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <OrderStatusForm
            orderId={order.id}
            currentStatus={order.status}
            currentTracking={order.tracking_number}
          />

          <PacklinkShipPanel orderId={order.id} />

          <section className="border border-pearl-grey bg-white p-6">
            <h2 className="font-medium mb-3 text-sm">Pagamento</h2>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between"><dt className="text-soft-grey">Stato</dt><dd>{order.payment_status}</dd></div>
              <div className="flex justify-between"><dt className="text-soft-grey">Metodo</dt><dd>{order.payment_method ?? '—'}</dd></div>
              {order.stripe_payment_intent_id && (
                <div className="flex justify-between"><dt className="text-soft-grey">Stripe ID</dt><dd className="text-[10px] truncate ml-2">{order.stripe_payment_intent_id}</dd></div>
              )}
              {order.paid_at && (
                <div className="flex justify-between"><dt className="text-soft-grey">Pagato il</dt><dd>{new Date(order.paid_at).toLocaleDateString('it-IT')}</dd></div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
