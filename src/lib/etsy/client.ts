/**
 * Etsy Open API v3 client.
 *
 * Env vars required:
 *   ETSY_API_KEY        — from developers.etsy.com
 *   ETSY_SHARED_SECRET  — OAuth2 shared secret
 *   ETSY_SHOP_ID        — numeric shop ID
 *   ETSY_ACCESS_TOKEN   — OAuth2 access token (stored in DB after auth)
 *   ETSY_REFRESH_TOKEN  — for token refresh
 */

const BASE = 'https://openapi.etsy.com/v3';

export type EtsyTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

function getConfig() {
  return {
    apiKey: process.env.ETSY_API_KEY || '',
    sharedSecret: process.env.ETSY_SHARED_SECRET || '',
    shopId: process.env.ETSY_SHOP_ID || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com'}/api/etsy/auth/callback`,
  };
}

export function getAuthUrl(state: string): string {
  const cfg = getConfig();
  const scopes = [
    'listings_r', 'listings_w', 'listings_d',
    'transactions_r', 'transactions_w',
    'shops_r', 'shops_w',
  ].join('%20');

  return `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(cfg.redirectUri)}&scope=${scopes}&client_id=${cfg.apiKey}&state=${state}&code_challenge_method=S256`;
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<EtsyTokens> {
  const cfg = getConfig();
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cfg.apiKey,
      redirect_uri: cfg.redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshTokens(refreshToken: string): Promise<EtsyTokens> {
  const cfg = getConfig();
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: cfg.apiKey,
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Token refresh failed');
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

async function getValidToken(): Promise<string> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('provider', 'etsy')
    .single();

  if (!data) throw new Error('Etsy non connesso. Vai su /admin/etsy per collegare.');

  if (Date.now() > (data.expires_at - 60_000)) {
    const tokens = await refreshTokens(data.refresh_token);
    await supabase
      .from('integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at).toISOString(),
      })
      .eq('provider', 'etsy');
    return tokens.access_token;
  }

  return data.access_token;
}

export async function etsyFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cfg = getConfig();
  const token = await getValidToken();

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'x-api-key': cfg.apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Etsy API ${res.status}: ${err.error || JSON.stringify(err)}`);
  }

  return res.json();
}

export function getShopId(): string {
  return getConfig().shopId;
}
