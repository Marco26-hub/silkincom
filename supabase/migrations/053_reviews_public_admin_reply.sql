-- Migration 053: Expose merchant reply on the public reviews view.
--
-- reviews.admin_reply / admin_replied_at are set by the admin moderation UI
-- (PATCH /api/admin/reviews/[id], action 'reply') but were never surfaced to
-- customers. This adds them to reviews_public so the storefront can render a
-- "Risposta di SILKinCOM" block beneath each approved review.
--
-- Rebuilt from the current live definition (which already carries the
-- r.author_name fallback added after migration 008) so nothing regresses.

create or replace view public.reviews_public
with (security_invoker = true)
as
select
  r.id,
  p.slug as product_slug,
  r.rating,
  r.title,
  r.comment as body,
  coalesce(pr.full_name, r.author_name, 'Cliente verificato') as author_name,
  r.is_verified_purchase as verified_purchase,
  r.created_at,
  r.admin_reply,
  r.admin_replied_at
from public.reviews r
join public.products p on p.id = r.product_id
left join public.profiles pr on pr.id = r.customer_id
where r.is_approved = true;

comment on view public.reviews_public is 'Approved reviews with product slug, author display name, and merchant reply. Source for Schema.org Review + AggregateRating + PDP reviews section.';

grant select on public.reviews_public to anon, authenticated;
