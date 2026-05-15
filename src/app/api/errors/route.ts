/**
 * Lightweight error capture endpoint.
 *
 * POST /api/errors
 * Body: { message, stack?, url?, level?, context? }
 *
 * Saves to public.error_logs (service role).
 * Rate-limited to prevent abuse / log flooding.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 30, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || '').slice(0, 500);
    const stack = body?.stack ? String(body.stack).slice(0, 4000) : null;
    const url = body?.url ? String(body.url).slice(0, 500) : null;
    const levelInput = body?.level;
    const level = ['error', 'warning', 'info'].includes(levelInput) ? levelInput : 'error';
    const context = typeof body?.context === 'object' ? body.context : null;

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const auth = await createServerClient();
      const { data: { user } } = await auth.auth.getUser();
      userId = user?.id || null;
    } catch {
      userId = null;
    }

    const supabase = createServiceClient();
    await supabase.from('error_logs').insert({
      level,
      message,
      stack,
      url,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
      user_id: userId,
      context,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error logger failed:', err);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
