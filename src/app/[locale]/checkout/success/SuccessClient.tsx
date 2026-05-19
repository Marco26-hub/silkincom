'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/store/cart';

export function SuccessClient() {
  const t = useTranslations('checkout.success');
  const params = useSearchParams();
  const { clearCart } = useCart();
  const orderNumber = params.get('order_number');
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      useCart.persist.rehydrate();
      clearCart();
      setCleared(true);
    }
  }, [cleared, clearCart]);

  return (
    <section className="pt-40 pb-24 bg-warm-white min-h-[70vh]">
      <div className="max-w-[600px] mx-auto px-6 text-center">
        <CheckCircle className="w-16 h-16 text-gold-primary stroke-1 mx-auto mb-8" />
        <h1 className="font-display font-light text-4xl md:text-5xl mb-4">
          {t('title')}
        </h1>
        {orderNumber && (
          <p className="text-soft-grey font-light mb-2 text-sm tracking-[0.1em]">
            {t('orderNumber')} #{orderNumber}
          </p>
        )}
        <p className="text-soft-black/75 font-light leading-relaxed mb-10">
          {t('description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/collezioni"
            className="px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
          >
            {t('continueShopping')}
          </Link>
          <Link
            href="/account/ordini"
            className="px-10 py-4 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:border-gold-primary hover:text-gold-primary transition-all duration-300"
          >
            {t('viewOrders')}
          </Link>
        </div>
      </div>
    </section>
  );
}
