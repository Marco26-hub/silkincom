import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { StarRating } from '@/components/product/StarRating';

type Row = {
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string;
  verified_purchase: boolean;
  product_slug: string;
  created_at: string;
};

// Home has zero social proof today — this band surfaces the most recent
// review right after ShopStrip and links straight to its PDP (the
// home→product leak is the site's biggest conversion gap). Renders nothing
// until a review exists, so an empty store never shows an empty trust band.
export async function SocialProof() {
  const t = await getTranslations('home.socialProof');
  const tp = await getTranslations('product');
  let rows: Row[] = [];

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('reviews_public')
      .select('rating, title, body, author_name, verified_purchase, product_slug, created_at')
      .order('created_at', { ascending: false })
      .limit(12);
    if (data) rows = data as Row[];
  } catch {
    return null;
  }

  if (rows.length === 0) return null;

  const average = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
  const featured = rows.find((r) => r.body) ?? rows[0];

  return (
    <section className="bg-[#f2ede4] py-20 md:py-28">
      <div className="mx-auto max-w-[900px] px-6 lg:px-10 text-center">
        <span className="mx-auto mb-4 block h-px w-12 bg-gold-dark" />
        <span className="mb-4 block text-[9px] uppercase tracking-[0.42em] text-gold-dark">
          {t('eyebrow')}
        </span>
        <h2 className="font-display text-4xl font-light leading-[1.05] tracking-[-0.02em] md:text-5xl mb-6">
          {t('titlePlain')} <em className="italic text-gold-dark">{t('titleAccent')}</em>
        </h2>

        <div className="mb-3 flex justify-center">
          <StarRating rating={average} size="md" />
        </div>
        <p className="mb-12 text-sm font-light text-soft-black/60">
          {tp('reviews.summary', { average, count: rows.length })}
        </p>

        <blockquote className="mx-auto max-w-xl">
          {featured.title && (
            <p className="font-display mb-5 text-2xl italic text-soft-black md:text-3xl">
              «{featured.title}»
            </p>
          )}
          {featured.body && (
            <p className="mb-6 text-sm font-light leading-[1.8] text-soft-black/75">
              {featured.body}
            </p>
          )}
          <footer className="flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.25em] text-soft-black/50">
            <span>{featured.author_name}</span>
            {featured.verified_purchase && (
              <>
                <span className="text-gold-primary">·</span>
                <span className="text-gold-dark">{tp('reviews.verified')}</span>
              </>
            )}
          </footer>
        </blockquote>

        <Link
          href={`/prodotto/${featured.product_slug}`}
          className="group mt-10 inline-flex items-center gap-2 border-b border-soft-black pb-1 text-[10px] uppercase tracking-[0.28em] text-soft-black transition-colors hover:border-gold-dark hover:text-gold-dark"
        >
          {t('cta')}
        </Link>
      </div>
    </section>
  );
}
