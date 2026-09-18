/**
 * POST /api/admin/blog/image  (admin) — upload a cover photo for a journal
 * article. The file goes through the shared optimiser (WebP, longest side
 * 2000 px: the post hero is full-bleed) into the public `home-content` bucket,
 * and the public URL is returned for the editor's cover field.
 *
 * Body: multipart/form-data with `file`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import { optimiseUpload } from '@/lib/image-optimize';

export const runtime = 'nodejs';

const BUCKET = 'home-content';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });
  if (!/^image\//i.test(file.type)) {
    return NextResponse.json({ error: 'Serve un file immagine (JPG, PNG, WebP)' }, { status: 400 });
  }

  const optimised = await optimiseUpload(file, { maxDimension: 2000 });
  const storagePath = `blog/${crypto.randomUUID()}.${optimised.ext}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, optimised.buffer, { contentType: optimised.contentType, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  await logAdminAction(auth.userId, 'upload_blog_cover', 'blog_post', storagePath, {
    filename: file.name,
  });
  return NextResponse.json({ ok: true, url: publicUrl });
}
