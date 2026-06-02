-- Editorial / content plan: a lightweight calendar of marketing actions across
-- channels (Etsy listings, social posts via Blotato, email, blog). Admin-only.
-- Decoupled from the catalogue — product_slug is an optional free reference,
-- not a FK, so a plan row survives catalogue changes.

CREATE TABLE IF NOT EXISTS public.content_plan (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_date DATE NOT NULL,
  channel        TEXT NOT NULL,   -- etsy / instagram / facebook / tiktok / pinterest / threads / youtube / email / blog
  action_type    TEXT NOT NULL,   -- post / reel / story / listing_new / renew / restock / promo / email / article
  title          TEXT NOT NULL,
  notes          TEXT,
  product_slug   TEXT,
  status         TEXT NOT NULL DEFAULT 'planned',  -- planned / done / skipped
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_plan_date ON public.content_plan (scheduled_date);
CREATE INDEX IF NOT EXISTS content_plan_status ON public.content_plan (status);

ALTER TABLE public.content_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_plan_admin_all ON public.content_plan;
CREATE POLICY content_plan_admin_all ON public.content_plan
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
  );
