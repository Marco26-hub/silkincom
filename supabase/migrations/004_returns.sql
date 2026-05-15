-- Returns workflow
CREATE TYPE return_status AS ENUM (
  'requested',     -- cliente ha richiesto
  'approved',      -- admin approvato
  'rejected',      -- admin rifiutato
  'received',      -- merce ricevuta
  'refunded',      -- rimborso elaborato
  'cancelled'
);

CREATE TYPE return_reason AS ENUM (
  'defective',
  'wrong_item',
  'not_as_described',
  'changed_mind',
  'damaged_shipping',
  'too_small',
  'too_large',
  'other'
);

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status return_status NOT NULL DEFAULT 'requested',
  reason return_reason NOT NULL,
  customer_notes TEXT,
  admin_notes TEXT,
  refund_amount DECIMAL(10, 2),
  refund_method TEXT,
  refunded_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  refund_amount DECIMAL(10, 2) NOT NULL,
  restocked BOOLEAN NOT NULL DEFAULT FALSE,
  restocked_at TIMESTAMPTZ
);

CREATE INDEX idx_returns_order ON returns(order_id);
CREATE INDEX idx_returns_customer ON returns(customer_id);
CREATE INDEX idx_returns_status ON returns(status, created_at DESC);
CREATE INDEX idx_return_items_return ON return_items(return_id);

CREATE TRIGGER returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- Customers see their own returns
CREATE POLICY "Customers view own returns" ON returns
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers create returns for own orders" ON returns
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
  );

-- Admins manage all returns
CREATE POLICY "Admins manage returns" ON returns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'order_manager')
    )
  );

CREATE POLICY "Customers view own return items" ON return_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM returns WHERE returns.id = return_items.return_id AND returns.customer_id = auth.uid())
  );

CREATE POLICY "Admins manage return items" ON return_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'order_manager')
    )
  );

-- Generate return number
CREATE OR REPLACE FUNCTION generate_return_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := 'RET-' || to_char(NOW(), 'YYMMDD') || '-' || substr(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER returns_generate_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION generate_return_number();
