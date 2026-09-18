/**
 * Admin — OpenRouter API key used by every AI feature (blog drafts and
 * translations, product/Etsy translations, ad copy, UGC briefs).
 *
 *   GET  → { source, last4, valid, remaining }  (never the key itself)
 *   POST { key } → verifies the key with OpenRouter, then stores it encrypted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import {
  checkOpenRouterKey,
  getOpenRouterKey,
  openRouterKeyStatus,
  saveOpenRouterKey,
} from '@/lib/secrets/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const status = await openRouterKeyStatus();
  const key = await getOpenRouterKey();
  const check = key ? await checkOpenRouterKey(key) : { ok: false, error: 'Nessuna chiave' };
  return NextResponse.json({
    ...status,
    valid: check.ok,
    remaining: check.ok ? check.remaining ?? null : null,
    error: check.ok ? null : check.error,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = String(body.key ?? '').trim();
  if (!/^sk-or-[A-Za-z0-9_-]{20,}$/.test(key)) {
    return NextResponse.json({ error: 'Non sembra una chiave OpenRouter (inizia con sk-or-)' }, { status: 400 });
  }

  const check = await checkOpenRouterKey(key);
  if (!check.ok) {
    return NextResponse.json({ error: `OpenRouter rifiuta la chiave: ${check.error}` }, { status: 400 });
  }

  await saveOpenRouterKey(key);
  await logAdminAction(auth.userId, 'update', 'integration', 'openrouter', { last4: key.slice(-4) });
  return NextResponse.json({ ok: true, last4: key.slice(-4), remaining: check.remaining ?? null });
}
