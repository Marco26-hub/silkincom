import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * OpenRouter API key, settable from the admin (Blog page) instead of only via
 * Vercel env. Stored in `integrations` (provider = 'openrouter'), encrypted
 * with AES-256-GCM under a key derived from SUPABASE_SERVICE_ROLE_KEY, so the
 * row is useless even to someone who could read the table. The admin UI only
 * ever sees the last four characters.
 *
 * getOpenRouterKey(): admin-saved key first, then the OPENROUTER_API_KEY env.
 */

const PROVIDER = 'openrouter';
const PREFIX = 'enc:v1:';
const CACHE_MS = 60_000;

let cache: { key: string | null; at: number } | null = null;

function cipherKey(): Buffer {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante');
  return createHash('sha256').update(`${base}:openrouter-key`).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `${PREFIX}${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${data.toString('base64')}`;
}

function decrypt(stored: string): string | null {
  if (!stored.startsWith(PREFIX)) return null;
  try {
    const [iv, tag, data] = stored.slice(PREFIX.length).split(':');
    const d = createDecipheriv('aes-256-gcm', cipherKey(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
  } catch {
    // Service-role key rotated or row tampered with: treat as not set.
    return null;
  }
}

async function readSaved(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('provider', PROVIDER)
    .maybeSingle();
  return data?.access_token ? decrypt(data.access_token) : null;
}

export async function getOpenRouterKey(): Promise<string | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.key;
  let saved: string | null = null;
  try {
    saved = await readSaved();
  } catch {
    // DB unreachable: fall back to the env key below.
  }
  const key = saved || process.env.OPENROUTER_API_KEY || null;
  cache = { key, at: Date.now() };
  return key;
}

export type OpenRouterKeyInfo = {
  ok: boolean;
  label?: string;
  /** Account balance in USD (credits bought minus used), null if unknown. */
  balance?: number | null;
  error?: string;
};

/** Asks OpenRouter whether a key is valid (no model call, no cost). */
export async function checkOpenRouterKey(key: string): Promise<OpenRouterKeyInfo> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = (await res.json().catch(() => ({}))) as {
      data?: { label?: string };
      error?: { message?: string };
    };
    if (!res.ok) return { ok: false, error: j.error?.message || `HTTP ${res.status}` };
    // The key's own spending limit is not what runs out: the account balance
    // is (calls fail with 402 when it's too low), so report that.
    let balance: number | null = null;
    const cr = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => null);
    if (cr?.ok) {
      const c = (await cr.json().catch(() => ({}))) as { data?: { total_credits?: number; total_usage?: number } };
      if (typeof c.data?.total_credits === 'number' && typeof c.data?.total_usage === 'number') {
        balance = Math.max(0, c.data.total_credits - c.data.total_usage);
      }
    }
    return { ok: true, label: j.data?.label, balance };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function saveOpenRouterKey(key: string): Promise<void> {
  const supabase = createServiceClient();
  const row = {
    access_token: encrypt(key),
    metadata: { last4: key.slice(-4) },
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase
    .from('integrations').select('id').eq('provider', PROVIDER).maybeSingle();
  const { error } = existing
    ? await supabase.from('integrations').update(row).eq('id', existing.id)
    : await supabase.from('integrations').insert({ provider: PROVIDER, ...row });
  if (error) throw new Error(error.message);
  cache = null;
}

/** What the admin may see: where the active key comes from and its last 4. */
export async function openRouterKeyStatus(): Promise<{
  source: 'admin' | 'env' | null;
  last4: string | null;
}> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('integrations')
    .select('access_token, metadata')
    .eq('provider', PROVIDER)
    .maybeSingle();
  if (data?.access_token && decrypt(data.access_token)) {
    return { source: 'admin', last4: (data.metadata as { last4?: string } | null)?.last4 ?? null };
  }
  const env = process.env.OPENROUTER_API_KEY;
  return env ? { source: 'env', last4: env.slice(-4) } : { source: null, last4: null };
}
