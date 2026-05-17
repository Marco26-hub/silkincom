import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const allowed = ['title', 'slug', 'content', 'meta_title', 'meta_description', 'is_published'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if ('title' in updates) updates.title = String(updates.title).trim();
  if ('slug' in updates) updates.slug = String(updates.slug).toLowerCase().trim();
  if ('meta_title' in updates) updates.meta_title = updates.meta_title?.trim() || null;
  if ('meta_description' in updates) updates.meta_description = updates.meta_description?.trim() || null;

  const supabase = createServiceClient();
  const { error } = await supabase.from('pages').update(updates).eq('id', id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Slug già esistente' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'update_page', 'page', id, updates);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('pages').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete_page', 'page', id, {});

  return NextResponse.json({ ok: true });
}
