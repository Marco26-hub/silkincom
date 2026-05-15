-- Inventory movements: audit trail completo per ogni cambio stock
CREATE TYPE inventory_movement_type AS ENUM (
  'inbound',          -- carico merce
  'outbound',         -- scarico manuale
  'sale',             -- vendita (decrement post-payment)
  'return',           -- reso confermato (re-stock)
  'adjustment',       -- rettifica manuale admin
  'cancellation',     -- ordine annullato (re-stock)
  'damage',           -- merce danneggiata
  'inventory_count'   -- inventario fisico
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity_change INTEGER NOT NULL,         -- positivo o negativo
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
  reason TEXT,
  reference_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id, performed_at DESC);
CREATE INDEX idx_inventory_movements_order ON inventory_movements(reference_order_id) WHERE reference_order_id IS NOT NULL;
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type, performed_at DESC);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all movements" ON inventory_movements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'editor', 'order_manager')
    )
  );

CREATE POLICY "Admins insert movements" ON inventory_movements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'editor', 'order_manager')
    )
  );

-- Function: applica movimento + aggiorna inventory atomicamente
CREATE OR REPLACE FUNCTION apply_inventory_movement(
  p_product_id UUID,
  p_variant_id UUID,
  p_movement_type inventory_movement_type,
  p_quantity_change INTEGER,
  p_reason TEXT,
  p_reference_order_id UUID,
  p_performed_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_current_qty INTEGER;
  v_new_qty INTEGER;
  v_movement_id UUID;
BEGIN
  -- Lock inventory row
  SELECT quantity_available INTO v_current_qty
  FROM inventory
  WHERE product_id = p_product_id
    AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL))
  FOR UPDATE;

  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'Inventory record not found for product %', p_product_id;
  END IF;

  v_new_qty := v_current_qty + p_quantity_change;

  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: current %, change %', v_current_qty, p_quantity_change;
  END IF;

  UPDATE inventory
  SET quantity_available = v_new_qty,
      last_restocked_at = CASE WHEN p_quantity_change > 0 THEN NOW() ELSE last_restocked_at END
  WHERE product_id = p_product_id
    AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL));

  INSERT INTO inventory_movements (
    product_id, variant_id, movement_type, quantity_change,
    quantity_before, quantity_after, reason, reference_order_id, performed_by
  ) VALUES (
    p_product_id, p_variant_id, p_movement_type, p_quantity_change,
    v_current_qty, v_new_qty, p_reason, p_reference_order_id, p_performed_by
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
