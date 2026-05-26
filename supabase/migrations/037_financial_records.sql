-- Unified financial ledger: every monetised transaction across our sales
-- channels lives here as a single row. The point is to give the
-- commercialista one place to pull from at month/quarter close instead of
-- juggling separate Stripe / Etsy dashboards and CSVs.
--
-- Sources today:
--   stripe  — every Stripe charge / invoice we receive on the website
--   etsy    — every Etsy receipt + ledger entry once OAuth is connected
--
-- Source-of-truth fields (gross_amount, fees, net_amount, currency, transaction_date)
-- are normalised across channels so reports don't need to switch on `source`.
-- The full provider payload is kept in raw_data (JSONB) for audit / future
-- enrichment without another schema migration.

CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Channel + provider identifiers (so we can re-fetch and de-dup safely).
  source TEXT NOT NULL CHECK (source IN ('stripe', 'etsy')),
  external_id TEXT NOT NULL,                  -- charge_id / receipt_id / payment_intent_id
  type TEXT NOT NULL CHECK (type IN ('charge', 'invoice', 'refund', 'fee', 'payout', 'tax')),

  -- Monetary fields (all amounts in the row's currency).
  gross_amount NUMERIC(12,2) NOT NULL,        -- total customer paid
  fee_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount  NUMERIC(12,2) NOT NULL,          -- what hits our balance
  currency    TEXT NOT NULL DEFAULT 'EUR',

  -- Buyer snapshot (we copy these at sync time so the report stays accurate
  -- even when the source mutates customer records later).
  buyer_name  TEXT,
  buyer_email TEXT,
  buyer_country TEXT,
  buyer_address TEXT,
  buyer_vat_number TEXT,

  -- Provider-supplied artefacts.
  invoice_url    TEXT,                        -- Stripe-hosted PDF
  receipt_url    TEXT,                        -- Stripe receipt URL or Etsy receipt link
  invoice_number TEXT,                        -- whatever the provider stamped on the doc

  -- Timestamps.
  transaction_date TIMESTAMPTZ NOT NULL,      -- when the money moved
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Full provider payload (audit log + future enrichment without migration).
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Soft-link to our orders table when a match exists. We don't FK it because
  -- ledger entries can arrive before the order is created (e.g. Etsy webhook
  -- before the sync job runs).
  order_id UUID,
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_records_uniq
  ON public.financial_records (source, external_id, type);
CREATE INDEX IF NOT EXISTS financial_records_tx_date
  ON public.financial_records (transaction_date DESC);
CREATE INDEX IF NOT EXISTS financial_records_source_date
  ON public.financial_records (source, transaction_date DESC);
CREATE INDEX IF NOT EXISTS financial_records_buyer_email
  ON public.financial_records (lower(buyer_email));

CREATE TABLE IF NOT EXISTS public.financial_sync_state (
  source TEXT PRIMARY KEY CHECK (source IN ('stripe', 'etsy')),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT (now() - INTERVAL '90 days'),
  last_external_id TEXT,
  last_status TEXT,
  last_error TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.financial_sync_state (source, last_synced_at)
VALUES
  ('stripe', now() - INTERVAL '90 days'),
  ('etsy',   now() - INTERVAL '90 days')
ON CONFLICT (source) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.financial_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  synced_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS financial_sync_log_started_at
  ON public.financial_sync_log (started_at DESC);

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_records_admin_read ON public.financial_records;
CREATE POLICY financial_records_admin_read ON public.financial_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS financial_sync_state_admin_read ON public.financial_sync_state;
CREATE POLICY financial_sync_state_admin_read ON public.financial_sync_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS financial_sync_log_admin_read ON public.financial_sync_log;
CREATE POLICY financial_sync_log_admin_read ON public.financial_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );
