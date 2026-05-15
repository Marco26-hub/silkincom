import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = req.cookies.get('etsy_oauth_state')?.value;
  const codeVerifier = req.cookies.get('etsy_code_verifier')?.value;

  if (!code || !state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/etsy?error=auth_failed`);
  }

  const apiKey = process.env.ETSY_API_KEY!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app'}/api/etsy/auth/callback`;

  const tokenRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: apiKey,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Etsy token exchange failed:', tokens);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/etsy?error=token_failed`);
  }

  const supabase = createServiceClient();
  await supabase.from('integrations').upsert({
    provider: 'etsy',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    metadata: { token_type: tokens.token_type },
  }, { onConflict: 'provider' });

  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/etsy?connected=true`);
  response.cookies.delete('etsy_oauth_state');
  response.cookies.delete('etsy_code_verifier');

  return response;
}
