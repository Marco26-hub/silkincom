/**
 * TikTok Shop Partner API v2 client (EU/Italy region).
 *
 * Env vars:
 *   TIKTOK_SHOP_APP_KEY     — app key (also fine to expose; it's a client id)
 *   TIKTOK_SHOP_APP_SECRET  — app secret (HMAC signing + token exchange)
 *   TIKTOK_SHOP_SERVICE_ID  — service id from the app detail page (authorize URL)
 *
 * Token (per shop) is stored in `integrations` with provider='tiktok_shop',
 * mirroring the Etsy client. The shop_cipher (needed on every shop-scoped call)
 * is cached in integrations.metadata after the first /authorization/shops call.
 *
 * NOTE: signing + auth endpoints are per the public v2 docs; expect to verify
 * live on first authorization (the Etsy integration needed the same).
 */
import { createHmac } from 'crypto';
import { APP_URL } from '@/lib/app-url';

const BASE = 'https://open-api.tiktokglobalshop.com';
const AUTH_BASE = 'https://auth.tiktok-shops.com';
const AUTHORIZE_PAGE = 'https://services.tiktokshop.com/open/authorize';

export type TikTokTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
};

function cfg() {
  return {
    appKey: (process.env.TIKTOK_SHOP_APP_KEY || '').trim(),
    appSecret: (process.env.TIKTOK_SHOP_APP_SECRET || '').trim(),
    serviceId: (process.env.TIKTOK_SHOP_SERVICE_ID || '').trim(),
    redirectUri: `${APP_URL}/api/tiktok-shop/auth/callback`,
  };
}

export function isTikTokConfigured(): boolean {
  const c = cfg();
  return Boolean(c.appKey && c.appSecret);
}

// ---------- OAuth ----------

export function getAuthUrl(state: string): string {
  const c = cfg();
  // Custom-app seller authorization is driven by the service_id; TikTok appends
  // ?app_key=&code=&locale=&shop_region= to our redirect URL after consent.
  return `${AUTHORIZE_PAGE}?service_id=${encodeURIComponent(c.serviceId)}&state=${encodeURIComponent(state)}`;
}

type TokenResponse = {
  code: number;
  message: string;
  data?: {
    access_token: string;
    refresh_token: string;
    access_token_expire_in: number; // epoch seconds
    refresh_token_expire_in: number;
    seller_name?: string;
    open_id?: string;
  };
};

export async function exchangeCode(authCode: string): Promise<TikTokTokens & { sellerName?: string }> {
  const c = cfg();
  const url = `${AUTH_BASE}/api/v2/token/get?app_key=${c.appKey}&app_secret=${c.appSecret}&auth_code=${encodeURIComponent(authCode)}&grant_type=authorized_code`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  const json = (await res.json()) as TokenResponse;
  if (json.code !== 0 || !json.data) throw new Error(`TikTok token/get ${json.code}: ${json.message}`);
  return {
    access_token: json.data.access_token,
    refresh_token: json.data.refresh_token,
    expires_at: json.data.access_token_expire_in * 1000,
    sellerName: json.data.seller_name,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TikTokTokens> {
  const c = cfg();
  const url = `${AUTH_BASE}/api/v2/token/refresh?app_key=${c.appKey}&app_secret=${c.appSecret}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  const json = (await res.json()) as TokenResponse;
  if (json.code !== 0 || !json.data) throw new Error(`TikTok token/refresh ${json.code}: ${json.message}`);
  return {
    access_token: json.data.access_token,
    refresh_token: json.data.refresh_token,
    expires_at: json.data.access_token_expire_in * 1000,
  };
}

async function getValidToken(): Promise<string> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('provider', 'tiktok_shop')
    .single();
  if (!data) throw new Error('TikTok Shop non connesso. Vai su /admin/tiktok per collegare.');

  const expiresMs = new Date(data.expires_at).getTime();
  if (Number.isFinite(expiresMs) && Date.now() > expiresMs - 60_000) {
    const t = await refreshTokens(data.refresh_token);
    await supabase
      .from('integrations')
      .update({
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        expires_at: new Date(t.expires_at).toISOString(),
      })
      .eq('provider', 'tiktok_shop');
    return t.access_token;
  }
  return data.access_token;
}

// ---------- Signing (v2) ----------

/**
 * v2 sign: app_secret + path + sorted({key}{value} of query params excluding
 * sign & access_token) + body (if JSON) + app_secret, HMAC-SHA256 with
 * app_secret, hex.
 */
function sign(path: string, query: Record<string, string>, body: string, appSecret: string): string {
  const keys = Object.keys(query).filter((k) => k !== 'sign' && k !== 'access_token').sort();
  let input = path;
  for (const k of keys) input += k + query[k];
  input = appSecret + input + body + appSecret;
  return createHmac('sha256', appSecret).update(input).digest('hex');
}

/** Authorized shop cipher (required on shop-scoped calls), cached in metadata. */
export async function resolveShopCipher(): Promise<{ cipher: string; shopId: string; region?: string }> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('provider', 'tiktok_shop')
    .single();
  const meta = (data?.metadata as { shop_cipher?: string; shop_id?: string; shop_region?: string } | null) ?? null;
  if (meta?.shop_cipher && meta?.shop_id) {
    return { cipher: meta.shop_cipher, shopId: meta.shop_id, region: meta.shop_region };
  }
  // Fetch authorized shops (this call is NOT shop-scoped).
  const resp = await tiktokFetch<{ shops: Array<{ id: string; name: string; region: string; cipher: string }> }>(
    '/authorization/202309/shops',
    { method: 'GET', skipCipher: true },
  );
  const shop = resp.shops?.[0];
  if (!shop?.cipher) throw new Error('Nessuno shop autorizzato trovato per TikTok.');
  await supabase
    .from('integrations')
    .update({ metadata: { ...(data?.metadata as object ?? {}), shop_cipher: shop.cipher, shop_id: shop.id, shop_region: shop.region, shop_name: shop.name } })
    .eq('provider', 'tiktok_shop');
  return { cipher: shop.cipher, shopId: shop.id, region: shop.region };
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PUT';
  query?: Record<string, string>;
  body?: unknown;
  skipCipher?: boolean; // for non-shop-scoped calls (e.g. /authorization/shops)
};

/** Signed request to the TikTok Shop open API. Returns the unwrapped `data`. */
export async function tiktokFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const c = cfg();
  const token = await getValidToken();
  const method = opts.method || 'GET';
  const bodyStr = opts.body ? JSON.stringify(opts.body) : '';

  const query: Record<string, string> = {
    app_key: c.appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...(opts.query || {}),
  };
  if (!opts.skipCipher) {
    const { cipher } = await resolveShopCipher();
    query.shop_cipher = cipher;
  }
  query.sign = sign(path, query, bodyStr, c.appSecret);

  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    method,
    headers: {
      'x-tts-access-token': token,
      'Content-Type': 'application/json',
    },
    ...(bodyStr ? { body: bodyStr } : {}),
  });
  const json = (await res.json()) as { code: number; message: string; data?: T };
  if (json.code !== 0) throw new Error(`TikTok API ${json.code}: ${json.message}`);
  return json.data as T;
}
