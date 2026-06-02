-- First-party, privacy-friendly web analytics (Plausible-style).
-- No PII, no persistent cross-site cookie: the client sends an anonymous
-- session id held only in sessionStorage. Referrer HOST only (not full URL),
-- country derived from edge header then IP discarded. Aggregate-only, so it
-- stays outside the cookie-consent gate while giving the owner traffic +
-- conversion insight inside /admin.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'pageview','product_view','add_to_cart','begin_checkout','purchase','search'
  )),
  path TEXT NOT NULL,
  referrer_host TEXT,
  locale TEXT,
  country TEXT,
  device TEXT CHECK (device IN ('mobile','tablet','desktop') OR device IS NULL),
  product_slug TEXT,
  value NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_type_created ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_path ON public.analytics_events (path);
CREATE INDEX IF NOT EXISTS analytics_events_product ON public.analytics_events (product_slug) WHERE product_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_session ON public.analytics_events (session_id, created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analytics_events_admin_read ON public.analytics_events;
CREATE POLICY analytics_events_admin_read ON public.analytics_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','super_admin'))
  );

-- See migration applied via Supabase MCP for the analytics_* SECURITY DEFINER
-- aggregation functions (analytics_daily / top_paths / top_products /
-- referrers / summary).
