-- Test-order flag. Lets the team place test purchases without polluting the
-- dashboard KPIs, the Ordini list, or analytics. Reversible: unset to restore.
-- Defaults false so real orders are never hidden.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS orders_is_test ON public.orders (is_test);
