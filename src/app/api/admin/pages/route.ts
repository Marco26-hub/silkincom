import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { title, slug, content, meta_title, meta_description, is_published } = body;

    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Titolo, slug e contenuto richiesti' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const insert = {
      title: title.trim(),
      slug: slug.toLowerCase().trim(),
      content,
      meta_title: meta_title?.trim() || null,
      meta_description: meta_description?.trim() || null,
      is_published: is_published ?? false,
    };

    const { data, error } = await supabase
      .from('pages')
      .insert(insert)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Slug già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create_page', 'page', data.id, insert);

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
