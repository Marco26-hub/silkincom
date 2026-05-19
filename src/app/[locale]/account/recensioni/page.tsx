'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { Star, Clock, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AccountShell } from '@/components/account/AccountShell';
import { createBrowserClient } from '@/lib/supabase/client';

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  product_id: string;
  products?: { name: string; slug: string } | null;
};

export default function AccountReviewsPage() {
  const tc = useTranslations('common');
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, title, comment, is_verified_purchase, is_approved, created_at, product_id, products(name, slug)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setReviews((data as unknown as ReviewRow[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <AccountShell title="Le mie recensioni">
      {loading ? (
        <p className="text-sm text-soft-black/60 font-light">{tc('loading')}</p>
      ) : reviews.length === 0 ? (
        <div className="bg-ivory border border-pearl-grey/60 px-8 py-14 text-center">
          <Star className="w-10 h-10 text-gold-primary stroke-1 mx-auto mb-5" />
          <p className="font-display font-light text-xl mb-3">Nessuna recensione</p>
          <p className="text-sm text-soft-black/60 font-light mb-7 max-w-md mx-auto">
            Dopo la consegna di un ordine potrà lasciare una recensione sul prodotto acquistato.
          </p>
          <Link
            href="/account/ordini"
            className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-soft-black border-b border-soft-black hover:border-gold-primary hover:text-gold-primary pb-1 transition-colors"
          >
            Vai ai miei ordini
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="border border-pearl-grey/60 bg-warm-white p-6">
              <header className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-gold-primary text-gold-primary' : 'text-pearl-grey'}`}
                          strokeWidth={1.4}
                        />
                      ))}
                    </div>
                    {r.is_verified_purchase && (
                      <span className="text-[9px] uppercase tracking-[0.25em] text-gold-dark">
                        Acquisto verificato
                      </span>
                    )}
                  </div>
                  {r.products && (
                    <Link
                      href={`/prodotto/${r.products.slug}`}
                      className="text-[11px] uppercase tracking-[0.25em] text-soft-black/60 hover:text-gold-primary"
                    >
                      {r.products.name}
                    </Link>
                  )}
                </div>
                {r.is_approved ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-green-700 bg-green-50 border border-green-200 px-3 py-1.5">
                    <Check className="w-3 h-3" /> Pubblicata
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5">
                    <Clock className="w-3 h-3" /> In moderazione
                  </span>
                )}
              </header>
              {r.title && <h3 className="font-display text-lg leading-tight mb-2">{r.title}</h3>}
              {r.comment && (
                <p className="text-sm font-light text-soft-black/75 leading-relaxed">
                  {r.comment}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-[0.25em] text-soft-black/40 mt-4 pt-3 border-t border-pearl-grey/40">
                {new Date(r.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </article>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
