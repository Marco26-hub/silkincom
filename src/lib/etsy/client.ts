import { APP_URL } from '@/lib/app-url';
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
  // .trim() is critical: a stray trailing space/newline in the Vercel env var
  // survives into the `x-api-key` header and Etsy rejects it with
  // "403 Shared secret is required in x-api-key header" — even though the SAME
  // value works for OAuth (query-string parsing tolerates the whitespace).
  // A space passes fetch's header validation but fails on Etsy's side.
  return {
    apiKey: (process.env.ETSY_API_KEY || '').trim(),
    sharedSecret: (process.env.ETSY_SHARED_SECRET || '').trim(),
    shopId: (process.env.ETSY_SHOP_ID || '').trim(),
    redirectUri: `${APP_URL}/api/etsy/auth/callback`,
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

  // expires_at is stored as a timestamptz STRING — must parse to epoch ms
  // before comparing with Date.now(). The previous numeric comparison
  // produced NaN and silently skipped refresh, so the token went stale after
  // an hour and every sync started failing with 401.
  const expiresMs = new Date(data.expires_at).getTime();
  if (Number.isFinite(expiresMs) && Date.now() > expiresMs - 60_000) {
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

/**
 * Resolve the numeric Etsy shop id, deriving it from the OAuth token the
 * first time and caching it in integrations.metadata so we never need the
 * ETSY_SHOP_ID env var. Etsy access tokens are prefixed "<user_id>.<token>",
 * so we read the user id straight off the token, then ask Etsy for that
 * user's shop.
 */
export async function resolveShopId(): Promise<string> {
  // Explicit env override wins (useful for tests / multi-shop).
  const envId = process.env.ETSY_SHOP_ID;
  if (envId) return envId;

  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('provider', 'etsy')
    .single();
  if (!data) throw new Error('Etsy non connesso.');

  const cached = (data.metadata as { shop_id?: string } | null)?.shop_id;
  if (cached) return cached;

  // Derive user id from the token prefix, fetch the shop, cache it.
  const userId = String(data.access_token).split('.')[0];
  const shops = await etsyFetch<{ shop_id: number } | { results: { shop_id: number }[] }>(
    `/application/users/${userId}/shops`,
  );
  const shopId = String(
    'shop_id' in shops ? shops.shop_id : shops.results?.[0]?.shop_id ?? '',
  );
  if (!shopId) throw new Error('Impossibile determinare lo shop Etsy dal token.');

  await supabase
    .from('integrations')
    .update({ metadata: { ...(data.metadata as object ?? {}), shop_id: shopId } })
    .eq('provider', 'etsy');
  return shopId;
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
