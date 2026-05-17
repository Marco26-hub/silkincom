import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const allowed = ['name', 'slug', 'description', 'image_url', 'display_order', 'is_active', 'seo_title', 'seo_description'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if ('name' in updates) updates.name = String(updates.name).trim();
  if ('slug' in updates) updates.slug = String(updates.slug).toLowerCase().trim();
  if ('description' in updates) updates.description = updates.description || null;
  if ('image_url' in updates) updates.image_url = updates.image_url || null;
  if ('display_order' in updates) updates.display_order = updates.display_order === '' || updates.display_order == null ? null : Number(updates.display_order);
  if ('seo_title' in updates) updates.seo_title = updates.seo_title || null;
  if ('seo_description' in updates) updates.seo_description = updates.seo_description || null;

  const supabase = createServiceClient();
  const { error } = await supabase.from('collections').update(updates).eq('id', id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'update_collection', 'collection', id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete_collection', 'collection', id, {});
  return NextResponse.json({ ok: true });
}
