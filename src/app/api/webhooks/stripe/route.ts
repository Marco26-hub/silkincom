/**
 * Alias of the Stripe webhook handler at the path Stripe actually calls.
 *
 * The live endpoint (silkincom-production, account Virtual SRL) is configured to
 * POST to /api/webhooks/stripe, but the handler historically lived only at
 * /api/stripe/webhook — so every delivery 404'd (100% error rate in the Stripe
 * dashboard). Real payments therefore never updated the DB: order stuck
 * payment_status=pending, no payments row, no stock decrement / coupon
 * redemption / confirmation email (e.g. SK-20260602-0038, €50, had to be
 * backfilled by hand).
 *
 * Re-exporting the existing handler here makes Stripe's current endpoint +
 * signing secret work as-is, with no change needed on the Stripe side. The
 * handler's status-based idempotency guard (skips orders already non-pending)
 * means Stripe's automatic retries of past failed events won't double-process
 * the manually backfilled orders.
 */
export { POST, runtime, dynamic } from '@/app/api/stripe/webhook/route';
