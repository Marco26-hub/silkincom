/**
 * Newsletter double opt-in confirmation.
 *
 * GET /api/newsletter/confirm?token=XXX
 *
 * - Validates token + expiry
 * - Marks subscriber confirmed
 * - Sends welcome email + schedules heritage (+3d) and discount (+7d) lifecycle jobs
 * - Returns redirect to /newsletter/confirmed (success) or /newsletter/expired (failure)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/newsletter/expired?reason=missing-token`);
  }

  const supabase = createServiceClient();

  // Look the subscriber up by token first. We also fall back to a second
  // query against the historical token column (`confirm_token_used`) so that
  // a customer who clicks the same link twice — or who clicks an old link
  // after another browser already confirmed — lands on the friendly
  // "already confirmed" page instead of "Link non valido".
  let { data: sub } = await supabase
    .from('newsletter_subscribers')
    .select('id, email, is_confirmed, confirm_token_expires_at')
    .eq('confirm_token', token)
    .maybeSingle();

  if (!sub) {
    const { data: usedSub } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, is_confirmed, confirm_token_expires_at')
      .eq('confirm_token_used', token)
      .maybeSingle();
    sub = usedSub;
  }

  if (!sub) {
    return NextResponse.redirect(`${APP_URL}/newsletter/expired?reason=invalid-token`);
  }
  if (sub.is_confirmed) {
    return NextResponse.redirect(`${APP_URL}/newsletter/confirmed?already=1`);
  }
  if (sub.confirm_token_expires_at && new Date(sub.confirm_token_expires_at) < new Date()) {
    return NextResponse.redirect(`${APP_URL}/newsletter/expired?reason=expired`);
  }

  // Mark confirmed + move the token aside. We deliberately don't NULL the
  // active `confirm_token` column without preserving the original value:
  // moving it to `confirm_token_used` lets a duplicate click (very common —
  // customers click twice, share the link, open it from a different device)
  // still resolve to the "already confirmed" branch above instead of
  // showing the alarming "Link non valido" page.
  await supabase
    .from('newsletter_subscribers')
    .update({
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
      confirm_token: null,
      confirm_token_expires_at: null,
      confirm_token_used: token,
    })
    .eq('id', sub.id);

  // Now send welcome + schedule lifecycle (heritage +3d, discount +7d).
  //
  // IMPORTANT: must `await` — Vercel serverless freezes the function the moment
  // a response is returned, cancelling any in-flight HTTP request (including
  // the Resend POST /emails call). Without awaiting, the welcome mail would
  // sporadically never leave even though `error_logs` stays empty.
  try {
    await sendWelcomeEmail(sub.email);
  } catch (e) {
    console.error('Welcome email failed:', e);
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  await supabase.from('email_lifecycle_jobs').insert([
    {
      recipient_email: sub.email,
      email_type: 'heritage',
      scheduled_at: new Date(now + 3 * day).toISOString(),
      status: 'pending',
      payload: { source: 'newsletter-confirm' },
    },
    {
      recipient_email: sub.email,
      email_type: 'first_purchase_discount',
      scheduled_at: new Date(now + 7 * day).toISOString(),
      status: 'pending',
      payload: { source: 'newsletter-confirm', code: 'BENVENUTO10' },
    },
  ]);

  return NextResponse.redirect(`${APP_URL}/newsletter/confirmed`);
}
