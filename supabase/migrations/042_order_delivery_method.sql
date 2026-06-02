-- Hand-delivery option at checkout.
--
-- `delivery_method` distinguishes a normal carrier shipment ('standard') from
-- an in-person hand delivery ('hand_delivery'). Stored separately from
-- `shipping_method` because that column is later overwritten by Packlink with
-- the booked carrier name — the customer's delivery CHOICE must survive that.
--
-- Hand delivery always carries zero shipping cost (enforced server-side in
-- the payment-intent route, not by the DB).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_method_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_method_check
      CHECK (delivery_method IN ('standard', 'hand_delivery'));
  END IF;
END $$;
