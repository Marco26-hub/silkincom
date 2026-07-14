-- Internal outreach priority. This flag never becomes an email "urgent" header:
-- it is used only to order and select the most relevant B2B opportunities.

ALTER TABLE lead_accounts
  ADD COLUMN IF NOT EXISTS priority_high BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lead_accounts_priority
  ON lead_accounts(priority_high DESC, score DESC, created_at DESC)
  WHERE do_not_contact = FALSE;
