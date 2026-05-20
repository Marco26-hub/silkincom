-- Clothing size variants for apparel categories (lario t-shirts, melzi camicie,
-- riva camicie miste, tivan). Sciarpe / foulard / pashmine restano senza taglie.
--
-- Strategy:
-- 1. ADD `size` TEXT column on product_variants with a CHECK constraint that
--    bounds the value set (XS/S/M/L/XL/XXL/XXXL/UNI). NULL means "no size"
--    (legacy variants without a size attribute).
-- 2. Index on size so admin and frontend can filter variants per size cheaply.
-- 3. Bulk-create 5 size variants (S/M/L/XL/XXL) for every product in the
--    'lario','melzi','riva','tivan' categories. variant_sku = '<product>-<size>',
--    variant_name = '<size>', color_id copied from the parent product so size
--    selection inherits the color displayed in the catalog.
-- 4. For each new variant create an inventory row with quantity 0 and the
--    standard reorder_threshold 5, so the magazzino dashboard shows the new
--    variant immediately. Admins populate stock via "Rettifica" or
--    "Carico rapido".
--
-- Idempotent: ALTER uses IF NOT EXISTS, INSERTs use NOT EXISTS guards.

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS size TEXT
    CHECK (size IS NULL OR size IN ('XS','S','M','L','XL','XXL','XXXL','UNI'));

CREATE INDEX IF NOT EXISTS idx_product_variants_size
  ON product_variants(size) WHERE size IS NOT NULL;

WITH clothing AS (
  SELECT p.id AS product_id, p.slug, p.color_id
  FROM products p
  JOIN categories c ON p.category_id = c.id
  WHERE c.slug IN ('lario','melzi','riva','tivan')
),
sizes AS (
  SELECT unnest(ARRAY['S','M','L','XL','XXL']) AS sz
)
INSERT INTO product_variants (product_id, variant_sku, variant_name, size, color_id)
SELECT
  cl.product_id,
  cl.slug || '-' || lower(s.sz) AS variant_sku,
  s.sz AS variant_name,
  s.sz,
  cl.color_id
FROM clothing cl
CROSS JOIN sizes s
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants v
  WHERE v.product_id = cl.product_id AND v.size = s.sz
);

INSERT INTO inventory (product_id, variant_id, quantity_total, quantity_available, quantity_reserved, reorder_threshold)
SELECT v.product_id, v.id, 0, 0, 0, 5
FROM product_variants v
WHERE v.size IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory i
    WHERE i.product_id = v.product_id AND i.variant_id = v.id
  );
