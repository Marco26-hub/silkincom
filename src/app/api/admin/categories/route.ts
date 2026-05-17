import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { name, slug, description, parent_id, display_order, is_active, seo_title, seo_description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nome e slug richiesti' }, { status: 400 });
    }

    const insert = {
      name: String(name).trim(),
      slug: String(slug).toLowerCase().trim(),
      description: description || null,
      parent_id: parent_id || null,
      display_order: display_order === '' || display_order == null ? null : Number(display_order),
      is_active: is_active ?? true,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
    };

    const supabase = createServiceClient();
    const { data, error } = await supabase.from('categories').insert(insert).select().single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create_category', 'category', data.id, insert);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
