/**
 * Blotato REST client (server-only).
 *
 * Read-only: the admin "Social" dashboard pulls the publishing activity
 * (scheduled / published / failed posts + connected accounts) that Blotato
 * already tracks. Blotato is a PUBLISHING tool — it does NOT expose engagement
 * metrics (followers, reach, likes, views), so this client is limited to
 * publishing state, not analytics.
 *
 * Env:
 *   BLOTATO_API_KEY — from my.blotato.com settings. Without it the dashboard
 *   renders a "non configurato" state instead of throwing.
 *
 * API ref: https://help.blotato.com/api
 *   GET https://backend.blotato.com/v2/posts
 *   GET https://backend.blotato.com/v2/users/me/accounts
 *   auth header: `blotato-api-key: <key>`
 */

const BASE = 'https://backend.blotato.com/v2';

export type BlotatoPlatform =
  | 'twitter' | 'instagram' | 'linkedin' | 'facebook' | 'tiktok'
  | 'pinterest' | 'threads' | 'bluesky' | 'youtube';

export type BlotatoPostState =
  | { type: 'scheduled' }
  | { type: 'published'; postUrl?: string }
  | { type: 'failed'; errorMessage?: string };

export type BlotatoPost = {
  id: string;
  platform: BlotatoPlatform;
  text: string;
  mediaUrls: string[];
  postTime: string; // ISO 8601
  state: BlotatoPostState;
};

export type BlotatoAccount = {
  id: string;
  platform: BlotatoPlatform;
  fullname?: string;
  username?: string;
  subaccounts?: { accountId: string; id: string; name: string }[];
};

export class BlotatoNotConfiguredError extends Error {
  constructor() {
    super('BLOTATO_API_KEY non configurato');
    this.name = 'BlotatoNotConfiguredError';
  }
}

export function isBlotatoConfigured(): boolean {
  return !!process.env.BLOTATO_API_KEY?.trim();
}

async function blotatoFetch<T>(path: string): Promise<T> {
  const key = process.env.BLOTATO_API_KEY?.trim();
  if (!key) throw new BlotatoNotConfiguredError();

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'blotato-api-key': key },
    // Publishing data changes through the day; never serve it stale.
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Blotato API ${res.status}: ${body.slice(0, 300) || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function listBlotatoAccounts(): Promise<BlotatoAccount[]> {
  const data = await blotatoFetch<BlotatoAccount[] | { items: BlotatoAccount[] }>(
    '/users/me/accounts',
  );
  return Array.isArray(data) ? data : data.items ?? [];
}

/**
 * Fetch posts, following the cursor up to `maxPages` so the dashboard sees the
 * full recent window rather than just the first page.
 */
export async function listBlotatoPosts(opts: {
  status?: ('scheduled' | 'published' | 'failed')[];
  platform?: BlotatoPlatform[];
  limit?: number;
  maxPages?: number;
} = {}): Promise<BlotatoPost[]> {
  const limit = opts.limit ?? 250;
  const maxPages = opts.maxPages ?? 2;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  for (const s of opts.status ?? []) params.append('status', s);
  for (const p of opts.platform ?? []) params.append('platform', p);

  const all: BlotatoPost[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams(params);
    if (cursor) qs.set('cursor', cursor);
    const data = await blotatoFetch<{ items: BlotatoPost[]; cursor?: string }>(`/posts?${qs}`);
    all.push(...(data.items ?? []));
    if (!data.cursor || (data.items?.length ?? 0) < limit) break;
    cursor = data.cursor;
  }
  return all;
}
