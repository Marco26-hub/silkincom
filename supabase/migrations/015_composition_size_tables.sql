-- Predefined composition and size options for products

CREATE TABLE IF NOT EXISTS compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS composition_id UUID REFERENCES compositions(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES product_sizes(id) ON DELETE SET NULL;

-- Migrate existing free-text values into the new tables
INSERT INTO compositions (name)
SELECT DISTINCT composition FROM products WHERE composition IS NOT NULL AND composition != ''
ON CONFLICT (name) DO NOTHING;

UPDATE products p
SET composition_id = c.id
FROM compositions c
WHERE p.composition = c.name AND p.composition IS NOT NULL AND p.composition != '';

INSERT INTO product_sizes (name)
SELECT DISTINCT dimensions FROM products WHERE dimensions IS NOT NULL AND dimensions != ''
ON CONFLICT (name) DO NOTHING;

UPDATE products p
SET size_id = s.id
FROM product_sizes s
WHERE p.dimensions = s.name AND p.dimensions IS NOT NULL AND p.dimensions != '';
