/**
 * First-party analytics ingest. The client beacon POSTs one event per
 * pageview / funnel step. We never store an IP or full referrer URL — only
 * the referrer host, the edge-derived country, and an anonymous session id
 * the client keeps in sessionStorage (no persistent cookie). That keeps the
 * dataset aggregate + non-identifying, so it doesn't require a consent gate.
 *
 * Writes go through the service-role client (the table has no public INSERT
 * policy). The endpoint is intentionally permissive on input but clamps every
 * field to a safe length / enum before insert.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const EVENT_TYPES = new Set([
  'pageview', 'product_view', 'add_to_cart', 'begin_checkout', 'purchase', 'search',
]);

function deviceFromUA(ua: string): 'mobile' | 'tablet' | 'desktop' {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(s)) return 'mobile';
  return 'desktop';
}

function hostFromReferrer(ref: string | undefined, selfHost: string): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '');
    // Drop same-site referrers — they're internal navigation, not a source.
    if (h === selfHost.replace(/^www\./, '')) return null;
    return h.slice(0, 120);
  } catch {
    return null;
  }
}

const clamp = (v: unknown, n: number): string | null =>
  typeof v === 'string' && v.length ? v.slice(0, n) : null;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = String(body.type ?? 'pageview');
  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ ok: false, error: 'bad type' }, { status: 400 });
  }

  const sessionId = clamp(body.sid, 64);
  const path = clamp(body.path, 300);
  if (!sessionId || !path) {
    return NextResponse.json({ ok: false, error: 'missing sid/path' }, { status: 400 });
  }

  const ua = req.headers.get('user-agent') ?? '';
  const selfHost = req.headers.get('host') ?? 'silkincom.com';
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    null;

  const value =
    eventType === 'purchase' && typeof body.value === 'number' && isFinite(body.value)
      ? Math.max(0, Math.min(1_000_000, body.value))
      : null;

  const row = {
    session_id: sessionId,
    event_type: eventType,
    path,
    referrer_host: hostFromReferrer(clamp(body.ref, 500) ?? undefined, selfHost),
    locale: clamp(body.locale, 8),
    country: country ? country.slice(0, 2).toUpperCase() : null,
    device: deviceFromUA(ua),
    product_slug: clamp(body.product, 120),
    value,
    // Campaign attribution from the landing URL (sticky per session via the
    // beacon) — lets us attribute the whole funnel, incl. purchase, to a source.
    utm_source: clamp(body.utm_source, 64),
    utm_medium: clamp(body.utm_medium, 64),
    utm_campaign: clamp(body.utm_campaign, 120),
  };

  const supabase = createServiceClient();
  const { error } = await supabase.from('analytics_events').insert(row);
  if (error) {
    // Swallow — analytics must never break navigation. Logged for debugging.
    console.error('analytics insert failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}
