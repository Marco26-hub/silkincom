import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateStaticPages } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';

export const runtime = 'nodejs';

const BUCKET = 'home-content';
const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

/** Upload a new image and append it to the page's `images` array. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { key } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: current } = await supabase
    .from('static_pages')
    .select('images')
    .eq('page_key', key)
    .single();
  if (!current) return NextResponse.json({ error: 'Pagina non trovata' }, { status: 404 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `pages/${key}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const newImage = { url: publicUrl, storage_path: storagePath, alt_i18n: {} };

  type Img = { url: string; storage_path: string; alt_i18n: Record<string, string> };
  const images: Img[] = Array.isArray(current.images) ? current.images : [];
  images.push(newImage);

  const { error: updErr } = await supabase
    .from('static_pages')
    .update({ images })
    .eq('page_key', key);
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'upload_static_page_image', 'static_page', key, { storage_path: storagePath });
  revalidateStaticPages(key);
  return NextResponse.json({ ok: true, image: newImage });
}
