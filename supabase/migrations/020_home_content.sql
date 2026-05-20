-- Home page content CMS: generic home_sections table for non-card sections
-- (BrandStory, EditorialBanner, InstagramFeed) + i18n columns on materials
-- so the 5 home-page material cards become DB-driven too.
-- Loader: src/data/home-content.ts (server-only, unstable_cache + tags
-- 'home-sections' and 'home-materials'). Admin mutations call
-- revalidateHomeSections() / revalidateHomeMaterials().

CREATE TABLE IF NOT EXISTS home_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key   TEXT UNIQUE NOT NULL,
  content_i18n  JSONB NOT NULL DEFAULT '{}'::jsonb,
  images        JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_sections_key ON home_sections(section_key);

ALTER TABLE home_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_sections_public_read" ON home_sections;
CREATE POLICY "home_sections_public_read" ON home_sections
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "home_sections_admin_all" ON home_sections;
CREATE POLICY "home_sections_admin_all" ON home_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin','editor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin','super_admin','editor'))
  );

CREATE OR REPLACE FUNCTION update_home_sections_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_home_sections_updated_at ON home_sections;
CREATE TRIGGER trg_home_sections_updated_at
  BEFORE UPDATE ON home_sections
  FOR EACH ROW EXECUTE FUNCTION update_home_sections_updated_at();

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS href TEXT,
  ADD COLUMN IF NOT EXISTS name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS origin_title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS origin_body_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS characteristics_title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS characteristics_body_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS benefit_title_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS benefit_body_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_slug_unique ON materials(slug) WHERE slug IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('home-content', 'home-content', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "home_content_storage_public_read" ON storage.objects;
CREATE POLICY "home_content_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'home-content');

DROP POLICY IF EXISTS "home_content_storage_admin_write" ON storage.objects;
CREATE POLICY "home_content_storage_admin_write" ON storage.objects
  FOR ALL USING (
    bucket_id = 'home-content'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin','super_admin','editor'))
  )
  WITH CHECK (
    bucket_id = 'home-content'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin','super_admin','editor'))
  );
