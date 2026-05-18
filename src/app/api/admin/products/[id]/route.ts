import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

const EDITOR_ROLES = ['admin', 'super_admin', 'editor'];

async function requireEditor() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !EDITOR_ROLES.includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const, userId: user.id };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();

  const allowed = [
    'name', 'slug', 'sku', 'price', 'compare_at_price',
    'description_short', 'description_long', 'composition', 'dimensions', 'care_instructions',
    'status', 'is_featured', 'is_bestseller', 'is_limited_edition',
    'seo_title', 'seo_description',
    'category_id', 'collection_id',
    'composition_id', 'size_id', 'color_id',
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];

  const supabase = createServiceClient();
  const { error } = await supabase.from('products').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_product', 'product', id, update);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('products').update({ status: 'archived' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'archive_product', 'product', id, { status: 'archived' });

  return NextResponse.json({ ok: true });
}
