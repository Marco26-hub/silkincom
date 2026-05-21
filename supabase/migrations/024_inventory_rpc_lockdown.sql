-- Restrict the two inventory-mutating RPC functions to the service role.
--
-- The Supabase advisor flagged decrement_inventory and apply_inventory_movement
-- as anon/authenticated-executable SECURITY DEFINER functions. PostgREST exposes
-- every public-schema function as POST /rest/v1/rpc/<name>; with EXECUTE granted
-- to anon, anyone holding the anon key (shipped in the client bundle) could call
-- them unauthenticated and tamper with stock levels — e.g. zero out the whole
-- catalog's inventory.
--
-- All 6 legitimate callers (stripe/webhook, orders/[id]/cancel,
-- admin/returns/[id], admin/inventory/adjust, etsy/sync-orders, etest) build
-- the Supabase client with createServiceClient() — they connect as service_role,
-- which keeps its explicit EXECUTE grant. The function owner (postgres) also
-- keeps EXECUTE, so triggers and intra-DB calls are unaffected.
--
-- Idempotent: REVOKE on an already-revoked privilege is a no-op.

REVOKE EXECUTE ON FUNCTION public.decrement_inventory(uuid, integer)
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_inventory_movement(
  uuid, uuid, public.inventory_movement_type, integer, text, uuid, uuid
) FROM anon, authenticated;
