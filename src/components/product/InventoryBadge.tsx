'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';
import { getWinterProduct, WINTER_AVAILABILITY } from '@/data/winter-2026';
import { useLocale } from 'next-intl';

const LOW_STOCK_THRESHOLD = 5;

export function InventoryBadge({ productSlug, variantStock }: { productSlug: string; variantStock?: number }) {
  const t = useTranslations('inventoryBadge');
  const locale = useLocale();
  const winter = getWinterProduct(productSlug);
  const [qty, setQty] = useState<number | null>(null);

  useEffect(() => {
    if (variantStock !== undefined) return;
    const supabase = createBrowserClient();
    supabase
      .from('inventory')
      .select('quantity_available, product_id, products!inner(slug)')
      .eq('products.slug', productSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setQty((data as any).quantity_available ?? null);
      });
  }, [productSlug, variantStock]);

  const available = variantStock ?? qty;

  if (available === null) return null;
  if (available === 0) {
    return (
      <p className="text-[11px] uppercase tracking-[0.25em] text-red-600 font-medium">
        {winter ? WINTER_AVAILABILITY.unavailable[locale as keyof typeof WINTER_AVAILABILITY.unavailable] : t('outOfStock')}
      </p>
    );
  }
  if (available <= LOW_STOCK_THRESHOLD) {
    return (
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 font-medium animate-pulse">
        {t('lowStock', { count: available })}
      </p>
    );
  }
  return null;
}
