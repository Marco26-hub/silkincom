-- Clean product composition texts.
--
-- The `composition` column of the apparel products (darsena, lario, melzi,
-- riva) had the *entire descriptive prose dump* pasted in — spec sheets and
-- full paragraphs — instead of the fibre blend. The product page renders
-- `composition` verbatim under the "Composizione" tab, so it showed a wall
-- of text. The real prose already lives in `description_long`, so the dump
-- in `composition` was pure redundancy.
--
-- This normalises every product to a short fibre blend and fills
-- `composition_i18n` for the 6 non-Italian locales, so the storefront shows
-- a clean composition in every language (DB i18n takes priority over the
-- legacy products.json fallback).
--
-- Idempotent: re-running just re-sets the same values.

UPDATE products SET composition = '100% cashmere',
  composition_i18n = '{"en":"100% cashmere","es":"100% cachemira","fr":"100% cachemire","de":"100% Kaschmir","pt":"100% caxemira","nl":"100% kasjmier"}'::jsonb
WHERE slug LIKE 'bellagio%' OR slug LIKE 'cernobbio%' OR slug LIKE 'varenna%';

UPDATE products SET composition = '100% seta',
  composition_i18n = '{"en":"100% silk","es":"100% seda","fr":"100% soie","de":"100% Seide","pt":"100% seda","nl":"100% zijde"}'::jsonb
WHERE slug LIKE 'como%';

UPDATE products SET composition = '100% lana',
  composition_i18n = '{"en":"100% wool","es":"100% lana","fr":"100% laine","de":"100% Wolle","pt":"100% lã","nl":"100% wol"}'::jsonb
WHERE slug LIKE 'tremezzo%';

UPDATE products SET composition = '100% cotone',
  composition_i18n = '{"en":"100% cotton","es":"100% algodón","fr":"100% coton","de":"100% Baumwolle","pt":"100% algodão","nl":"100% katoen"}'::jsonb
WHERE slug IN ('tivan','darsena-bianco','darsena-navy','darsena-nero','lario-2','lario-3','lario-4','lario-5','lario-6');

UPDATE products SET composition = 'Frontale 100% cotone, retro 100% poliestere',
  composition_i18n = '{"en":"Front 100% cotton, back 100% polyester","es":"Frente 100% algodón, espalda 100% poliéster","fr":"Devant 100% coton, dos 100% polyester","de":"Vorderseite 100% Baumwolle, Rückseite 100% Polyester","pt":"Frente 100% algodão, traseira 100% poliéster","nl":"Voorzijde 100% katoen, achterzijde 100% polyester"}'::jsonb
WHERE slug IN ('darsena-blu','darsena-verde');

UPDATE products SET composition = '95% cotone, 5% elastan',
  composition_i18n = '{"en":"95% cotton, 5% elastane","es":"95% algodón, 5% elastano","fr":"95% coton, 5% élasthanne","de":"95% Baumwolle, 5% Elasthan","pt":"95% algodão, 5% elastano","nl":"95% katoen, 5% elastaan"}'::jsonb
WHERE slug IN ('lario','lario-1');

UPDATE products SET composition = '100% lino',
  composition_i18n = '{"en":"100% linen","es":"100% lino","fr":"100% lin","de":"100% Leinen","pt":"100% linho","nl":"100% linnen"}'::jsonb
WHERE slug IN ('melzi','melzi-1');

UPDATE products SET composition = '53% lino, 47% cotone',
  composition_i18n = '{"en":"53% linen, 47% cotton","es":"53% lino, 47% algodón","fr":"53% lin, 47% coton","de":"53% Leinen, 47% Baumwolle","pt":"53% linho, 47% algodão","nl":"53% linnen, 47% katoen"}'::jsonb
WHERE slug IN ('riva','riva-1');

-- The "Riva Azzurra" shirt had one variant (variant_sku riva-s) with a NULL
-- size, so the storefront — which only surfaces sized variants — dropped the
-- S option. Restore it.
UPDATE product_variants SET size = 'S'
WHERE variant_sku = 'riva-s' AND size IS NULL;
