'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

type Props = {
  productSlug: string;
};

export function WishlistButton({ productSlug }: Props) {
  const t = useTranslations('product.wishlist');
  const [productId, setProductId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data: prod } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productSlug)
        .single();
      if (!prod) {
        setChecking(false);
        return;
      }
      setProductId(prod.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: row } = await supabase
          .from('wishlist')
          .select('id')
          .eq('customer_id', user.id)
          .eq('product_id', prod.id)
          .maybeSingle();
        setAdded(!!row);
      }
      setChecking(false);
    })();
  }, [productSlug]);

  async function handleClick() {
    if (loading) return;
    setError(null);

    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = `/login?redirect=/prodotto/${productSlug}`;
      return;
    }

    let pid = productId;
    if (!pid) {
      const { data: prod } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productSlug)
        .single();
      pid = prod?.id || null;
      setProductId(pid);
    }
    if (!pid) {
      setError('Prodotto non trovato');
      return;
    }

    setLoading(true);
    try {
      if (added) {
        await supabase
          .from('wishlist')
          .delete()
          .eq('customer_id', user.id)
          .eq('product_id', pid);
        setAdded(false);
      } else {
        const { error: insertError } = await supabase
          .from('wishlist')
          .insert({ customer_id: user.id, product_id: pid });
        if (insertError && insertError.code === '23505') {
          setAdded(true);
        } else if (insertError) {
          throw insertError;
        } else {
          setAdded(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Errore');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || checking}
        className={`w-full px-8 py-4 border text-[11px] uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-60 ${
          added
            ? 'border-gold-primary text-gold-primary bg-gold-primary/5'
            : 'border-soft-black/80 text-soft-black hover:border-gold-primary hover:text-gold-primary'
        }`}
      >
        <Heart className={`w-4 h-4 ${added ? 'fill-gold-primary' : ''}`} />
        {added ? t('remove') : t('add')}
      </button>
      {error && (
        <p className="text-xs text-red-700 mt-2 px-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
