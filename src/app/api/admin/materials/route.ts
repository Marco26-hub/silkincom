import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { name, code, description, origin, characteristics, benefits, image_url, display_order, seo_title, seo_description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 });
    }

    const insert = {
      name: String(name).trim(),
      code: code ? String(code).trim() : null,
      description: description || null,
      origin: origin || null,
      characteristics: characteristics || null,
      benefits: benefits || null,
      image_url: image_url || null,
      display_order: display_order === '' || display_order == null ? null : Number(display_order),
      seo_title: seo_title || null,
      seo_description: seo_description || null,
    };

    const supabase = createServiceClient();
    const { data, error } = await supabase.from('materials').insert(insert).select().single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create_material', 'material', data.id, insert);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
