/**
 * POST /api/admin/recesso/instructions  (admin)
 *
 * Sends the return-instructions email to the customer for a withdrawal and moves
 * it to 'processing'. Body: { withdrawalId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { sendWithdrawalInstructionsEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  const { data: profile } = await auth
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin', 'order_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body?.withdrawalId || '');
  if (!id) return NextResponse.json({ error: 'withdrawalId richiesto' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: w } = await supabase
    .from('withdrawals')
    .select('id, customer_email, customer_name, order_number, withdrawal_number, locale')
    .eq('id', id)
    .single();
  if (!w) return NextResponse.json({ error: 'Recesso non trovato' }, { status: 404 });

  try {
    await sendWithdrawalInstructionsEmail({
      customerEmail: w.customer_email,
      customerName: w.customer_name,
      orderNumber: w.order_number,
      withdrawalNumber: w.withdrawal_number,
      locale: w.locale,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }

  await supabase
    .from('withdrawals')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
