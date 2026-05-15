/**
 * Admin: approve/reject pending review.
 * PATCH /api/admin/reviews/[id]  body: { action: 'approve' | 'reject' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['admin', 'super_admin', 'editor', 'order_manager'];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Check admin
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { data: profile } = await auth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const action = body?.action;
  if (!['approve', 'reject', 'reply'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (action === 'approve') {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('approve failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (action === 'reply') {
    const adminReply = String(body?.admin_reply || '').trim().slice(0, 1000);
    const { error } = await supabase
      .from('reviews')
      .update({ admin_reply: adminReply || null, admin_replied_at: adminReply ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) {
      console.error('reply failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Hard delete on reject
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      console.error('reject failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, action });
}
