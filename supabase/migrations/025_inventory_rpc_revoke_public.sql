-- Complete the inventory RPC lockdown started in migration 024.
--
-- 024 revoked EXECUTE from the explicit `anon` and `authenticated` grants, but
-- both functions also carry the Postgres default EXECUTE grant to PUBLIC — so
-- anon/authenticated still inherited EXECUTE through PUBLIC (confirmed with
-- has_function_privilege). Revoking PUBLIC closes it: the ACL drops to
-- postgres (owner) + service_role (explicit grant), the only roles that need it.
--
-- Idempotent: REVOKE on an already-revoked privilege is a no-op.

REVOKE EXECUTE ON FUNCTION public.decrement_inventory(uuid, integer)
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.apply_inventory_movement(
  uuid, uuid, public.inventory_movement_type, integer, text, uuid, uuid
) FROM PUBLIC;
