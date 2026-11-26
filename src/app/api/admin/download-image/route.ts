import { trustedImageUrl } from '@/lib/security/guards';
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

  const initialTarget = trustedImageUrl(url);
  if (!initialTarget) return NextResponse.json({ error: 'URL immagine non autorizzato' }, { status: 400 });
  let target: URL = initialTarget;
  let res: Response | undefined;
  for (let redirects = 0; redirects <= 3; redirects++) {
    res = await fetch(target.toString(), { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    if (res.status < 300 || res.status >= 400) break;
    const location: string | null = res.headers.get('location');
    const next: URL | null = location ? trustedImageUrl(new URL(location, target).toString()) : null;
    await res.body?.cancel();
    if (!next || redirects === 3) {
      console.info('[image-download] Redirect refused: untrusted destination or redirect limit.');
      return NextResponse.json({ error: 'Redirect immagine non autorizzato' }, { status: 400 });
    }
    target = next;
  }
  if (!res) return NextResponse.json({ error: 'Immagine non disponibile' }, { status: 502 });
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: `Origin returned HTTP ${res.status}` }, { status: 502 });
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  if (!contentType.toLowerCase().startsWith('image/')) {
    await res.body.cancel();
    return NextResponse.json({ error: 'La risorsa non è un’immagine' }, { status: 400 });
  }
  // Sanitise filename — strip path separators and control chars.
  const safeName = filename.replace(/[/\\"\x00-\x1f]/g, '_').slice(0, 200) || 'image';

  return new Response(res.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
