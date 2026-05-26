/**
 * Kick off the Google OAuth 2.0 flow for the Ads API. Admin clicks
 * "Connetti Google Ads" → we redirect to Google's consent screen with the
 * `adwords` scope + `access_type=offline` so the callback gets a
 * refresh_token we can store in the integrations table.
 *
 * Required env vars before this works:
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 * The redirect URI here must match exactly what's registered on the OAuth
 * consent screen in Google Cloud Console.
 */
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { APP_URL } from '@/lib/app-url';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_ADS_CLIENT_ID non configurato' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${APP_URL}/api/google-ads/auth/callback`;
  // `adwords` is the umbrella scope that covers reporting AND billing/invoices.
  // `access_type=offline` + `prompt=consent` guarantee Google issues a fresh
  // refresh_token even if the user previously authorised the app.
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/adwords')}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}` +
    `&include_granted_scopes=true`;

  const res = NextResponse.redirect(url);
  res.cookies.set('gads_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });
  return res;
}
