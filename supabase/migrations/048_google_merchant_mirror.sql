-- Google Merchant Center read-only mirror, isolated from site products/orders
-- (same model as the Etsy / TikTok mirrors). Filled by the pull from the
-- Content API (products.list + productstatuses.list); never linked to
-- inventory. Push to GMC is gated and reads the live catalogue directly.
CREATE TABLE IF NOT EXISTS google_merchant_products (
  rest_id             text PRIMARY KEY,   -- e.g. online:it:IT:SKU123
  offer_id            text,
  content_language    text,
  title               text,
  link                text,
  image_link          text,
  price               numeric,
  currency            text,
  availability        text,
  destination_status  text,               -- approved | pending | disapproved (Shopping)
  issues              jsonb,              -- itemLevelIssues[]
  raw                 jsonb,
  synced_at           timestamptz DEFAULT now()
);

ALTER TABLE google_merchant_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_merchant_products_admin_read ON google_merchant_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin','editor','order_manager')));
