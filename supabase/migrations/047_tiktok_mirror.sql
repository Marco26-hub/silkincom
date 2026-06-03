-- TikTok Shop read-only mirror, isolated from site products/orders (same model
-- as the Etsy mirror). Filled by the pull; never linked to inventory/orders.
CREATE TABLE IF NOT EXISTS tiktok_products (
  product_id      text PRIMARY KEY,
  title           text,
  status          text,
  price           numeric,
  currency        text,
  main_image_url  text,
  description     text,
  category_id     text,
  skus            jsonb,
  raw             jsonb,
  synced_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tiktok_orders (
  order_id        text PRIMARY KEY,
  status          text,
  buyer_email     text,
  buyer_name      text,
  total_amount    numeric,
  payment_amount  numeric,
  currency        text,
  create_time     timestamptz,
  items           jsonb,
  shipping        jsonb,
  raw             jsonb,
  synced_at       timestamptz DEFAULT now()
);

ALTER TABLE tiktok_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiktok_products_admin_read ON tiktok_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin','editor','order_manager')));
CREATE POLICY tiktok_orders_admin_read ON tiktok_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin','editor','order_manager')));
