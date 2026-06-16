-- Allow anonymous SELECT of ONLY the `recesso_enabled` feature flag row, so the
-- edge middleware (anon key) can gate the public /recesso page. The flag governs
-- a public feature and is not sensitive; every other store_settings row stays
-- protected by the existing admin policies.
CREATE POLICY store_settings_public_recesso_flag ON store_settings FOR SELECT
  USING (key = 'recesso_enabled');
