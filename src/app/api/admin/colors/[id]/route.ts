import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const allowed = ['name', 'hex_code', 'image_url', 'display_order'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if ('name' in updates) updates.name = String(updates.name).trim();
  if ('hex_code' in updates) updates.hex_code = String(updates.hex_code).trim();
  if ('image_url' in updates) updates.image_url = updates.image_url || null;
  if ('display_order' in updates) updates.display_order = updates.display_order === '' || updates.display_order == null ? null : Number(updates.display_order);

  const supabase = createServiceClient();
  const { error } = await supabase.from('colors').update(updates).eq('id', id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'update_color', 'color', id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('colors').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete_color', 'color', id, {});
  return NextResponse.json({ ok: true });
}
