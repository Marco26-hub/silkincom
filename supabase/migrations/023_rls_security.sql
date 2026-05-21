-- Enable Row Level Security on the 3 tables still exposed without RLS.
-- The Supabase advisor flagged all 3 as ERROR-level `rls_disabled_in_public`:
-- the anon key (shipped in the client bundle) could both READ and WRITE them.
--
--   compositions / product_sizes -> non-sensitive catalog lookups. Public
--     SELECT (mirrors categories / colors / materials), admin-only writes.
--   store_settings -> store config (shipping thresholds, VAT, contact).
--     Admin-only for both read and write: no public page reads this table,
--     and the settings admin route uses the service role, which bypasses
--     RLS. Locking it down keeps future config keys private by default.
--
-- Admin API routes for these tables use the service role (bypasses RLS), so
-- the admin policies below are defense-in-depth. The EXISTS(profiles) form
-- is used so the policies still hold if a route ever switches to a cookie
-- session client — unlike the legacy `auth.jwt()->>'role'` check, it does
-- not depend on a custom JWT claim hook.
--
-- Idempotent: ENABLE RLS is a no-op when already on; policies are dropped
-- before recreate.

-- compositions ---------------------------------------------------------------
ALTER TABLE compositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_view_compositions" ON compositions;
CREATE POLICY "public_view_compositions" ON compositions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_crud_compositions" ON compositions;
CREATE POLICY "admin_crud_compositions" ON compositions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin'))
  );

-- product_sizes --------------------------------------------------------------
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_view_product_sizes" ON product_sizes;
CREATE POLICY "public_view_product_sizes" ON product_sizes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_crud_product_sizes" ON product_sizes;
CREATE POLICY "admin_crud_product_sizes" ON product_sizes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin'))
  );

-- store_settings -------------------------------------------------------------
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_crud_store_settings" ON store_settings;
CREATE POLICY "admin_crud_store_settings" ON store_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin'))
  );
