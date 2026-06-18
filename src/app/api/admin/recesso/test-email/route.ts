/**
 * TEMP admin util — sends ONE right-of-withdrawal acknowledgement email with
 * dummy data to verify Resend delivery in production, WITHOUT creating any
 * order or withdrawal record. super_admin gated (session cookie). Remove after
 * the one-off test.
 *
 * POST /api/admin/recesso/test-email  body: { to?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendWithdrawalAcknowledgementEmail } from '@/lib/email';
import { buildDeclaration } from '@/lib/recesso';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const to = String(body?.to || user.email || '').trim();
  if (!to) return NextResponse.json({ error: 'to required' }, { status: 400 });

  const submittedAt = new Date();
  const orderNumber = 'TEST-RC-0001';
  const items = [{ name: 'Twilly Foulard Seta 100% Made in Como (TEST)', quantity: 1 }];
  const declaration = buildDeclaration('it', {
    orderNumber,
    name: 'Mario Rossi (TEST)',
    items,
  });

  try {
    const r = await sendWithdrawalAcknowledgementEmail({
      customerEmail: to,
      customerName: 'Mario Rossi (TEST)',
      orderNumber,
      withdrawalNumber: 'RC-TEST-0001',
      items,
      declaration,
      submittedAt,
    });
    return NextResponse.json({ ok: true, to, resend: (r as { data?: unknown })?.data ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
