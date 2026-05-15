-- ============================================================
-- SILKinCOM — RLS Policies Supabase
-- ============================================================

-- ========== PROFILES ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========== CUSTOMERS ==========
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own" ON customers
  FOR SELECT USING (
    auth.uid() = id OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (auth.uid() = id);

-- ========== CUSTOMER ADDRESSES ==========
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_addresses" ON customer_addresses
  FOR SELECT USING (
    customer_id = auth.uid() OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

CREATE POLICY "customers_crud_own_addresses" ON customer_addresses
  FOR ALL USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ========== PRODUCTS ==========
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_published_products" ON products
  FOR SELECT USING (
    status = 'published' OR
    auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin')
  );

CREATE POLICY "admin_crud_products" ON products
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin')
  );

-- ========== PRODUCT VARIANTS & IMAGES ==========
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_product_variants" ON product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND status = 'published') OR
    auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin')
  );

CREATE POLICY "admin_crud_product_variants" ON product_variants
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));

CREATE POLICY "public_view_product_images" ON product_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND status = 'published') OR
    auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin')
  );

CREATE POLICY "admin_crud_product_images" ON product_images
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));

-- ========== CATEGORIES & COLLECTIONS ==========
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_active_categories" ON categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "admin_crud_categories" ON categories
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "public_view_active_collections" ON collections
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "admin_crud_collections" ON collections
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ========== MATERIALS & COLORS ==========
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_materials" ON materials FOR SELECT USING (TRUE);
CREATE POLICY "admin_crud_materials" ON materials FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "public_view_colors" ON colors FOR SELECT USING (TRUE);
CREATE POLICY "admin_crud_colors" ON colors FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ========== CARTS & CART ITEMS ==========
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_cart" ON carts
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "customers_crud_own_cart" ON carts
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "customers_view_own_cart_items" ON cart_items
  FOR SELECT USING (
    cart_id IN (SELECT id FROM carts WHERE customer_id = auth.uid())
  );

CREATE POLICY "customers_crud_own_cart_items" ON cart_items
  FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE customer_id = auth.uid())
  );

-- ========== ORDERS ==========
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_orders" ON orders
  FOR SELECT USING (
    customer_id = auth.uid() OR
    auth.jwt() ->> 'role' IN ('admin', 'order_manager', 'super_admin')
  );

CREATE POLICY "order_manager_update_orders" ON orders
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('order_manager', 'admin', 'super_admin')
  ) WITH CHECK (
    auth.jwt() ->> 'role' IN ('order_manager', 'admin', 'super_admin')
  );

CREATE POLICY "customers_view_own_order_items" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()) OR
    auth.jwt() ->> 'role' IN ('admin', 'order_manager', 'super_admin')
  );

-- ========== PAYMENTS ==========
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_payments" ON payments
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()) OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- ========== WISHLIST ==========
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_wishlist" ON wishlist
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "customers_crud_own_wishlist" ON wishlist
  FOR ALL USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ========== REVIEWS ==========
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_approved_reviews" ON reviews
  FOR SELECT USING (is_approved = TRUE);

CREATE POLICY "customers_create_reviews" ON reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "customers_view_own_reviews" ON reviews
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "admin_manage_reviews" ON reviews
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ========== NEWSLETTER ==========
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_subscribe_newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "admin_view_newsletter" ON newsletter_subscribers
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "admin_manage_newsletter" ON newsletter_subscribers
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ========== BLOG ==========
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_published_blog" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "editor_crud_blog" ON blog_posts
  FOR ALL USING (auth.jwt() ->> 'role' IN ('editor', 'admin', 'super_admin'));

CREATE POLICY "public_view_blog_categories" ON blog_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "editor_crud_blog_categories" ON blog_categories
  FOR ALL USING (auth.jwt() ->> 'role' IN ('editor', 'admin', 'super_admin'));

-- ========== PAGES ==========
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_published_pages" ON pages
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "editor_crud_pages" ON pages
  FOR ALL USING (auth.jwt() ->> 'role' IN ('editor', 'admin', 'super_admin'));

-- ========== MEDIA LIBRARY ==========
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_media" ON media_library
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_crud_media" ON media_library
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));

-- ========== SITE SETTINGS ==========
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_settings" ON site_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "super_admin_update_settings" ON site_settings
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

-- ========== AUDIT LOGS ==========
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_view_audit_log" ON audit_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "admin_insert_audit_log" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'super_admin', 'editor', 'order_manager')
  );

-- ========== SHIPMENT ZONES ==========
ALTER TABLE shipment_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_shipment_zones" ON shipment_zones
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_crud_shipment_zones" ON shipment_zones
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ========== INVENTORY ==========
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_inventory" ON inventory
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_crud_inventory" ON inventory
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- ========== COUPONS ==========
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_validate_active_coupons" ON coupons
  FOR SELECT USING (is_active = TRUE AND NOW() BETWEEN valid_from AND valid_until);

CREATE POLICY "admin_crud_coupons" ON coupons
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "customers_view_own_redemptions" ON coupon_redemptions
  FOR SELECT USING (
    customer_id = auth.uid() OR
    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
  );

-- ========== JUNCTION TABLES ==========
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_pc" ON product_collections FOR SELECT USING (TRUE);
CREATE POLICY "admin_crud_pc" ON product_collections FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));

CREATE POLICY "public_view_pcat" ON product_categories FOR SELECT USING (TRUE);
CREATE POLICY "admin_crud_pcat" ON product_categories FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));

CREATE POLICY "public_view_pm" ON product_materials FOR SELECT USING (TRUE);
CREATE POLICY "admin_crud_pm" ON product_materials FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));

CREATE POLICY "public_view_pcol" ON product_colors FOR SELECT USING (TRUE);
CREATE POLICY "admin_crud_pcol" ON product_colors FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor', 'super_admin'));
