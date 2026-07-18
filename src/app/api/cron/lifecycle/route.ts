/**
 * Cron route — processes due email_lifecycle_jobs.
 *
 * Triggered by Vercel Cron (configured in vercel.json) every 30 minutes.
 * Authenticated via CRON_SECRET (set as Vercel env var + cron header).
 *
 * Pulls all pending jobs whose scheduled_at <= now, sends emails, marks status.
 * For abandoned_cart jobs, checks if related order is still 'pending' before sending
 * (skip if user already paid, mark cancelled).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  sendHeritageEmail,
  sendFirstPurchaseDiscountEmail,
  sendAbandonedCartEmail,
  sendReviewRequestEmail,
} from '@/lib/email';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization');
  if (header === `Bearer ${expected}`) return true;
  // Vercel Cron adds custom header
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

type Job = {
  id: string;
  recipient_email: string;
  email_type: 'heritage' | 'first_purchase_discount' | 'abandoned_cart' | 'welcome' | 'review_request';
  scheduled_at: string;
  attempts: number;
  payload: Record<string, unknown> | null;
};

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Pull due jobs
  const { data: jobs, error } = await supabase
    .from('email_lifecycle_jobs')
    .select('id, recipient_email, email_type, scheduled_at, attempts, payload')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .lt('attempts', MAX_ATTEMPTS)
    .order('scheduled_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('Cron query failed:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of (jobs as Job[]) || []) {
    processed++;
    try {
      let result: { sent: boolean; reason?: string } = { sent: false };

      switch (job.email_type) {
        case 'heritage': {
          await sendHeritageEmail(job.recipient_email);
          result = { sent: true };
          break;
        }
        case 'first_purchase_discount': {
          const code = (job.payload?.code as string) || 'BENVENUTO10';
          await sendFirstPurchaseDiscountEmail(job.recipient_email, code);
          result = { sent: true };
          break;
        }
        case 'review_request': {
          const orderNumber = (job.payload?.order_number as string) || '';
          const items = (job.payload?.items as Array<{
            name: string;
            slug: string;
            image?: string;
          }>) || [];
          if (items.length === 0) {
            result = { sent: false, reason: 'no-items' };
            break;
          }
          await sendReviewRequestEmail(job.recipient_email, orderNumber, items);
          result = { sent: true };
          break;
        }
        case 'abandoned_cart': {
          // Skip if order already paid or cancelled
          const orderId = job.payload?.order_id as string | undefined;
          if (orderId) {
            const { data: order } = await supabase
              .from('orders')
              .select('id, status')
              .eq('id', orderId)
              .single();
            if (!order || order.status !== 'pending') {
              result = { sent: false, reason: 'order-not-pending' };
              break;
            }
          }
          const items = (job.payload?.items as Array<{
            name: string;
            slug?: string;
            price: number;
            quantity: number;
          }>) || [];
          await sendAbandonedCartEmail(
            job.recipient_email,
            items.map((it) => ({
              name: it.name,
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
              href: it.slug ? `${APP_URL}/prodotto/${it.slug}` : undefined,
            })),
            `${APP_URL}/cart`,
            'CART25'
          );
          result = { sent: true };
          break;
        }
        default: {
          result = { sent: false, reason: 'unknown-type' };
        }
      }

      if (result.sent) {
        sent++;
        await supabase
          .from('email_lifecycle_jobs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', job.id);
      } else {
        skipped++;
        await supabase
          .from('email_lifecycle_jobs')
          .update({ status: 'cancelled', last_error: result.reason || 'skipped' })
          .eq('id', job.id);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Job ${job.id} failed:`, msg);
      const newAttempts = job.attempts + 1;
      const status = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await supabase
        .from('email_lifecycle_jobs')
        .update({
          attempts: newAttempts,
          status,
          last_error: msg.slice(0, 500),
        })
        .eq('id', job.id);
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    sent,
    failed,
    skipped,
    timestamp: now,
  });
}
