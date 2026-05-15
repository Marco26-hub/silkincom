/**
 * ReviewSchema — emits Schema.org Review + AggregateRating JSON-LD on PDP.
 *
 * Server component. Reads approved reviews from Supabase + product_review_stats
 * SQL function. Returns null if no reviews yet (graceful absence).
 *
 * Usage in src/app/prodotto/[slug]/page.tsx:
 *   <ReviewSchema productSlug={slug} productName={name} productUrl={url}
 *                 productImage={image} productPrice={price} />
 */
import { createServiceClient } from '@/lib/supabase/server';

type Props = {
  productSlug: string;
  productName: string;
  productUrl: string;
  productImage?: string;
  productPrice?: number;
  brandName?: string;
};

export async function ReviewSchema({
  productSlug,
  productName,
  productUrl,
  productImage,
  productPrice,
  brandName = 'SILKinCOM',
}: Props) {
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

    const [{ data: reviewRows }, { data: statsRows }] = await Promise.all([
      supabase
        .from('reviews_public')
        .select('rating, title, body, author_name, created_at')
        .eq('product_slug', productSlug)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.rpc('product_review_stats', { p_slug: productSlug }),
    ]);

    if (reviewRows) reviews = reviewRows;
    if (statsRows && Array.isArray(statsRows) && statsRows[0]) {
      stats = {
        count: Number(statsRows[0].count || 0),
        average: Number(statsRows[0].average || 0),
      };
    }
  } catch {
    // Supabase unreachable or table missing — fail silent (no schema emitted)
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

  // Emit a Product schema augmentation referencing existing Product @id
  // (if present) plus the reviews. Search engines merge by @id.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: productName,
    image: productImage,
    url: productUrl,
    brand: { '@type': 'Brand', name: brandName },
    aggregateRating,
    review: reviewSchemas,
    ...(productPrice !== undefined && {
      offers: {
        '@type': 'Offer',
        price: productPrice,
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
