-- 034: move the Twilly Como products into the "Primavera / Estate"
-- collection. They were historically tagged under "Iconica" but the founder
-- wants them surfaced as part of the spring/summer drop (twilly are light,
-- silk-on-silk neck pieces — the natural fit for warm-season styling).
--
-- Audit before this migration:
--   como, como-elegante, como-fluido, como-leggero, como-puro → collection=iconica
-- After:
--   the same five → collection=primavera

UPDATE products
SET collection_id = (SELECT id FROM collections WHERE slug = 'primavera')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'twilly-como');
