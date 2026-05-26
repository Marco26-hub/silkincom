/**
 * Minimal Google Ads API client — just enough surface area to pull invoices
 * for the financial ledger. Talks to the REST endpoint directly so we avoid
 * pulling in the heavy google-ads-node SDK (which bundles protobuf + gRPC).
 *
 * Required env vars (all set on Vercel once the account owner finishes OAuth):
 *   GOOGLE_ADS_DEVELOPER_TOKEN   — applied for at https://ads.google.com/aw/apicenter
 *   GOOGLE_ADS_CLIENT_ID         — OAuth2 client id from console.cloud.google.com
 *   GOOGLE_ADS_CLIENT_SECRET     — OAuth2 client secret
 *   GOOGLE_ADS_CUSTOMER_ID       — 10-digit Ads account id (no dashes)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID — only set when using a Manager (MCC); same
 *                                  10-digit format
 *
 * OAuth tokens (access_token + refresh_token) are stored in the
 * `integrations` table under provider='google_ads' so we can rotate without
 * a redeploy. The refresh dance happens transparently inside `gadsFetch`.
 */
import { createServiceClient } from '@/lib/supabase/server';

const BASE = 'https://googleads.googleapis.com';
const API_VERSION = 'v18';

type IntegrationRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} non configurato`);
  return v;
}

export function getCustomerId(): string {
  return envOrThrow('GOOGLE_ADS_CUSTOMER_ID').replace(/-/g, '');
}

export function getLoginCustomerId(): string | undefined {
  const v = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  return v ? v.replace(/-/g, '') : undefined;
}

async function loadIntegration(): Promise<IntegrationRow | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, expires_at, metadata')
    .eq('provider', 'google_ads')
    .maybeSingle();
  return (data as IntegrationRow | null) ?? null;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const clientId = envOrThrow('GOOGLE_ADS_CLIENT_ID');
  const clientSecret = envOrThrow('GOOGLE_ADS_CLIENT_SECRET');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    // Mark the integration disconnected so /admin/ads can surface the
    // problem instead of every subsequent call quietly 500-ing. Best-effort —
    // the actual error still bubbles up.
    try {
      const sb = createServiceClient();
      await sb
        .from('integrations')
        .update({
          access_token: '',
          metadata: { last_refresh_error: json.error_description ?? json.error ?? res.statusText },
        })
        .eq('provider', 'google_ads');
      await sb.from('error_logs').insert({
        level: 'error',
        message: `google-ads token refresh failed: ${json.error ?? res.statusText}`,
        context: { source: 'google_ads', operation: 'refresh', detail: json },
      });
    } catch {
      // never let logging itself break the refresh path
    }
    throw new Error(`google-ads token refresh failed: ${json.error_description ?? json.error ?? res.statusText}`);
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token, // Google sometimes rotates this — persist it.
    expires_in: json.expires_in ?? 3600,
  };
}

async function persistTokens(opts: {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {
    access_token: opts.access_token,
    expires_at: new Date(Date.now() + (opts.expires_in - 60) * 1000).toISOString(),
  };
  // Only overwrite refresh_token when Google actually rotated it. Dropping a
  // missing field would null out the column and lock us out of the account.
  if (opts.refresh_token) patch.refresh_token = opts.refresh_token;
  await supabase.from('integrations').update(patch).eq('provider', 'google_ads');
}

async function getAccessToken(): Promise<string> {
  const row = await loadIntegration();
  if (!row || !row.refresh_token) throw new Error('google_ads non connesso');
  const stillValid =
    row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 30 * 1000;
  if (stillValid && row.access_token) return row.access_token;
  const refreshed = await refreshAccessToken(row.refresh_token);
  await persistTokens(refreshed);
  return refreshed.access_token;
}

/**
 * Generic Google Ads REST call. Throws on non-2xx so the caller can decide
 * how to log it (sync routine writes the message into financial_sync_log).
 */
export async function gadsFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const developerToken = envOrThrow('GOOGLE_ADS_DEVELOPER_TOKEN');
  const loginCustomerId = getLoginCustomerId();

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('developer-token', developerToken);
  if (loginCustomerId) headers.set('login-customer-id', loginCustomerId);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE}/${API_VERSION}${path}`, { ...init, headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`google-ads ${res.status} ${path} :: ${txt.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
