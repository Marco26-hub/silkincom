/**
 * GET /api/tiktok-shop/auth/callback
 * TikTok redirects here after the seller approves. We exchange the auth code
 * for tokens and store them in `integrations` (provider='tiktok_shop'), then
 * bounce back to /admin/tiktok.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { exchangeCode } from '@/lib/tiktok-shop/client';
import { APP_URL } from '@/lib/app-url';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || url.searchParams.get('auth_code');
  const state = url.searchParams.get('state');
  const cookieState = req.cookies.get('tiktok_oauth_state')?.value;
  const shopRegion = url.searchParams.get('shop_region');

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/admin/tiktok?error=${encodeURIComponent('Nessun codice ricevuto da TikTok')}`);
  }
  // Best-effort CSRF check (don't hard-fail if the cookie was dropped cross-site).
  if (state && cookieState && state !== cookieState) {
    return NextResponse.redirect(`${APP_URL}/admin/tiktok?error=${encodeURIComponent('State non valido')}`);
  }

  try {
    const tokens = await exchangeCode(code);
    const supabase = createServiceClient();
    // One row per provider: replace any existing TikTok connection.
    await supabase.from('integrations').delete().eq('provider', 'tiktok_shop');
    await supabase.from('integrations').insert({
      provider: 'tiktok_shop',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at).toISOString(),
      connected_at: new Date().toISOString(),
      metadata: { seller_name: tokens.sellerName ?? null, shop_region: shopRegion ?? null },
    });
    return NextResponse.redirect(`${APP_URL}/admin/tiktok?connected=1`);
  } catch (e) {
    return NextResponse.redirect(`${APP_URL}/admin/tiktok?error=${encodeURIComponent((e as Error).message)}`);
  }
}
