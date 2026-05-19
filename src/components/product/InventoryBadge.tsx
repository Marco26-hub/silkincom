'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

const LOW_STOCK_THRESHOLD = 5;

export function InventoryBadge({ productSlug }: { productSlug: string }) {
  const t = useTranslations('inventoryBadge');
  const [qty, setQty] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase
      .from('inventory')
      .select('quantity_available, product_id, products!inner(slug)')
      .eq('products.slug', productSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setQty((data as any).quantity_available ?? null);
      });
  }, [productSlug]);

  if (qty === null) return null;
  if (qty === 0) {
    return (
      <p className="text-[11px] uppercase tracking-[0.25em] text-red-600 font-medium">
        {t('outOfStock')}
      </p>
    );
  }
  if (qty <= LOW_STOCK_THRESHOLD) {
    return (
      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 font-medium animate-pulse">
        {t('lowStock', { count: qty })}
      </p>
    );
  }
  return null;
}
