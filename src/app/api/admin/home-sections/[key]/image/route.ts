import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeSections } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';

export const runtime = 'nodejs';

const BUCKET = 'home-content';
const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

/**
 * POST = upload nuova immagine. Se `index` query, sostituisce la N-esima
 * voce dell'array `images`; altrimenti la append in coda.
 * DELETE = rimuove la voce all'indice `index`.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { key } = await params;
  const url = new URL(req.url);
  const indexParam = url.searchParams.get('index');
  const replaceIndex = indexParam != null ? parseInt(indexParam, 10) : -1;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from('home_sections')
    .select('id, images')
    .eq('section_key', key)
    .single();
  if (!current) return NextResponse.json({ error: 'Sezione non trovata' }, { status: 404 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${key}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const newImage = { url: publicUrl, storage_path: storagePath, alt_i18n: {} as Record<string, string> };

  type Img = { url: string; storage_path: string; alt_i18n: Record<string, string> };
  const images: Img[] = Array.isArray(current.images) ? current.images : [];

  if (replaceIndex >= 0 && replaceIndex < images.length) {
    const old = images[replaceIndex];
    if (old?.storage_path && !old.storage_path.startsWith('legacy:')) {
      await supabase.storage.from(BUCKET).remove([old.storage_path]);
    }
    images[replaceIndex] = newImage;
  } else {
    images.push(newImage);
  }

  const { error: updErr } = await supabase
    .from('home_sections')
    .update({ images })
    .eq('section_key', key);
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'upload_home_section_image', 'home_section', key, { index: replaceIndex >= 0 ? replaceIndex : images.length - 1, storage_path: storagePath });
  revalidateHomeSections(key);
  return NextResponse.json({ ok: true, image: newImage, images });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { key } = await params;
  const url = new URL(req.url);
  const indexParam = url.searchParams.get('index');
  if (indexParam == null) return NextResponse.json({ error: 'index richiesto' }, { status: 400 });
  const index = parseInt(indexParam, 10);

  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from('home_sections')
    .select('id, images')
    .eq('section_key', key)
    .single();
  if (!current) return NextResponse.json({ error: 'Sezione non trovata' }, { status: 404 });

  type Img = { url: string; storage_path: string; alt_i18n: Record<string, string> };
  const images: Img[] = Array.isArray(current.images) ? current.images : [];
  if (index < 0 || index >= images.length) return NextResponse.json({ error: 'index fuori range' }, { status: 400 });

  const removed = images.splice(index, 1)[0];
  if (removed?.storage_path && !removed.storage_path.startsWith('legacy:')) {
    await supabase.storage.from(BUCKET).remove([removed.storage_path]);
  }

  const { error: updErr } = await supabase
    .from('home_sections')
    .update({ images })
    .eq('section_key', key);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete_home_section_image', 'home_section', key, { index, storage_path: removed?.storage_path });
  revalidateHomeSections(key);
  return NextResponse.json({ ok: true, images });
}
