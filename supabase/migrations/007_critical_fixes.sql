-- =========================================================
-- 007: Critical production fixes
-- =========================================================

-- 1. Add shipping_address JSONB to orders (was missing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- 2. Add product_slug to order_items (denormalized for display)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_slug TEXT;

-- 3. Fix payment_status constraint to include partially_refunded
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded'));

-- 4. Fix orders RLS: also allow access by customer_email (guest orders + email match)
DROP POLICY IF EXISTS "customers_view_own_orders" ON orders;
CREATE POLICY "customers_view_own_orders" ON orders
  FOR SELECT USING (
    customer_id = auth.uid()
    OR customer_email = (auth.jwt() ->> 'email')
    OR (auth.jwt() ->> 'role') IN ('admin', 'order_manager', 'super_admin')
  );

-- 5. Fix order_items RLS: mirror the fix above
DROP POLICY IF EXISTS "customers_view_own_order_items" ON order_items;
CREATE POLICY "customers_view_own_order_items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid()
         OR customer_email = (auth.jwt() ->> 'email')
    )
    OR (auth.jwt() ->> 'role') IN ('admin', 'order_manager', 'super_admin')
  );

-- 6. Add decrement_inventory wrapper so webhook call works
--    (delegates to apply_inventory_movement with proper params)
CREATE OR REPLACE FUNCTION decrement_inventory(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM apply_inventory_movement(
    p_product_id,
    NULL,
    'sale'::inventory_movement_type,
    -p_quantity,
    'Vendita automatica post-pagamento',
    NULL,
    NULL
  );
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail the webhook — order is already paid
  RAISE WARNING 'decrement_inventory failed for product %: %', p_product_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
