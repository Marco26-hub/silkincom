-- Automation support tables (social queue + AI ingestion logs)
-- Eseguire dopo schema.sql (Supabase SQL editor).

CREATE TABLE IF NOT EXISTS social_posts_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'pinterest')),
  caption TEXT NOT NULL,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  cta TEXT,
  media_prompt TEXT,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for TIMESTAMP,
  published_at TIMESTAMP,
  payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_queue_status ON social_posts_queue(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_queue_platform ON social_posts_queue(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_queue_scheduled_for ON social_posts_queue(scheduled_for);

CREATE TABLE IF NOT EXISTS ai_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('mobile-upload', 'webhook', 'manual')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'blog', 'social')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  request_payload JSONB DEFAULT '{}'::jsonb,
  response_payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_ingestion_runs_entity_type ON ai_ingestion_runs(entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_ingestion_runs_status ON ai_ingestion_runs(status);
