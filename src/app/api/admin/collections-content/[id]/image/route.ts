import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateCollections } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { optimiseUpload } from '@/lib/image-optimize';

export const runtime = 'nodejs';

const BUCKET = 'collections';
const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from('collections')
    .select('slug, storage_path')
    .eq('id', id)
    .single();
  if (!current) return NextResponse.json({ error: 'Collezione non trovata' }, { status: 404 });

  const optimised = await optimiseUpload(file);
  const storagePath = `${current.slug}-${Date.now()}.${optimised.ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, optimised.buffer, { contentType: optimised.contentType, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Remove the previous Storage object (skip legacy markers).
  if (current.storage_path && !current.storage_path.startsWith('legacy:')) {
    await supabase.storage.from(BUCKET).remove([current.storage_path]);
  }

  const { error: updErr } = await supabase
    .from('collections')
    .update({ image_url: publicUrl, storage_path: storagePath })
    .eq('id', id);
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'upload_collection_image', 'collection', id, { storage_path: storagePath });
  revalidateCollections();

  return NextResponse.json({ ok: true, image_url: publicUrl, storage_path: storagePath });
}
