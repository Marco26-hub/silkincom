-- Blog CMS unification: blog_posts becomes the source of truth, with the same
-- 7-language i18n model as products (Italian in the base columns, the other
-- six locales in *_i18n jsonb). Public site (trame-di-como) reads from here.
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS title_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS excerpt_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS content_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_description_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

-- slug must be unique: enables upsert-by-slug seeding + clean public lookups.
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_key ON blog_posts (slug);
