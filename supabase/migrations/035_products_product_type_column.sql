-- Per-product override for the storefront "type" eyebrow shown on ProductCard.
-- When NULL, the storefront falls back to the category-derived default
-- (lario→tshirt, darsena→cap, bellagio→pashmina, …). Admin sets this from
-- /admin/prodotti/[id] when the default mapping reads wrong for a specific
-- piece (e.g. a Lario hoodie shouldn't be labelled "T-shirt").
--
-- Allowed values match the i18n keys under messages/*.json → product.types.*
-- ('pashmina', 'scarf', 'twilly', 'cap', 'tshirt', 'shorts', 'shirt',
-- 'beachTowel'). A CHECK constraint keeps the column honest.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT NULL;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE products
  ADD CONSTRAINT products_product_type_check CHECK (
    product_type IS NULL OR product_type IN
      ('pashmina', 'scarf', 'twilly', 'cap', 'tshirt', 'shorts', 'shirt', 'beachTowel')
  );

COMMENT ON COLUMN products.product_type IS
  'Storefront type eyebrow override (pashmina/scarf/twilly/cap/tshirt/shorts/shirt/beachTowel). NULL falls back to category-derived default.';
