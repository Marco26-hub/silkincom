-- Featured Collections: extend collections table for full CMS i18n editing
-- and add a dedicated Storage bucket for collection cover images.
-- Loader: src/data/collections-db.ts (server-only, unstable_cache + tag 'collections-meta').
-- Admin mutations call revalidateCollections() in src/lib/revalidate.ts.

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS accent TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tagline_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS short_name_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accent_i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Storage bucket + policies (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collections',
  'collections',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "collections_storage_public_read" ON storage.objects;
CREATE POLICY "collections_storage_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'collections');

DROP POLICY IF EXISTS "collections_storage_admin_write" ON storage.objects;
CREATE POLICY "collections_storage_admin_write" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'collections'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin','editor')
    )
  )
  WITH CHECK (
    bucket_id = 'collections'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','super_admin','editor')
    )
  );
