'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { useCart } from '@/store/cart';
import { WishlistButton } from './WishlistButton';
import { SizeGuideModal } from './SizeGuideModal';
import type { ProductVariant } from '@/data/catalog-meta';

type Props = {
  slug: string;
  name: string;
  price: number;
  image: string;
  variants: ProductVariant[];
};

export function ProductPurchaseSection({ slug, name, price, image, variants }: Props) {
  const t = useTranslations('product');
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [showError, setShowError] = useState(false);

  const hasSizes = variants.length > 0;
  const selectedVariant = hasSizes
    ? variants.find((v) => v.size === selectedSize) ?? null
    : null;

  function handleAdd() {
    if (hasSizes && !selectedVariant) {
      setShowError(true);
      return;
    }
    setShowError(false);
    const effectivePrice = selectedVariant?.priceOverride ?? price;
    addItem({
      slug,
      name,
      price: effectivePrice,
      image,
      variantId: selectedVariant?.id,
      size: selectedVariant?.size,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    if (typeof window !== 'undefined' && window.silkincomTrack) {
      window.silkincomTrack('add_to_cart', {
        currency: 'EUR',
        value: effectivePrice,
        items: [
          {
            item_id: selectedVariant?.sku ?? slug,
            item_name: name,
            item_variant: selectedVariant?.size,
            price: effectivePrice,
            quantity: 1,
          },
        ],
      });
    }
    // First-party beacon (always, aggregate).
    window.silkincomAnalytics?.('add_to_cart', { product: slug, value: effectivePrice });
  }

  return (
    <div className="flex flex-col gap-5">
      {hasSizes ? (
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-soft-black">
              {t('size.label')}
            </p>
            {/* Apparel-specific size guide. Opens the modal directly instead
                of scrolling to an in-page anchor — the previous scroll-to
                approach failed on mobile (no anchor in viewport, and the
                target modal showed scarf formats, not S/M/L/XL/XXL). */}
            <SizeGuideModal mode="apparel" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {variants.map((v) => {
              const isSelected = v.size === selectedSize;
              const outOfStock = v.available <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    setSelectedSize(v.size);
                    setShowError(false);
                  }}
                  className={`relative min-h-[48px] text-sm uppercase tracking-[0.2em] border transition-all duration-200 ${
                    isSelected
                      ? 'border-soft-black bg-soft-black text-warm-white'
                      : outOfStock
                        ? 'border-pearl-grey/60 text-soft-grey/50 cursor-not-allowed line-through'
                        : 'border-pearl-grey text-soft-black hover:border-soft-black'
                  }`}
                  aria-label={`${t('size.label')} ${v.size}${outOfStock ? ` — ${t('size.outOfStock')}` : ''}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
          {selectedVariant ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              {selectedVariant.available > 0
                ? t('size.availableUnits', { n: selectedVariant.available })
                : t('size.outOfStock')}
            </p>
          ) : null}
          {showError ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-red-700">
              {t('size.selectFirst')}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleAdd}
        disabled={added}
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

      <WishlistButton productSlug={slug} />
    </div>
  );
}
