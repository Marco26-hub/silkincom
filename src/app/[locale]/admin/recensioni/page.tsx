/**
 * Admin: Reviews moderation queue.
 * Lists pending reviews + approve/reject actions.
 */
import { createServiceClient } from '@/lib/supabase/server';
import { ReviewModerationRow } from './ReviewModerationRow';

export const metadata = { title: 'Recensioni — Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Pending = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  product_id: string;
  customer_id: string | null;
  product_name?: string;
  product_slug?: string;
  author_name?: string;
  author_email?: string;
  admin_reply?: string | null;
};

// NB: reviews.customer_id has no FK to `profiles` (its FK points to `customers`),
// so PostgREST cannot embed profiles(...) here — doing so errors the whole query.
// Author identity lives in `profiles`, keyed by the same id, so we resolve it in a
// second query and merge by customer_id.
const REVIEW_COLUMNS =
  'id, rating, title, comment, is_verified_purchase, created_at, product_id, customer_id, admin_reply, products(name, slug)';

export default async function AdminReviewsPage() {
  const supabase = createServiceClient();

  const [{ data: pendingRaw, error: pendingErr }, { data: approvedRaw, error: approvedErr }] =
    await Promise.all([
      supabase
        .from('reviews')
        .select(REVIEW_COLUMNS)
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('reviews')
        .select(REVIEW_COLUMNS)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  if (pendingErr) console.error('[admin/recensioni] pending reviews query failed:', pendingErr.message);
  if (approvedErr) console.error('[admin/recensioni] approved reviews query failed:', approvedErr.message);

  // Resolve author name/email from profiles (no direct FK, so fetch by id).
  const customerIds = Array.from(
    new Set(
      [...(pendingRaw || []), ...(approvedRaw || [])]
        .map((r: any) => r.customer_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (customerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', customerIds);
    for (const p of profiles || []) profileMap.set(p.id, { full_name: p.full_name, email: p.email });
  }

  function mapReview(r: any): Pending {
    const profile = r.customer_id ? profileMap.get(r.customer_id) : undefined;
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      is_verified_purchase: r.is_verified_purchase,
      created_at: r.created_at,
      product_id: r.product_id,
      customer_id: r.customer_id,
      product_name: r.products?.name,
      product_slug: r.products?.slug,
      author_name: profile?.full_name ?? undefined,
      author_email: profile?.email ?? undefined,
      admin_reply: r.admin_reply,
    };
  }

  const pending: Pending[] = (pendingRaw || []).map(mapReview);
  const approved: Pending[] = (approvedRaw || []).map(mapReview);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display font-light text-3xl mb-2">Moderazione recensioni</h1>
        <p className="text-sm text-soft-black/60">
          {pending.length === 0
            ? 'Nessuna recensione in attesa.'
            : `${pending.length} ${pending.length === 1 ? 'recensione' : 'recensioni'} in attesa di moderazione.`}
        </p>
      </header>

      {pending.length > 0 && (
        <div className="space-y-4">
          {pending.map((r) => (
            <ReviewModerationRow key={r.id} review={r} />
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl mb-6 text-soft-black/70">Recensioni approvate ({approved.length})</h2>
          <div className="space-y-4">
            {approved.map((r) => (
              <ReviewModerationRow key={r.id} review={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
