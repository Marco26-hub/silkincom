-- Extend the financial ledger to cover advertising spend (Google Ads
-- invoices). Same `financial_records` row shape — Google Ads bills monthly
-- in arrears, so we store one row per month per customer account with
-- `type='invoice'` and the PDF URL Google hosts.
--
-- Costs are recorded as POSITIVE gross_amount but kept in a separate source
-- bucket so the report can subtract them from net revenue cleanly.

ALTER TABLE public.financial_records
  DROP CONSTRAINT IF EXISTS financial_records_source_check;
ALTER TABLE public.financial_records
  ADD CONSTRAINT financial_records_source_check
  CHECK (source IN ('stripe', 'etsy', 'google_ads'));

ALTER TABLE public.financial_sync_state
  DROP CONSTRAINT IF EXISTS financial_sync_state_source_check;
ALTER TABLE public.financial_sync_state
  ADD CONSTRAINT financial_sync_state_source_check
  CHECK (source IN ('stripe', 'etsy', 'google_ads'));

INSERT INTO public.financial_sync_state (source, last_synced_at)
VALUES ('google_ads', now() - INTERVAL '90 days')
ON CONFLICT (source) DO NOTHING;
