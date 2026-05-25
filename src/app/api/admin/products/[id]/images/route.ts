import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { revalidateCatalog } from '@/lib/revalidate';
import { optimiseUpload } from '@/lib/image-optimize';

export const runtime = 'nodejs';

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin', 'editor'].includes(profile.role)) return null;
  return user;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', id)
    .order('display_order', { ascending: true });

  return NextResponse.json({ images: data || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const altText = (formData.get('alt_text') as string) || '';
  // When present, swap the file of an existing image instead of adding a new one.
  const replaceId = (formData.get('replaceId') as string) || '';

  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });

  const optimised = await optimiseUpload(file);
  const path = `${id}/${Date.now()}.${optimised.ext}`;

  const supabase = createServiceClient();

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, optimised.buffer, { contentType: optimised.contentType, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);

  // ----- Replace mode: update the existing row, drop the old storage object -----
  if (replaceId) {
    const { data: old } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('id', replaceId)
      .eq('product_id', id)
      .single();
    if (!old) {
      await supabase.storage.from('product-images').remove([path]);
      return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 });
    }
    const { data: img, error: updErr } = await supabase
      .from('product_images')
      .update({ image_url: publicUrl })
      .eq('id', replaceId)
      .eq('product_id', id)
      .select()
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    const oldParts = old.image_url?.split('/product-images/');
    if (oldParts?.[1]) await supabase.storage.from('product-images').remove([oldParts[1]]);
    revalidateCatalog();
    return NextResponse.json({ ok: true, image: img });
  }

  // ----- Add mode -----
  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  const isPrimary = (count || 0) === 0;

  const { data: img, error: dbError } = await supabase
    .from('product_images')
    .insert({
      product_id: id,
      image_url: publicUrl,
      alt_text: altText,
      display_order: (count || 0) + 1,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  revalidateCatalog();

  return NextResponse.json({ ok: true, image: img });
}

// Reorder images. The client sends the full ordered id list; display_order is
// rewritten 1..n and the first image becomes the primary.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const orderedIds: unknown = body?.orderedIds;

  if (!Array.isArray(orderedIds) || orderedIds.some((x) => typeof x !== 'string')) {
    return NextResponse.json({ error: 'orderedIds non valido' }, { status: 400 });
  }

  const supabase = createServiceClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('product_images')
      .update({ display_order: i + 1, is_primary: i === 0 })
      .eq('id', orderedIds[i] as string)
      .eq('product_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateCatalog();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { imageId } = await req.json();
  if (!imageId) return NextResponse.json({ error: 'imageId richiesto' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: img } = await supabase.from('product_images').select('image_url').eq('id', imageId).single();
  if (img?.image_url) {
    const urlParts = img.image_url.split('/product-images/');
    if (urlParts[1]) {
      await supabase.storage.from('product-images').remove([urlParts[1]]);
    }
  }

  await supabase.from('product_images').delete().eq('id', imageId).eq('product_id', id);

  revalidateCatalog();

  return NextResponse.json({ ok: true });
}
