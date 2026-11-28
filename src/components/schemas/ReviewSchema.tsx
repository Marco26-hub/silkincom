/** Approved reviews merged into the page's single Product/ProductGroup node. */
import { createServiceClient } from '@/lib/supabase/server';

export async function getProductReviewMarkup(productSlug: string) {
  let reviews: Array<{
    rating: number;
    title: string | null;
    body: string | null;
    author_name: string;
    created_at: string;
  }> = [];
  let stats = { count: 0, average: 0 };

  try {
    const supabase = createServiceClient();

    const [reviewResult, statsResult] = await Promise.all([
      supabase
        .from('reviews_public')
        .select('rating, title, body, author_name, created_at')
        .eq('product_slug', productSlug)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.rpc('product_review_stats', { p_slug: productSlug }),
    ]);

    if (reviewResult.error || statsResult.error) {
      console.error('[review-schema] Reviews unavailable; omitting rating markup:', reviewResult.error?.message, statsResult.error?.message);
      return null;
    }
    const reviewRows = reviewResult.data;
    const statsRows = statsResult.data;
    if (reviewRows) reviews = reviewRows;
    if (statsRows && Array.isArray(statsRows) && statsRows[0]) {
      stats = {
        count: Number(statsRows[0].count || 0),
        average: Number(statsRows[0].average || 0),
      };
    }
  } catch (error) {
    console.error('[review-schema] Review data unavailable; omitting rating markup:', error);
    return null;
  }

  if (stats.count === 0) return null;

  const aggregateRating = {
    '@type': 'AggregateRating',
    ratingValue: stats.average,
    reviewCount: stats.count,
    bestRating: 5,
    worstRating: 1,
  };

  const reviewSchemas = reviews.map((r) => ({
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: { '@type': 'Person', name: r.author_name },
    datePublished: r.created_at.split('T')[0],
    name: r.title || undefined,
    reviewBody: r.body || undefined,
  }));

  return { aggregateRating, review: reviewSchemas };
}
