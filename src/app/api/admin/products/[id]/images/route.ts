import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

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
  const altText = formData.get('alt_text') as string || '';

  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${id}/${Date.now()}.${ext}`;

  const supabase = createServiceClient();

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);

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

  return NextResponse.json({ ok: true, image: img });
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

  return NextResponse.json({ ok: true });
}
