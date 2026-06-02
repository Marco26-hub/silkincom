'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/store/cart';

type Props = {
  slug: string;
  name: string;
  price: number;
  image: string;
};

export function AddToCartButton({ slug, name, price, image }: Props) {
  const t = useTranslations('product');
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({ slug, name, price, image });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    // Analytics — GA/Meta fire only with cookie consent…
    if (typeof window !== 'undefined' && window.silkincomTrack) {
      window.silkincomTrack('add_to_cart', {
        currency: 'EUR',
        value: price,
        items: [{ item_id: slug, item_name: name, price, quantity: 1 }],
      });
    }
    // …first-party beacon always (aggregate, non-identifying).
    window.silkincomAnalytics?.('add_to_cart', { product: slug, value: price });
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full px-8 py-4 text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 ${
        added
          ? 'bg-gold-primary text-soft-black'
          : 'bg-soft-black text-warm-white hover:bg-gold-primary hover:text-soft-black'
      }`}
    >
      {added ? (
        <>
          <Check className="w-4 h-4" />
          {t('addedToCart')}
        </>
      ) : (
        t('addToCart')
      )}
    </button>
  );
}
