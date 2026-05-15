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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/newsletter/expired?reason=missing-token`);
  }

  const supabase = createServiceClient();
  const { data: sub } = await supabase
    .from('newsletter_subscribers')
    .select('id, email, is_confirmed, confirm_token_expires_at')
    .eq('confirm_token', token)
    .single();

  if (!sub) {
    return NextResponse.redirect(`${baseUrl}/newsletter/expired?reason=invalid-token`);
  }
  if (sub.is_confirmed) {
    return NextResponse.redirect(`${baseUrl}/newsletter/confirmed?already=1`);
  }
  if (sub.confirm_token_expires_at && new Date(sub.confirm_token_expires_at) < new Date()) {
    return NextResponse.redirect(`${baseUrl}/newsletter/expired?reason=expired`);
  }

  // Mark confirmed + clear token
  await supabase
    .from('newsletter_subscribers')
    .update({
      is_confirmed: true,
      confirmed_at: new Date().toISOString(),
      confirm_token: null,
      confirm_token_expires_at: null,
    })
    .eq('id', sub.id);

  // Now send welcome + schedule lifecycle (heritage +3d, discount +7d)
  sendWelcomeEmail(sub.email).catch((e) => console.error('Welcome email failed:', e));

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
      payload: { source: 'newsletter-confirm', code: 'BENVENUTA10' },
    },
  ]);

  return NextResponse.redirect(`${baseUrl}/newsletter/confirmed`);
}
