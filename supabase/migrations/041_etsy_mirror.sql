-- Etsy read-only mirror. These tables are a SEPARATE copy of what lives on
-- Etsy — never merged into the site's products / orders / inventory. Pulling
-- Etsy data writes only here, so an Etsy sale can never touch site stock and
-- the site catalog can never be overwritten by an Etsy push.

CREATE TABLE IF NOT EXISTS public.etsy_listings (
  listing_id     BIGINT PRIMARY KEY,
  title          TEXT,
  description    TEXT,
  state          TEXT,                 -- active / inactive / draft / sold_out / expired
  url            TEXT,
  price          NUMERIC(12,2),
  currency       TEXT DEFAULT 'EUR',
  quantity       INTEGER DEFAULT 0,
  sku            TEXT,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  materials      TEXT[] NOT NULL DEFAULT '{}',
  taxonomy_id    BIGINT,
  views          INTEGER DEFAULT 0,
  num_favorers   INTEGER DEFAULT 0,
  featured_rank  INTEGER,
  image_urls     TEXT[] NOT NULL DEFAULT '{}',
  etsy_created_at  TIMESTAMPTZ,
  etsy_updated_at  TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS etsy_listings_state ON public.etsy_listings (state);
CREATE INDEX IF NOT EXISTS etsy_listings_synced ON public.etsy_listings (last_synced_at DESC);

CREATE TABLE IF NOT EXISTS public.etsy_orders (
  receipt_id      BIGINT PRIMARY KEY,
  buyer_name      TEXT,
  buyer_email     TEXT,
  status          TEXT,
  is_paid         BOOLEAN DEFAULT false,
  is_shipped      BOOLEAN DEFAULT false,
  grandtotal      NUMERIC(12,2),
  subtotal        NUMERIC(12,2),
  shipping_total  NUMERIC(12,2),
  tax_total       NUMERIC(12,2),
  currency        TEXT DEFAULT 'EUR',
  num_items       INTEGER DEFAULT 0,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_address JSONB,
  etsy_created_at TIMESTAMPTZ,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS etsy_orders_created ON public.etsy_orders (etsy_created_at DESC);
CREATE INDEX IF NOT EXISTS etsy_orders_status ON public.etsy_orders (status);

ALTER TABLE public.etsy_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etsy_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS etsy_listings_admin_read ON public.etsy_listings;
CREATE POLICY etsy_listings_admin_read ON public.etsy_listings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
  );

DROP POLICY IF EXISTS etsy_orders_admin_read ON public.etsy_orders;
CREATE POLICY etsy_orders_admin_read ON public.etsy_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
  );
