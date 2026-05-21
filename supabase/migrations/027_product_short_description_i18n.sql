-- Translatable short product description.
--
-- products.description_short (IT source) already exists and is editable from
-- the admin form ("Descrizione breve"), but had no i18n column — so it could
-- not surface localised on the storefront. This adds description_short_i18n,
-- mirroring name_i18n / description_long_i18n / composition_i18n. The admin
-- "Traduci" flow fills the 6 other locales from the Italian source.
--
-- Idempotent.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description_short_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
