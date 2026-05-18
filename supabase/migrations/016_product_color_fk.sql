ALTER TABLE products ADD COLUMN IF NOT EXISTS color_id UUID REFERENCES colors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color_id);
