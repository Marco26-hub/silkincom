-- 033: preserve the original confirm token so re-clicking the same link
-- lands on the "already confirmed" page instead of "Link non valido".
--
-- Until now /api/newsletter/confirm cleared confirm_token to NULL on the
-- first successful click. A second click (from any device, by accident, or
-- because the customer wanted to verify the action) couldn't find the row
-- by token anymore, and we redirected to /newsletter/expired with the
-- alarming "Link non valido" page. We now move the used token aside into
-- this new column so the route can still locate the subscriber and respond
-- with the friendly "Già confermato" branch.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirm_token_used text;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_confirm_token_used_idx
  ON newsletter_subscribers (confirm_token_used)
  WHERE confirm_token_used IS NOT NULL;

COMMENT ON COLUMN newsletter_subscribers.confirm_token_used IS
  'Historical confirm_token preserved after first successful click so '
  'repeat clicks on the same link still resolve to the subscriber row and '
  'redirect to /newsletter/confirmed?already=1 (rather than 404/expired).';
