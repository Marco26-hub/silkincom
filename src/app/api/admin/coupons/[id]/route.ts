import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

async function checkAdmin(requiredRoles = ['admin', 'super_admin']) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !requiredRoles.includes(profile.role)) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ['code', 'discount_type', 'discount_value', 'valid_from', 'valid_until', 'max_uses', 'max_uses_per_customer', 'minimum_order_amount', 'is_active'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if (updates.code) updates.code = updates.code.toUpperCase().trim();
  if ('discount_value' in updates) updates.discount_value = Number(updates.discount_value);
  if ('max_uses' in updates) updates.max_uses = updates.max_uses ? Number(updates.max_uses) : null;
  if ('minimum_order_amount' in updates) updates.minimum_order_amount = updates.minimum_order_amount ? Number(updates.minimum_order_amount) : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from('coupons').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
