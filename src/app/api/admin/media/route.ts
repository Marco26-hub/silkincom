import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('media_library')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ media: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const altText = (formData.get('alt_text') as string) || '';

  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${safeName}`;

  const supabase = createServiceClient();

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);

  const { data: media, error: dbError } = await supabase
    .from('media_library')
    .insert({
      filename: file.name,
      storage_path: path,
      url: publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: auth.userId,
      alt_text: altText,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await logAdminAction(auth.userId, 'create', 'media', media.id, {
    filename: file.name,
    storage_path: path,
  });

  return NextResponse.json({ ok: true, media });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: media } = await supabase
    .from('media_library')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (media?.storage_path) {
    await supabase.storage.from('media').remove([media.storage_path]);
  }

  const { error } = await supabase.from('media_library').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete', 'media', id, {});

  return NextResponse.json({ ok: true });
}
