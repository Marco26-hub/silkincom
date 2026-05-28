-- Allow coupons with no expiry (permanent) or no start date
ALTER TABLE coupons ALTER COLUMN valid_from DROP NOT NULL;
ALTER TABLE coupons ALTER COLUMN valid_until DROP NOT NULL;
