-- Advertising platform integration: stores every campaign + ad group + ad
-- + per-day metrics across Google Ads (and later Meta). Independent of
-- financial_records because the unit of analysis here is "marketing
-- performance," not "money moved": we want impressions / clicks / CTR /
-- ROAS per campaign per day, with a click-through path back to the SQL
-- catalog and the orders that closed.
--
-- Provider rows are upserted on (source, external_id) so we can re-fetch
-- with no duplication. The raw payload is preserved in `raw_data` for
-- audit and future enrichment without another migration.

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('google_ads', 'meta')),
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  channel_type TEXT,
  daily_budget NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  bidding_strategy TEXT,
  target_roas NUMERIC(6,2),
  target_cpa NUMERIC(10,2),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_campaigns_uniq
  ON public.ad_campaigns (source, external_id);
CREATE INDEX IF NOT EXISTS ad_campaigns_status
  ON public.ad_campaigns (status);

CREATE TABLE IF NOT EXISTS public.ad_ad_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ad_ad_groups_uniq
  ON public.ad_ad_groups (campaign_id, external_id);

CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_group_id UUID REFERENCES public.ad_ad_groups(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  ad_type TEXT,
  status TEXT,
  headlines TEXT[] NOT NULL DEFAULT '{}',
  descriptions TEXT[] NOT NULL DEFAULT '{}',
  final_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ad_creatives_uniq
  ON public.ad_creatives (external_id);

CREATE TABLE IF NOT EXISTS public.ad_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversions NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversion_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN clicks::NUMERIC / impressions ELSE 0 END
  ) STORED,
  cpc NUMERIC(10,4) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN cost / clicks ELSE 0 END
  ) STORED,
  cpa NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN conversions > 0 THEN cost / conversions ELSE 0 END
  ) STORED,
  roas NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN cost > 0 THEN conversion_value / cost ELSE 0 END
  ) STORED,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ad_metrics_daily_uniq
  ON public.ad_metrics_daily (campaign_id, date);
CREATE INDEX IF NOT EXISTS ad_metrics_daily_date
  ON public.ad_metrics_daily (date DESC);

CREATE TABLE IF NOT EXISTS public.ad_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('google_ads', 'meta')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel_type TEXT,
  daily_budget NUMERIC(10,2),
  target_roas NUMERIC(6,2),
  target_cpa NUMERIC(10,2),
  bidding_strategy TEXT,
  final_url TEXT,
  headlines TEXT[] NOT NULL DEFAULT '{}',
  descriptions TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  audience_notes TEXT,
  product_slugs TEXT[] NOT NULL DEFAULT '{}',
  generated_with_ai BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_drafts_status ON public.ad_drafts (status);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_campaigns_admin ON public.ad_campaigns;
CREATE POLICY ad_campaigns_admin ON public.ad_campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS ad_metrics_admin ON public.ad_metrics_daily;
CREATE POLICY ad_metrics_admin ON public.ad_metrics_daily
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS ad_ad_groups_admin ON public.ad_ad_groups;
CREATE POLICY ad_ad_groups_admin ON public.ad_ad_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS ad_creatives_admin ON public.ad_creatives;
CREATE POLICY ad_creatives_admin ON public.ad_creatives
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS ad_drafts_admin ON public.ad_drafts;
CREATE POLICY ad_drafts_admin ON public.ad_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
  );
