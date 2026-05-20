-- Home slides: hero carousel CMS-managed via admin
-- Source of truth = DB. Frontend (src/components/sections/Hero.tsx) reads via
-- src/data/home-slides.ts with unstable_cache + tag 'home-slides'.
-- Admin mutations call revalidateHomeSlides() in src/lib/revalidate.ts.

CREATE TABLE IF NOT EXISTS home_slides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  title_i18n      JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtitle_i18n   JSONB NOT NULL DEFAULT '{}'::jsonb,
  alt_i18n        JSONB NOT NULL DEFAULT '{}'::jsonb,
  focus           TEXT NOT NULL DEFAULT 'center',
  display_order   INT  NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_slides_active_order ON home_slides(is_active, display_order);

ALTER TABLE home_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_slides_public_read" ON home_slides;
CREATE POLICY "home_slides_public_read" ON home_slides
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "home_slides_admin_all" ON home_slides;
CREATE POLICY "home_slides_admin_all" ON home_slides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin','editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin','editor')
    )
  );

CREATE OR REPLACE FUNCTION update_home_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_home_slides_updated_at ON home_slides;
CREATE TRIGGER trg_home_slides_updated_at
  BEFORE UPDATE ON home_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_home_slides_updated_at();

-- Storage bucket + policies (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'home-slides',
  'home-slides',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "home_slides_storage_public_read" ON storage.objects;
CREATE POLICY "home_slides_storage_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'home-slides');

DROP POLICY IF EXISTS "home_slides_storage_admin_write" ON storage.objects;
CREATE POLICY "home_slides_storage_admin_write" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'home-slides'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin','editor')
    )
  )
  WITH CHECK (
    bucket_id = 'home-slides'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin','editor')
    )
  );
