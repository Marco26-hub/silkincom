-- Static pages CMS: block-based content per page_key.
-- Pages covered: la-nostra-storia, atelier, b2b, artigiani, press,
-- faq, maison-marco-dibenedetto, cura-prodotto.
-- Loader: src/data/static-pages.ts (unstable_cache + tag 'static-pages').
-- Admin mutations call revalidateStaticPages() in src/lib/revalidate.ts.

CREATE TABLE IF NOT EXISTS static_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key        TEXT UNIQUE NOT NULL,
  title_i18n      JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta_description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocks          JSONB NOT NULL DEFAULT '[]'::jsonb,
  images          JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_static_pages_key ON static_pages(page_key);

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "static_pages_public_read" ON static_pages;
CREATE POLICY "static_pages_public_read" ON static_pages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "static_pages_admin_all" ON static_pages;
CREATE POLICY "static_pages_admin_all" ON static_pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin','editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin','editor'))
  );

CREATE OR REPLACE FUNCTION update_static_pages_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_static_pages_updated_at ON static_pages;
CREATE TRIGGER trg_static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW EXECUTE FUNCTION update_static_pages_updated_at();
