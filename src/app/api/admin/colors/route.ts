import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { name, hex_code, image_url, display_order } = body;

    if (!name || !hex_code) {
      return NextResponse.json({ error: 'Nome e codice colore richiesti' }, { status: 400 });
    }

    const insert = {
      name: String(name).trim(),
      hex_code: String(hex_code).trim(),
      image_url: image_url || null,
      display_order: display_order === '' || display_order == null ? null : Number(display_order),
    };

    const supabase = createServiceClient();
    const { data, error } = await supabase.from('colors').insert(insert).select().single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Valore già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create_color', 'color', data.id, insert);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
