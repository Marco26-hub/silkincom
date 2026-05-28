'use client';

import { useEffect, useState } from 'react';
import { X, Minus, Plus, ShoppingBag, Tag } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useCart } from '@/store/cart';
import { FREE_SHIPPING_THRESHOLD } from '@/config/shipping';
import { formatPrice } from '@/lib/utils';

export function CartDrawer() {
  const t = useTranslations('cart');
  const tc2 = useTranslations('cart.coupon');
  const tn = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { items, isOpen, closeCart, removeItem, updateQty, total, count, coupon, applyCoupon, removeCoupon } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: total(), locale }),
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
        setCouponMsg({ type: 'error', text: data.message || tc2('invalid') });
      }
    } catch {
      setCouponMsg({ type: 'error', text: tc2('networkError') });
    } finally {
      setCouponLoading(false);
    }
  }

  const subtotal = total();
  const discount = coupon?.discount_amount ?? 0;
  const totalAfter = Math.max(subtotal - discount, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-soft-black/40 z-40 backdrop-blur-sm"
            onClick={closeCart}
          />

          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-warm-white z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 sm:px-8 py-5 sm:py-6 border-b border-pearl-grey/40">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 stroke-1" />
                <span className="text-[11px] uppercase tracking-[0.25em]">
                  {tn('cart')} ({count()})
                </span>
              </div>
              <button
                onClick={closeCart}
                className="p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-gold-primary transition-colors"
                aria-label={tc('close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <ShoppingBag className="w-16 h-16 stroke-[0.75] text-pearl-grey mb-6" />
                  <p className="font-display italic text-2xl text-soft-black/50 mb-2">
                    {t('empty')}
                  </p>
                  <p className="text-sm text-soft-grey font-light mb-8">
                    {t('emptyAction')}
                  </p>
                  <Link
                    href="/collezioni"
                    onClick={closeCart}
                    className="px-8 py-3 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
                  >
                    {tn('collections')}
                  </Link>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.slug} className="flex gap-5">
                    <div className="relative w-24 h-32 flex-shrink-0 overflow-hidden bg-beige-light">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-contain p-2"
                        />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-lg font-light leading-tight mb-1">
                          {item.name}
                        </h3>
                        {item.size ? (
                          <p className="text-[10px] uppercase tracking-[0.25em] text-gold-primary mb-1">
                            Taglia {item.size}
                          </p>
                        ) : null}
                        <p className="text-sm text-soft-black">
                          €{item.price.toFixed(0)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 border border-pearl-grey">
                          <button
                            onClick={() => updateQty(item.slug, item.quantity - 1, item.variantId)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-gold-primary transition-colors"
                            aria-label="−"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.slug, item.quantity + 1, item.variantId)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-gold-primary transition-colors"
                            aria-label="+"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.slug, item.variantId)}
                          className="text-[10px] uppercase tracking-[0.15em] text-soft-grey hover:text-soft-black transition-colors"
                        >
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-5 sm:px-8 py-5 sm:py-6 border-t border-pearl-grey/40 space-y-4">
                {coupon ? (
                  <div className="flex items-center justify-between text-sm text-gold-dark border border-gold-primary/40 bg-gold-primary/5 px-3 py-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      {coupon.code}
                      <button
                        onClick={() => { removeCoupon(); setCouponMsg(null); }}
                        aria-label={tc2('remove')}
                        className="text-soft-black/50 hover:text-soft-black ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                    <span>−{formatPrice(discount)}</span>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon}>
                    <label className="block text-[10px] uppercase tracking-[0.25em] text-soft-black/60 mb-2">
                      {tc2('label')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={tc2('placeholder')}
                        autoComplete="off"
                        autoCapitalize="characters"
                        className="flex-1 px-3 py-2.5 border border-pearl-grey bg-warm-white text-xs uppercase tracking-[0.15em] focus:outline-none focus:border-gold-primary min-h-[44px]"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50 min-h-[44px]"
                      >
                        {couponLoading ? '…' : tc2('apply')}
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

                <div className="flex justify-between items-center pt-2 border-t border-pearl-grey/40">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-soft-grey">
                    {t('subtotal')}
                  </span>
                  <span className="font-display text-2xl font-light">
                    €{totalAfter.toFixed(0)}
                  </span>
                </div>
                <p className="text-[11px] text-soft-grey leading-relaxed">
                  {t('shippingThreshold', { amount: `€${FREE_SHIPPING_THRESHOLD}` })}
                </p>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="block w-full py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] text-center hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
                >
                  {t('checkout')}
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
