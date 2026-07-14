-- B2B lead sourcing, outreach and inbound STOP tracking.
-- Uses a unique migration number because 017 and 018 already belong to the live schema.

CREATE TABLE IF NOT EXISTS lead_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL UNIQUE,
  industry TEXT NOT NULL DEFAULT 'hospitality',
  city TEXT,
  country TEXT DEFAULT 'IT',
  contact_name TEXT,
  contact_role TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source_url TEXT,
  public_contact_page TEXT,
  discovery_query TEXT,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'scanned', 'qualified', 'contacted', 'replied', 'do_not_contact')),
  score INT NOT NULL DEFAULT 0,
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  last_scanned_at TIMESTAMP,
  last_contacted_at TIMESTAMP,
  last_reply_at TIMESTAMP,
  reply_count INT NOT NULL DEFAULT 0,
  stop_requested_at TIMESTAMP,
  last_reply_excerpt TEXT,
  email_sent_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_accounts_status ON lead_accounts(status, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_accounts_industry ON lead_accounts(industry, city, country);
CREATE INDEX IF NOT EXISTS idx_lead_accounts_country ON lead_accounts(country, city);

CREATE TABLE IF NOT EXISTS lead_outreach_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES lead_accounts(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  focus TEXT NOT NULL DEFAULT 'hospitality',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMP,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL DEFAULT 'b2b_collaboration',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_outreach_jobs_lead ON lead_outreach_jobs(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_outreach_jobs_status ON lead_outreach_jobs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_accounts(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  to_email TEXT,
  subject TEXT,
  message_excerpt TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  intent TEXT NOT NULL DEFAULT 'reply'
    CHECK (intent IN ('reply', 'stop', 'bounce', 'unknown')),
  matched_newsletter BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_inbound_messages_lead ON lead_inbound_messages(lead_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_inbound_messages_email ON lead_inbound_messages(from_email, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_inbound_messages_intent ON lead_inbound_messages(intent, received_at DESC);

ALTER TABLE lead_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_outreach_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_inbound_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE lead_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE lead_outreach_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE lead_inbound_messages FROM anon, authenticated;
GRANT ALL ON TABLE lead_accounts TO service_role;
GRANT ALL ON TABLE lead_outreach_jobs TO service_role;
GRANT ALL ON TABLE lead_inbound_messages TO service_role;
