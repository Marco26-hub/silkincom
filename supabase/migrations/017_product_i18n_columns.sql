-- Localized product fields for the admin "Translate" feature.
-- Italian stays the source (products.name / description_long / composition);
-- these JSONB columns hold all 7 locales {it,en,es,fr,de,pt,nl}, filled by
-- POST /api/admin/products/[id]/translate.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_i18n jsonb,
  ADD COLUMN IF NOT EXISTS description_long_i18n jsonb,
  ADD COLUMN IF NOT EXISTS composition_i18n jsonb;

COMMENT ON COLUMN products.name_i18n IS 'Localized product name {it,en,es,fr,de,pt,nl}. it = source (mirrors products.name).';
COMMENT ON COLUMN products.description_long_i18n IS 'Localized long description. it = source (mirrors products.description_long).';
COMMENT ON COLUMN products.composition_i18n IS 'Localized composition. it = source (mirrors products.composition).';
