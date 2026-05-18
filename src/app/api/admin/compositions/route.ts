import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('compositions')
    .insert({ name: String(name).trim() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Già esistente' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
