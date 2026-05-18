/**
 * GDPR Article 17 — Right to erasure ("right to be forgotten").
 * DELETE /api/account/delete
 *
 * Anonymizes personal data and deletes the auth account.
 * Orders are preserved (anonymized) for legal/fiscal retention obligations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { logAdminAction } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req, 2, 60_000);
  if (limited) return limited;

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const body = await req.json();
  const password = body?.password?.trim();
  if (!password) {
    return NextResponse.json({ error: 'Password richiesta' }, { status: 400 });
  }

  try {
    await auth.auth.signInWithPassword({ email: user.email || '', password });
  } catch (err: any) {
    return NextResponse.json({ error: 'Password non valida' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const uid = user.id;
  const anonEmail = `deleted-${uid.slice(0, 8)}@deleted.silkincom.com`;

  // Anonymize orders (legal retention: keep for 10 years per Italian law)
  await supabase
    .from('orders')
    .update({ customer_email: anonEmail, customer_id: null })
    .eq('customer_id', uid);

  // Delete personal data tables (cascade will handle children)
  await supabase.from('wishlist').delete().eq('customer_id', uid);
  await supabase.from('reviews').delete().eq('customer_id', uid);
  await supabase.from('customer_addresses').delete().eq('customer_id', uid);

  // Delete returns (linked via order_id, not customer_id)
  const { data: customerOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', uid);
  for (const order of customerOrders || []) {
    await supabase.from('returns').delete().eq('order_id', order.id);
  }

  await supabase.from('newsletter_subscribers').delete().eq('email', user.email || '');
  await supabase.from('email_lifecycle_jobs').delete().eq('recipient_email', user.email || '');
  await supabase.from('customers').delete().eq('id', uid);
  await supabase.from('profiles').delete().eq('id', uid);

  // Delete Supabase auth user (must be last)
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(uid);
  if (authDeleteError) {
    console.error('Auth user delete failed:', authDeleteError);
    return NextResponse.json({ error: 'Errore eliminazione account' }, { status: 500 });
  }

  // Log deletion action for audit trail
  await logAdminAction(uid, 'delete_account', 'account', uid, { anonymized: true });

  return NextResponse.json({ ok: true, message: 'Account eliminato' });
}
