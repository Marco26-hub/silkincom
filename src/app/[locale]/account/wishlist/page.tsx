'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AccountShell } from '@/components/account/AccountShell';
import { createBrowserClient } from '@/lib/supabase/client';

type WishlistRow = {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    name: string;
    slug: string;
    price: number;
    product_images: { image_url: string; is_primary: boolean }[];
  } | null;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function WishlistPage() {
  const t = useTranslations('account.wishlistPage');
  const tc = useTranslations('common');
  const tcart = useTranslations('cart');
  const locale = useLocale();
  const [items, setItems] = useState<WishlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  async function load() {
    const { data } = await supabase
      .from('wishlist')
      .select('id, product_id, created_at, products(name, slug, price, product_images(image_url, is_primary))')
      .order('created_at', { ascending: false });
    setItems((data as unknown as WishlistRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(id: string) {
    await supabase.from('wishlist').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <AccountShell title={t('title')}>
      {loading ? (
        <p className="text-sm text-soft-black/60 font-light">{tc('loading')}</p>
      ) : items.length === 0 ? (
        <div className="bg-ivory border border-pearl-grey/60 px-8 py-14 text-center">
          <Heart className="w-10 h-10 text-gold-primary stroke-1 mx-auto mb-5" />
          <p className="font-display font-light text-xl mb-3">{t('empty')}</p>
          <p className="text-sm text-soft-black/60 font-light mb-7 max-w-md mx-auto">
            {t('emptySuggestion')}
          </p>
          <Link href="/collezioni" className="inline-flex items-center gap-2 px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-all">
            {t('browseAction')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((it) => {
            const p = it.products;
            const img = p?.product_images?.find((i) => i.is_primary)?.image_url ?? p?.product_images?.[0]?.image_url;
            return (
              <li key={it.id} className="border border-pearl-grey/60 p-4 flex gap-4">
                <div className="relative w-24 h-24 bg-beige-light flex-shrink-0">
                  {img && <Image src={img} alt={p?.name ?? ''} fill sizes="96px" className="object-cover" />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  {p ? (
                    <>
                      <Link href={`/prodotto/${p.slug}`} className="font-display text-lg leading-tight hover:text-gold-primary line-clamp-2">
                        {p.name}
                      </Link>
                      <p className="text-sm text-soft-black/70 mt-1">{formatPrice(Number(p.price))}</p>
                    </>
                  ) : (
                    <p className="text-sm text-soft-grey italic">{t('unavailable')}</p>
                  )}
                  <div className="mt-auto flex justify-between items-end pt-3">
                    <span className="text-[10px] text-soft-black/50">
                      {new Date(it.created_at).toLocaleDateString(locale)}
                    </span>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="text-xs text-soft-grey hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> {tcart('remove')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
