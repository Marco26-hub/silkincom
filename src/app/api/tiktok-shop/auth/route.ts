/**
 * GET /api/tiktok-shop/auth  (admin)
 * Starts the TikTok Shop seller authorization: sets a state cookie and redirects
 * the admin to the TikTok consent page. After consent TikTok returns to
 * /api/tiktok-shop/auth/callback with the auth code.
 */
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import { getAuthUrl, isTikTokConfigured } from '@/lib/tiktok-shop/client';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/login?redirect=/admin/tiktok`);
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isTikTokConfigured()) {
    return NextResponse.json({ error: 'TIKTOK_SHOP_APP_KEY / APP_SECRET non configurati su Vercel.' }, { status: 400 });
  }

  const state = randomUUID();
  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set('tiktok_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}
