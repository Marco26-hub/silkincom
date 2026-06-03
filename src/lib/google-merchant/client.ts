/**
 * Google Content API for Shopping (v2.1) client — server-to-server via a
 * Service Account, zero external deps (the SA JWT is signed with Node crypto,
 * same hand-rolled approach as the TikTok Shop HMAC client).
 *
 * Env vars:
 *   GOOGLE_MERCHANT_SA_KEY — the Service Account JSON key (raw JSON or base64).
 *                            Needs the `https://www.googleapis.com/auth/content`
 *                            scope and to be added as a user on the Merchant
 *                            Center account.
 *   GOOGLE_MERCHANT_ID     — the Merchant Center account id (digits).
 *
 * No OAuth dance and no token row: the SA mints a short-lived bearer on demand
 * (cached in-process until ~1 min before expiry).
 */
import { createSign } from 'crypto';

const SCOPE = 'https://www.googleapis.com/auth/content';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';

type ServiceAccount = { client_email: string; private_key: string };

function parseServiceAccount(): ServiceAccount | null {
  let raw = (process.env.GOOGLE_MERCHANT_SA_KEY || '').trim();
  if (!raw) return null;
  // Accept either raw JSON or a base64-encoded blob (easier to paste in Vercel).
  if (!raw.startsWith('{')) {
    try {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  try {
    const j = JSON.parse(raw);
    if (j.client_email && j.private_key) {
      // Vercel turns real newlines in env values into the two chars "\n".
      return { client_email: j.client_email, private_key: String(j.private_key).replace(/\\n/g, '\n') };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function merchantConfig() {
  return {
    sa: parseServiceAccount(),
    merchantId: (process.env.GOOGLE_MERCHANT_ID || '').trim(),
  };
}

export function isMerchantConfigured(): boolean {
  const c = merchantConfig();
  return Boolean(c.sa && c.merchantId);
}

// ---------- Service Account → access token (JWT bearer grant) ----------

let cachedToken: { token: string; expMs: number } | null = null;

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expMs - 60_000) return cachedToken.token;
  const { sa } = merchantConfig();
  if (!sa) throw new Error('Google Merchant non configurato (GOOGLE_MERCHANT_SA_KEY mancante o invalida).');

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signingInput = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = b64url(signer.sign(sa.private_key));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google token ${res.status}: ${json.error_description || json.error || 'nessun token'}`);
  }
  cachedToken = { token: json.access_token, expMs: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

// ---------- Requests ----------

type FetchOpts = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; query?: Record<string, string> };

/** Merchant-scoped request: `${BASE}/${merchantId}${path}`. Returns parsed JSON. */
export async function merchantFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { merchantId } = merchantConfig();
  const token = await getAccessToken();
  const qs = opts.query ? `?${new URLSearchParams(opts.query).toString()}` : '';
  const res = await fetch(`${BASE}/${merchantId}${path}${qs}`, {
    method: opts.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Merchant API ${res.status}: ${json?.error?.message || text}`);
  return json as T;
}

/** custombatch (insert/delete up to 1000 entries). Posted to the un-scoped `${BASE}/products/batch`. */
export async function merchantProductsBatch(
  entries: Array<{ batchId: number; merchantId: string; method: 'insert' | 'delete'; product?: unknown; productId?: string }>,
): Promise<{ entries?: Array<{ batchId: number; errors?: { errors?: Array<{ message: string }> }; product?: any }> }> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/products/batch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Merchant batch ${res.status}: ${json?.error?.message || text}`);
  return json;
}

export type MerchantAccount = { id?: string; name?: string; websiteUrl?: string; adultContent?: boolean };

/** Verify the connection + read the account name (used by the status route). */
export async function getMerchantAccount(): Promise<MerchantAccount> {
  const { merchantId } = merchantConfig();
  return merchantFetch<MerchantAccount>(`/accounts/${merchantId}`);
}
