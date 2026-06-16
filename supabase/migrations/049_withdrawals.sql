-- Right-of-withdrawal ("recesso") requests — art. 54-bis Codice del Consumo
-- (D.Lgs 209/2025, recepimento Direttiva UE 2023/2673), in vigore dal 19/06/2026.
-- The law mandates an online "pulsante di recesso" plus an automatic
-- acknowledgement of receipt on a durable medium reporting the declaration
-- content and the date/time of transmission. This table is that durable record.
--
-- Distinct from `returns` (post-delivery RMA): a withdrawal can be exercised
-- from the moment the contract is concluded, regardless of delivery state, and
-- is submitted from a public, non-authenticated interface (order is identified
-- by order_number + email). Inserts happen server-side via the service role
-- after validation, so only admin read/update policies are needed here.
CREATE TABLE IF NOT EXISTS withdrawals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_number  text UNIQUE NOT NULL,          -- RC-YYYYMMDD-NNNN
  order_id           uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number       text NOT NULL,                 -- denormalised for the record
  customer_name      text,
  customer_email     text NOT NULL,
  items              jsonb,                          -- snapshot: [{name, quantity}]
  declaration        text NOT NULL,                 -- exact text echoed in the receipt
  locale             text DEFAULT 'it',
  status             text NOT NULL DEFAULT 'received', -- received|acknowledged|processing|refunded|rejected
  submitted_at       timestamptz NOT NULL DEFAULT now(), -- legal: date/time of transmission
  acknowledged_at    timestamptz,                    -- when the receipt email was sent
  admin_notes        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawals_order_id_idx   ON withdrawals(order_id);
CREATE INDEX IF NOT EXISTS withdrawals_submitted_idx  ON withdrawals(submitted_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_email_idx      ON withdrawals(lower(customer_email));

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Admin/staff may read every request.
CREATE POLICY withdrawals_admin_read ON withdrawals FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','super_admin','editor','order_manager')));

-- Admin/staff may update status / notes.
CREATE POLICY withdrawals_admin_update ON withdrawals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','super_admin','order_manager')));
