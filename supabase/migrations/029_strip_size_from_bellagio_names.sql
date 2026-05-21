-- Remove the size from Bellagio Cipria product names.
--
-- The product card and detail page already render `dimensions` as their own
-- field, so the size baked into the name — "Bellagio Cipria 180 x 70 cm —
-- logo marrone" — appeared twice on every Bellagio card. Strip the
-- "<n> x <n> cm" fragment from `name` and from every locale of `name_i18n`.
-- The `dimensions` column is left untouched and remains the single source
-- for the size shown on the card.
--
-- Idempotent: once stripped, the pattern no longer matches.

UPDATE products
SET name = regexp_replace(name, '\s*\d+\s*x\s*\d+\s*cm', '', 'g'),
    name_i18n = (
      SELECT jsonb_object_agg(key, regexp_replace(value, '\s*\d+\s*x\s*\d+\s*cm', '', 'g'))
      FROM jsonb_each_text(name_i18n)
    )
WHERE slug LIKE 'bellagio%' AND name_i18n IS NOT NULL;
