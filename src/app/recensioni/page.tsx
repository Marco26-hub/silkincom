import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  const t = await getTranslations('recensioniPage');
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: { canonical: '/recensioni' },
  };
}

type Review = {
  id: string;
  product_slug: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string;
  created_at: string;
};

export default async function RecensioniPage() {
  const t = await getTranslations('recensioniPage');
  let reviews: Review[] = [];
  let stats = { count: 0, average: 0 };

  try {
    const supabase = createServiceClient();
    const { data: rows } = await supabase
      .from('reviews_public')
      .select('id, product_slug, rating, title, body, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(40);
    if (rows) reviews = rows as Review[];
    if (rows && rows.length > 0) {
      const total = rows.reduce((acc, r) => acc + r.rating, 0);
      stats = { count: rows.length, average: Number((total / rows.length).toFixed(2)) };
    }
  } catch {
    // Supabase view missing — fail silent
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-44 pb-20 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('hero.eyebrow')}
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
            {t.rich('hero.title', {
              em: (chunks) => (
                <em className="italic text-gold-primary">{chunks}</em>
              ),
            })}
          </h1>
          {stats.count > 0 ? (
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= Math.round(stats.average)
                        ? 'fill-gold-primary text-gold-primary'
                        : 'text-pearl-grey'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-soft-black/70 font-light">
                {t('hero.ratingSummary', {
                  average: stats.average,
                  count: stats.count,
                })}
              </span>
            </div>
          ) : (
            <p className="text-base font-light text-soft-black/70 max-w-xl mx-auto">
              {t('hero.emptyState')}
            </p>
          )}
        </div>
      </section>

      {/* Reviews grid */}
      {reviews.length > 0 && (
        <section className="py-20 md:py-28 bg-warm-white">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.map((r) => (
              <article
                key={r.id}
                className="border border-pearl-grey/60 p-8 bg-warm-white"
              >
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= r.rating
                          ? 'fill-gold-primary text-gold-primary'
                          : 'text-pearl-grey'
                      }`}
                    />
                  ))}
                </div>
                {r.title && (
                  <h3 className="font-display text-lg leading-tight mb-3">
                    {r.title}
                  </h3>
                )}
                {r.body && (
                  <p className="text-sm font-light leading-relaxed text-soft-black/75 mb-5 line-clamp-5">
                    {r.body}
                  </p>
                )}
                <div className="border-t border-pearl-grey/40 pt-4">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-soft-black/50">
                    {r.author_name}
                  </p>
                  <Link
                    href={`/prodotto/${r.product_slug}`}
                    className="text-[10px] uppercase tracking-[0.25em] text-gold-dark hover:text-gold-primary mt-1 inline-block"
                  >
                    {r.product_slug.replace(/-/g, ' ')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-ivory text-center">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-base font-light text-soft-black/70 mb-8 leading-relaxed">
            {t('cta.text')}
          </p>
          <Link
            href="/account/ordini"
            className="inline-flex items-center gap-3 px-12 py-5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.4em] hover:bg-gold-primary hover:text-soft-black transition-all duration-500 group"
          >
            {t('cta.button')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
}
