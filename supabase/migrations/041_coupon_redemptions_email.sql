-- Track redemptions by email so per-customer cap holds for guest checkout
ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS customer_email TEXT;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_email ON coupon_redemptions (coupon_id, customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_customer ON coupon_redemptions (coupon_id, customer_id) WHERE customer_id IS NOT NULL;
