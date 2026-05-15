-- Migration 008: Reviews public view + stats function
-- Applied 2026-05-09 via Supabase MCP.
--
-- IMPORTANT: This migration assumes the existing public.reviews table created
-- by an earlier migration. Schema reference:
--   reviews(id uuid pk, product_id uuid -> products.id, customer_id uuid,
--           order_id uuid, rating int, title text, comment text,
--           is_verified_purchase bool, is_approved bool, created_at, updated_at)
--
-- This migration adds:
--   - reviews_public view exposing approved reviews with product slug + author name
--   - product_review_stats() function for AggregateRating Schema.org emission
--
-- Source for ReviewSchema.tsx and /recensioni page.

create or replace view public.reviews_public
with (security_invoker = true)
as
select
  r.id,
  p.slug as product_slug,
  r.rating,
  r.title,
  r.comment as body,
  coalesce(pr.full_name, 'Cliente verificato') as author_name,
  r.is_verified_purchase as verified_purchase,
  r.created_at
from public.reviews r
join public.products p on p.id = r.product_id
left join public.profiles pr on pr.id = r.customer_id
where r.is_approved = true;

comment on view public.reviews_public is 'Approved reviews with product slug and author display name. Source for Schema.org Review + AggregateRating + /recensioni page.';

create or replace function public.product_review_stats(p_slug text)
returns table(count bigint, average numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(round(avg(r.rating)::numeric, 2), 0) as average
  from public.reviews r
  join public.products p on p.id = r.product_id
  where p.slug = p_slug
    and r.is_approved = true;
$$;

comment on function public.product_review_stats is 'Aggregate stats for AggregateRating schema. Returns count and average for approved reviews of a product by slug.';

grant select on public.reviews_public to anon, authenticated;
grant execute on function public.product_review_stats(text) to anon, authenticated;
