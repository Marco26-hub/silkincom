/**
 * ProductReviews — server component on PDP.
 * Lists approved reviews + renders ReviewForm (client) below.
 */
import { Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';

type Props = {
  productSlug: string;
  isAuthenticated: boolean;
};

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string;
  verified_purchase: boolean;
  created_at: string;
};

export async function ProductReviews({ productSlug, isAuthenticated }: Props) {
  const t = await getTranslations('product');
  let reviews: Review[] = [];
  let stats = { count: 0, average: 0 };

  try {
    const supabase = createServiceClient();
    const [{ data: rows }, { data: statsRows }] = await Promise.all([
      supabase
        .from('reviews_public')
        .select('id, rating, title, body, author_name, verified_purchase, created_at')
        .eq('product_slug', productSlug)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.rpc('product_review_stats', { p_slug: productSlug }),
    ]);
    if (rows) reviews = rows as Review[];
    if (statsRows && Array.isArray(statsRows) && statsRows[0]) {
      stats = {
        count: Number(statsRows[0].count || 0),
        average: Number(statsRows[0].average || 0),
      };
    }
  } catch {
    // Fail gracefully — no reviews shown
  }

  return (
    <div className="space-y-12">
      {stats.count > 0 ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(stats.average)
                    ? 'fill-gold-primary text-gold-primary'
                    : 'text-pearl-grey'
                }`}
                strokeWidth={1.4}
              />
            ))}
          </div>
          <p className="text-sm text-soft-black/70 font-light">
            {t('reviews.summary', { average: stats.average, count: stats.count })}
          </p>
        </div>
      ) : (
        <p className="text-center font-display italic text-lg text-soft-black/60">
          {t('reviews.empty')}
        </p>
      )}

      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="border border-pearl-grey/60 p-6 bg-warm-white"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= r.rating
                          ? 'fill-gold-primary text-gold-primary'
                          : 'text-pearl-grey'
                      }`}
                      strokeWidth={1.4}
                    />
                  ))}
                </div>
                {r.verified_purchase && (
                  <span className="text-[9px] uppercase tracking-[0.25em] text-gold-dark">
                    {t('reviews.verified')}
                  </span>
                )}
              </div>
              {r.title && (
                <h3 className="font-display text-lg leading-tight mb-2">
                  {r.title}
                </h3>
              )}
              {r.body && (
                <p className="text-sm font-light leading-relaxed text-soft-black/75 mb-4">
                  {r.body}
                </p>
              )}
              <p className="text-[11px] uppercase tracking-[0.25em] text-soft-black/50 border-t border-pearl-grey/40 pt-3">
                {r.author_name}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="pt-6 border-t border-pearl-grey/40">
        <h3 className="font-display font-light text-2xl mb-6 text-center">
          {t('reviews.leaveReview')}
        </h3>
        <ReviewForm productSlug={productSlug} isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
