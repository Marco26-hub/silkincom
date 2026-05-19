'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { ArrowLeft, Package, Truck, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AccountShell } from '@/components/account/AccountShell';
import { ReturnRequestForm } from '@/components/account/ReturnRequestForm';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

type OrderDetail = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number;
  subtotal: number | null;
  shipping_cost: number | null;
  discount_amount: number | null;
  currency: string;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_address: Record<string, string> | null;
  tracking_number: string | null;
  carrier: string | null;
};

type OrderItem = {
  id: string;
  product_name: string | null;
  product_slug: string | null;
  quantity: number;
  price_per_unit: number;
  total_price: number;
};

export default function OrderDetailPage() {
  const t = useTranslations('account.orders');
  const tc = useTranslations('common');
  const tcheckout = useTranslations('checkout.fields');
  const tcart = useTranslations('cart');
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;
  const canCancel =
    !!order &&
    order.status === 'pending' &&
    Date.now() - new Date(order.created_at).getTime() < CANCEL_WINDOW_MS;

  async function handleCancel() {
    if (!order || !confirm('Sei sicuro di voler cancellare questo ordine? L\'azione è irreversibile.')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || 'Errore cancellazione');
      } else {
        router.refresh();
        const { data: updated } = await supabase.from('orders').select('*').eq('id', order.id).single();
        if (updated) setOrder(updated as OrderDetail);
      }
    } catch {
      setCancelError('Errore di rete');
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderData) {
        setOrder(orderData as OrderDetail);
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('id, product_name, product_slug, quantity, price_per_unit, total_price')
          .eq('order_id', id);
        setItems((itemsData as OrderItem[]) || []);
      }
      setLoading(false);
    })();
  }, [id]);

  return (
    <AccountShell title={t('viewDetails')}>
      <Link
        href="/account/ordini"
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-soft-black/60 hover:text-gold-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {t('title')}
      </Link>

      {loading ? (
        <p className="text-sm text-soft-black/60 font-light">{tc('loading')}</p>
      ) : !order ? (
        <div className="bg-ivory border border-pearl-grey/60 px-8 py-14 text-center">
          <Package className="w-10 h-10 text-soft-black/30 stroke-1 mx-auto mb-5" />
          <p className="font-display font-light text-xl">{tc('error')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div className="border border-pearl-grey/60 p-6 bg-ivory">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-1">
                  {t('orderNumber')} {order.order_number || `#${order.id.slice(0, 8)}`}
                </p>
                <p className="text-sm text-soft-black/70 font-light">
                  {new Date(order.created_at).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] uppercase tracking-[0.25em] px-4 py-1.5 border border-pearl-grey bg-warm-white">
                  {t(`status.${order.status}` as any)}
                </span>
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-red-700 border-b border-red-300 hover:border-red-700 pb-0.5 disabled:opacity-60"
                  >
                    <X className="w-3 h-3" />
                    {cancelling ? 'Annullamento…' : 'Cancella ordine'}
                  </button>
                )}
              </div>
            </div>
            {cancelError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-3" role="alert">
                {cancelError}
              </p>
            )}

            {order.tracking_number && (
              <div className="flex items-center gap-2 text-sm text-soft-black/70 mt-3">
                <Truck className="w-4 h-4 text-gold-primary" />
                <span>{order.carrier || 'Carrier'}: <strong>{order.tracking_number}</strong></span>
              </div>
            )}
          </div>

          {/* Tracking timeline */}
          {order.status !== 'cancelled' && (
            <div className="border border-pearl-grey/60 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-6">
                Stato spedizione
              </p>
              <ol className="space-y-5">
                {[
                  { key: 'created', label: 'Ordine ricevuto', date: order.created_at, reached: true },
                  {
                    key: 'paid',
                    label: 'Pagamento confermato',
                    date: order.paid_at,
                    reached: !!order.paid_at || ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
                  },
                  {
                    key: 'shipped',
                    label: 'Spedito',
                    date: order.shipped_at,
                    reached: !!order.shipped_at || ['shipped', 'delivered'].includes(order.status),
                  },
                  {
                    key: 'delivered',
                    label: 'Consegnato',
                    date: order.delivered_at,
                    reached: !!order.delivered_at || order.status === 'delivered',
                  },
                ].map((step, i, arr) => (
                  <li key={step.key} className="flex items-start gap-4 relative">
                    <span
                      className={`relative z-10 mt-0.5 flex-shrink-0 w-3 h-3 rounded-full border ${
                        step.reached
                          ? 'bg-gold-primary border-gold-primary'
                          : 'bg-warm-white border-pearl-grey'
                      }`}
                    />
                    {i < arr.length - 1 && (
                      <span
                        className={`absolute left-[5px] top-3 bottom-[-20px] w-px ${
                          arr[i + 1].reached ? 'bg-gold-primary' : 'bg-pearl-grey'
                        }`}
                      />
                    )}
                    <div className="flex-1 -mt-0.5">
                      <p className={`text-sm font-light ${step.reached ? 'text-soft-black' : 'text-soft-black/40'}`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-soft-black/50 mt-0.5">
                          {new Date(step.date).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Items */}
          {items.length > 0 && (
            <div className="border border-pearl-grey/60">
              <div className="px-6 py-3 bg-ivory border-b border-pearl-grey/40">
                <p className="text-[10px] uppercase tracking-[0.25em] text-soft-black/60">{tcart('items')}</p>
              </div>
              <div className="divide-y divide-pearl-grey/40">
                {items.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {item.product_slug ? (
                        <Link
                          href={`/prodotto/${item.product_slug}`}
                          className="font-display text-lg hover:text-gold-primary transition-colors"
                        >
                          {item.product_name || item.product_slug}
                        </Link>
                      ) : (
                        <span className="font-display text-lg">{item.product_name || 'Prodotto'}</span>
                      )}
                      <p className="text-xs text-soft-black/50 mt-0.5">
                        {tcart('quantity')}: {item.quantity} × {formatPrice(item.price_per_unit)}
                      </p>
                      {order.status === 'delivered' && item.product_slug && (
                        <Link
                          href={`/prodotto/${item.product_slug}#review`}
                          className="inline-block mt-2 text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-gold-primary/40 hover:border-gold-primary pb-0.5"
                        >
                          Lascia recensione →
                        </Link>
                      )}
                    </div>
                    <span className="font-display text-lg">{formatPrice(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="border border-pearl-grey/60 p-6 space-y-3">
            {order.subtotal != null && (
              <div className="flex justify-between text-sm">
                <span className="text-soft-black/60">{tcart('subtotal')}</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
            )}
            {order.shipping_cost != null && (
              <div className="flex justify-between text-sm">
                <span className="text-soft-black/60">{tcart('shipping')}</span>
                <span>{order.shipping_cost === 0 ? tcart('shippingFree') : formatPrice(order.shipping_cost)}</span>
              </div>
            )}
            {order.discount_amount != null && order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-gold-dark">
                <span>Sconto coupon</span>
                <span>−{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium border-t border-pearl-grey/40 pt-3">
              <span>{tcart('total')}</span>
              <span className="font-display text-xl">{formatPrice(order.total_amount)}</span>
            </div>
          </div>

          {/* Return request — only for delivered orders within 14 days */}
          {order.status === 'delivered' && order.delivered_at &&
            (Date.now() - new Date(order.delivered_at).getTime()) / 86_400_000 <= 14 && (
              <ReturnRequestForm orderId={order.id} />
            )}

          {/* Shipping address */}
          {order.shipping_address && (
            <div className="border border-pearl-grey/60 p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-soft-black/60 mb-3">{tcheckout('address')}</p>
              <p className="text-sm font-light text-soft-black/80 leading-relaxed">
                {order.shipping_address.full_name && <>{order.shipping_address.full_name}<br /></>}
                {order.shipping_address.street_address && <>{order.shipping_address.street_address}<br /></>}
                {order.shipping_address.postal_code} {order.shipping_address.city}<br />
                {order.shipping_address.country}
              </p>
            </div>
          )}
        </div>
      )}
    </AccountShell>
  );
}
