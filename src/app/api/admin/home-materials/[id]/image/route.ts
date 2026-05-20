import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeMaterials } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';

export const runtime = 'nodejs';

const BUCKET = 'home-content';
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
    .from('materials')
    .select('slug, storage_path')
    .eq('id', id)
    .single();
  if (!current) return NextResponse.json({ error: 'Materiale non trovato' }, { status: 404 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `materials/${current.slug || id}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  if (current.storage_path && !current.storage_path.startsWith('legacy:')) {
    await supabase.storage.from(BUCKET).remove([current.storage_path]);
  }

  const { error: updErr } = await supabase
    .from('materials')
    .update({ image_url: publicUrl, storage_path: storagePath })
    .eq('id', id);
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'upload_home_material_image', 'material', id, { storage_path: storagePath });
  revalidateHomeMaterials();

  return NextResponse.json({ ok: true, image_url: publicUrl, storage_path: storagePath });
}
