import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import { optimiseUpload } from '@/lib/image-optimize';
import { revalidateCatalog } from '@/lib/revalidate';
import { LEAD_OUTREACH_PRODUCT_SLUGS } from '@/lib/lead-discovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Carica una foto dal pannello Lead B2B e la salva nel catalogo.
 *
 * Esiste già `/api/admin/products/[id]/images`, ma lavora per id prodotto,
 * mentre qui si ragiona per slug (il pannello outreach conosce solo quelli).
 * La foto finisce in `product_images`, quindi resta anche dopo la campagna:
 * l'upload precedente viveva solo nello stato del componente e spariva al
 * primo reload, senza che nessuno lo notasse.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const slug = ((formData.get('slug') as string) || '').trim();
  const makePrimary = (formData.get('makePrimary') as string) === 'true';

  if (!file) {
    return NextResponse.json({ error: 'File richiesto' }, { status: 400 });
  }
  // Solo i prodotti che l'outreach può mostrare: evita che questo endpoint
  // diventi una scorciatoia per scrivere immagini su un prodotto qualsiasi.
  if (!LEAD_OUTREACH_PRODUCT_SLUGS.includes(slug)) {
    return NextResponse.json(
      { error: `Slug non ammesso per l'outreach: ${slug || '(vuoto)'}` },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }
  if (!product) {
    return NextResponse.json(
      { error: `Prodotto "${slug}" non trovato a catalogo` },
      { status: 404 },
    );
  }

  const optimised = await optimiseUpload(file);
  const path = `${product.id}/${Date.now()}.${optimised.ext}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, optimised.buffer, {
      contentType: optimised.contentType,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(path);

  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', product.id);

  const existingCount = count || 0;
  // Prima foto del prodotto: diventa primaria comunque, altrimenti resterebbe
  // un prodotto senza immagine principale.
  const isPrimary = makePrimary || existingCount === 0;

  if (isPrimary) {
    const { error: demoteError } = await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', product.id);
    if (demoteError) {
      // Senza questo passaggio resterebbero due primarie e quale vince
      // dipenderebbe dall'ordinamento: meglio fermarsi e dirlo.
      await supabase.storage.from('product-images').remove([path]);
      return NextResponse.json({ error: demoteError.message }, { status: 500 });
    }
  }

  const { data: image, error: insertError } = await supabase
    .from('product_images')
    .insert({
      product_id: product.id,
      image_url: publicUrl,
      alt_text: `${product.name} — foto proposta B2B`,
      display_order: existingCount + 1,
      is_primary: isPrimary,
    })
    .select('id')
    .single();

  if (insertError) {
    await supabase.storage.from('product-images').remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  revalidateCatalog();

  await logAdminAction(
    auth.userId,
    'upload_lead_outreach_product_image',
    'product',
    product.id,
    { slug, imageId: image.id, isPrimary },
  );

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    imageId: image.id,
    isPrimary,
    savedToCatalog: true,
  });
}
