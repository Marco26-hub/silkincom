/**
 * Server-side proxy for admin image downloads.
 *
 * Browser fetch() against a cross-origin image (Wix CDN, Pinterest, etc.)
 * fails when the source server omits Access-Control-Allow-Origin. The
 * admin gallery's "download original" button then silently does nothing,
 * because the catch path can't pop a useful alert before the request even
 * leaves CORS preflight.
 *
 * This route accepts the same URL via query string, fetches it server-side
 * (no CORS), and streams the bytes back with a Content-Disposition header.
 * The client just navigates to the proxy URL — no fetch, no blob, no race.
 *
 * Auth: admin / super_admin / editor only.
 *
 * Allowlist: we only proxy from hostnames we already trust elsewhere in
 * next.config.js → images.remotePatterns. Open-ended URL fetching would
 * turn this endpoint into an SSRF vector.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALLOWED_HOSTS = new Set([
  'static.wixstatic.com',
  'images.unsplash.com',
  'images.pexels.com',
]);
const ALLOWED_HOST_SUFFIXES = [
  '.supabase.co',
  'silkincom.com',
];

function isAllowedHost(host: string): boolean {
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

async function requireEditor() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin', 'editor'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'image';
  if (!url) return NextResponse.json({ error: 'url richiesto' }, { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: 'url non valido' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(target.protocol)) {
    return NextResponse.json({ error: 'protocollo non valido' }, { status: 400 });
  }
  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: `host non autorizzato: ${target.hostname}` }, { status: 400 });
  }

  const res = await fetch(target.toString(), { redirect: 'follow' });
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: `Origin returned HTTP ${res.status}` }, { status: 502 });
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  // Sanitise filename — strip path separators and control chars.
  const safeName = filename.replace(/[/\\\x00-\x1f]/g, '_').slice(0, 200) || 'image';

  return new Response(res.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
