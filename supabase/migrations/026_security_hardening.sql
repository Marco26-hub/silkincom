-- Pre-go-live security hardening.
--
-- 1. reorder_alerts view — created as a default (SECURITY DEFINER) view and
--    carried SELECT/INSERT/UPDATE/DELETE grants for anon + authenticated. Since
--    it runs as its owner, any holder of the anon key could read cost_price,
--    supplier_name, supplier_sku and estimated_cost for every low-stock product
--    via /rest/v1/reorder_alerts. Switch to security_invoker (so the caller's
--    RLS applies) and drop the anon/authenticated grants. The only caller —
--    api/admin/shipments — uses the service role, which keeps its grants.
--
-- 2. SECURITY DEFINER functions still EXECUTE-able by anon/authenticated via
--    PostgREST RPC. product_review_stats is read-only but its two callers
--    (ProductReviews, ReviewSchema) are server components on the service role;
--    handle_new_user and log_order_status_change are trigger functions that
--    never need a direct call (triggers fire regardless of EXECUTE grants).
--    Revoke EXECUTE from the public roles; service_role + owner keep it.
--
-- Idempotent.

ALTER VIEW public.reorder_alerts SET (security_invoker = true);
REVOKE ALL ON public.reorder_alerts FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.product_review_stats(text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_order_status_change()
  FROM PUBLIC, anon, authenticated;
