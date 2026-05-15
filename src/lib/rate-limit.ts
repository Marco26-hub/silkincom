import { NextRequest, NextResponse } from 'next/server';

type Entry = { count: number; reset: number };
const store = new Map<string, Entry>();

export function rateLimit(req: NextRequest, limit = 5, windowMs = 60_000): NextResponse | null {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const key = `${req.nextUrl.pathname}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return null;
  }

  if (entry.count >= limit) {
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra un minuto.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  entry.count++;
  return null;
}
