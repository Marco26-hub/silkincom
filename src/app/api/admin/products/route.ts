import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import { revalidateCatalog } from '@/lib/revalidate';

const EDITOR_ROLES = ['admin', 'super_admin', 'editor'];

async function requireEditor() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !EDITOR_ROLES.includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const, userId: user.id };
}

export async function POST(req: NextRequest) {
  const auth = await requireEditor();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  const allowed = [
    'name', 'slug', 'sku', 'price', 'compare_at_price',
    'description_short', 'description_long', 'composition', 'dimensions', 'care_instructions',
    'status', 'is_featured', 'is_bestseller', 'is_limited_edition',
    'seo_title', 'seo_description',
    'category_id', 'collection_id', 'composition_id', 'size_id', 'color_id',
  ];

  const insert: Record<string, unknown> = {};
  for (const k of allowed) if (k in body && body[k] !== '' && body[k] !== null) insert[k] = body[k];

  if (!insert.name || !insert.slug || !insert.sku || !insert.price) {
    return NextResponse.json({ error: 'Nome, slug, SKU e prezzo obbligatori' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('products')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug o SKU già esistente' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create default inventory record (0 units)
  await supabase.from('inventory').insert({
    product_id: data.id,
    quantity_available: 0,
    quantity_reserved: 0,
  });

  await logAdminAction(auth.userId, 'create_product', 'product', data.id, insert);

  revalidateCatalog();

  return NextResponse.json({ id: data.id }, { status: 201 });
}
