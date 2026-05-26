/**
 * Google Ads OAuth callback. Exchanges the authorization code for an
 * access_token + refresh_token, then upserts the integrations row so future
 * `gadsFetch` calls can refresh transparently.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/app-url';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = req.cookies.get('gads_oauth_state')?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${APP_URL}/admin/fatture?error=google_ads_auth_failed`);
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${APP_URL}/admin/fatture?error=google_ads_misconfigured`);
  }

  const redirectUri = `${APP_URL}/api/google-ads/auth/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
  };

  if (!tokenRes.ok || !tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(
      `${APP_URL}/admin/fatture?error=google_ads_token_failed&reason=${encodeURIComponent(tokens.error ?? '')}`,
    );
  }

  const supabase = createServiceClient();
  await supabase
    .from('integrations')
    .upsert(
      {
        provider: 'google_ads',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        connected_at: new Date().toISOString(),
        metadata: { scope: tokens.scope ?? '' },
      },
      { onConflict: 'provider' },
    );

  const response = NextResponse.redirect(`${APP_URL}/admin/fatture?connected=google_ads`);
  response.cookies.delete('gads_oauth_state');
  return response;
}
