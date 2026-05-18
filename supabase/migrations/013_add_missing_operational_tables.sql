-- Add missing operational tables used in codebase

-- Email automation lifecycle
CREATE TABLE IF NOT EXISTS email_lifecycle_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('abandoned_cart', 'review_request', 'reorder_reminder', 'newsletter')),
  scheduled_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  payload JSONB DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipient_email, email_type, payload)
);
CREATE INDEX IF NOT EXISTS idx_email_lifecycle_jobs_scheduled ON email_lifecycle_jobs(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_email_lifecycle_jobs_email_type ON email_lifecycle_jobs(email_type, status);

-- Inventory movement history
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_change INT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('adjustment', 'restock', 'sale', 'return', 'damage')),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id, created_at);

-- Internal purchase orders (B2B/wholesale)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  vendor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'completed', 'cancelled')),
  total_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  expected_delivery_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reorder monitoring
CREATE TABLE IF NOT EXISTS reorder_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  threshold_qty INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_alerted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_active ON reorder_alerts(is_active, product_id);

-- Etsy integration
CREATE TABLE IF NOT EXISTS etsy_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  silkincom_product_id UUID NOT NULL REFERENCES products(id),
  etsy_listing_id TEXT NOT NULL UNIQUE,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etsy_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  product_count INT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_etsy_sync_log_created ON etsy_sync_log(created_at);

-- Integration configuration
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}'::jsonb,
  api_key_hash TEXT,
  last_tested_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, resolved);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded', 'archived')),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);
Create INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
