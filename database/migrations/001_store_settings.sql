-- Store settings table — replaces hardcoded values in src/config/shipping.ts
-- Run once on Supabase SQL editor

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default values
INSERT INTO store_settings (key, value) VALUES
  ('free_shipping_threshold', '200'::jsonb),
  ('standard_shipping_cost',  '9'::jsonb),
  ('vat_rate',                '22'::jsonb),
  ('store_name',              '"SILKinCOM"'::jsonb),
  ('store_email',             '"info@silkincom.com"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Only super_admin can read/write settings
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_settings" ON store_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
