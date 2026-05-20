'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Minus, Plus, ShoppingBag, Trash2, Tag, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST, computeShipping } from '@/config/shipping';

export function CartPageClient() {
  const t = useTranslations('cart');
  const tn = useTranslations('nav');
  const { items, removeItem, updateQty, total, count, coupon, applyCoupon, removeCoupon } = useCart();
  const router = useRouter();
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: total() }),
      });
      const data = await res.json();
      if (data.valid) {
        applyCoupon({
          code: data.code,
          discount_amount: data.discount_amount,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
        });
        setCouponMsg({ type: 'success', text: data.message });
        setCouponInput('');
      } else {
        setCouponMsg({ type: 'error', text: data.message || 'Codice non valido' });
      }
    } catch {
      setCouponMsg({ type: 'error', text: 'Errore di rete' });
    } finally {
      setCouponLoading(false);
    }
  }

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  return (
    <section className="pt-40 pb-24 bg-warm-white min-h-[70vh]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
        <h1 className="font-display font-light text-4xl md:text-5xl mb-2">{t('title')}</h1>
        <p className="text-soft-grey font-light mb-10">{count()} {count() === 1 ? t('item') : t('items')}</p>

        {items.length === 0 ? (
          <div className="max-w-3xl mx-auto text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gold-primary stroke-1 mx-auto mb-6" />
            <p className="text-soft-grey font-light mb-10">{t('empty')}</p>
            <Link
              href="/collezioni"
              className="inline-flex items-center gap-3 px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
            >
              {t('emptyAction')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
            <div className="space-y-5">
              {items.map((item) => (
                <article key={item.slug} className="border border-pearl-grey/70 p-4 md:p-5 flex gap-4">
                  <div className="relative w-24 h-24 md:w-28 md:h-28 bg-beige-light overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill sizes="112px" className="object-contain p-3" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl leading-tight">{item.name}</h2>
                        <p className="text-soft-grey text-sm">{item.slug}</p>
                        {item.size ? (
                          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold-primary">
                            Taglia {item.size}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-lg">{formatPrice(item.price)}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center border border-pearl-grey">
                        <button
                          onClick={() => updateQty(item.slug, item.quantity - 1, item.variantId)}
                          className="p-2 hover:text-gold-primary transition-colors"
                          aria-label="−"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.slug, item.quantity + 1, item.variantId)}
                          className="p-2 hover:text-gold-primary transition-colors"
                          aria-label="+"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.slug, item.variantId)}
                        className="inline-flex items-center gap-2 text-sm text-soft-grey hover:text-soft-black transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit border border-pearl-grey/70 p-6 space-y-4 lg:sticky lg:top-32">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-soft-grey">{t('summary')}</h3>
              <div className="flex justify-between text-sm">
                <span>{t('subtotal')}</span>
                <span>{formatPrice(total())}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-sm text-gold-dark">
                  <span className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" />
                    {coupon.code}
                    <button
                      onClick={() => { removeCoupon(); setCouponMsg(null); }}
                      aria-label="Rimuovi coupon"
                      className="text-soft-black/40 hover:text-soft-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                  <span>−{formatPrice(coupon.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>{t('shipping')}</span>
                <span>{total() >= FREE_SHIPPING_THRESHOLD ? t('shippingFree') : formatPrice(STANDARD_SHIPPING_COST)}</span>
              </div>
              <div className="border-t border-pearl-grey pt-3 flex justify-between font-medium">
                <span>{t('total')}</span>
                <span>
                  {formatPrice(
                    Math.max(total() - (coupon?.discount_amount ?? 0), 0) + computeShipping(total())
                  )}
                </span>
              </div>

              {/* Coupon field */}
              {!coupon && (
                <form onSubmit={handleApplyCoupon} className="pt-2">
                  <label className="block text-[10px] uppercase tracking-[0.25em] text-soft-black/60 mb-2">
                    Codice sconto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="ES. BENVENUTA10"
                      className="flex-1 px-3 py-2.5 border border-pearl-grey bg-warm-white text-xs uppercase tracking-[0.15em] focus:outline-none focus:border-gold-primary"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-4 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? '…' : 'Applica'}
                    </button>
                  </div>
                </form>
              )}
              {couponMsg && (
                <p
                  className={`text-xs leading-relaxed ${
                    couponMsg.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}
                  role="status"
                >
                  {couponMsg.text}
                </p>
              )}

              <button
                onClick={() => router.push('/checkout')}
                className="w-full mt-2 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
              >
                {t('checkout')}
              </button>
              <p className="text-xs text-soft-grey leading-relaxed">
                {t('shippingThreshold', { amount: '€200' })}
              </p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
