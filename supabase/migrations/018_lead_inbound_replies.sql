-- Inbound reply tracking for B2B leads and newsletter STOP requests.

ALTER TABLE lead_accounts
  ADD COLUMN IF NOT EXISTS reply_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stop_requested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_reply_excerpt TEXT;

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
