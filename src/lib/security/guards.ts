import { createHash, timingSafeEqual } from 'node:crypto';

export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(provided), hash(expected));
}

/** Client-supplied scheduling headers never establish authorization. */
export function cronAuthorized(headers: Headers, secret = process.env.CRON_SECRET): boolean {
  const auth = headers.get('authorization');
  return secretMatches(auth?.startsWith('Bearer ') ? auth.slice(7) : null, secret);
}

export function safeInternalPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const origin = 'https://www.silkincom.com';
    return new URL(value, origin).origin === origin ? value : null;
  } catch { return null; }
}

const IMAGE_HOSTS = new Set(['static.wixstatic.com', 'images.unsplash.com', 'images.pexels.com']);
export function trustedImageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const host = url.hostname;
    if (IMAGE_HOSTS.has(host) || host === 'silkincom.com' || host.endsWith('.silkincom.com') || host.endsWith('.supabase.co')) return url;
    return null;
  } catch { return null; }
}
