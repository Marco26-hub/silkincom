import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import {
  generateProductDraftFromPhotos,
  productFromPhotosInputSchema,
} from '@/lib/automation/content-engine';
import { requireAutomationKey } from '@/lib/automation/guards';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = productFromPhotosInputSchema.extend({
  persist: z.boolean().default(true),
  initialStock: z.number().int().nonnegative().default(0),
});

function inferExtension(file: File) {
  const type = file.type.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('heic')) return 'heic';
  return 'jpg';
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
}

async function ensureUniqueSlug(baseSlug: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .like('slug', `${baseSlug}%`);

  if (error || !data?.length) return baseSlug;

  const suffix = data.length + 1;
  return `${baseSlug}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const authError = requireAutomationKey(req);
  if (authError) return authError;

  try {
    const contentType = req.headers.get('content-type') || '';
    let payload: z.infer<typeof requestSchema>;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      files = form
        .getAll('photos')
        .filter((v): v is File => v instanceof File && v.size > 0);

      payload = requestSchema.parse({
        notes: (form.get('notes') || '').toString(),
        productNameHint: (form.get('productNameHint') || '').toString() || undefined,
        priceHint: form.get('priceHint') ? Number(form.get('priceHint')) : undefined,
        imageUrls: form.getAll('imageUrls').map((v) => v.toString()).filter(Boolean),
        imageDataUrls: [],
        persist: (form.get('persist') || 'true').toString() !== 'false',
        initialStock: Number(form.get('initialStock') || 0),
      });
    } else {
      const body = await req.json();
      payload = requestSchema.parse(body);
    }

    const imageDataUrls = payload.imageDataUrls.length
      ? payload.imageDataUrls
      : await Promise.all(files.slice(0, 6).map(fileToDataUrl));

    const draft = await generateProductDraftFromPhotos({
      ...payload,
      imageDataUrls,
    });

    const warnings: string[] = [];
    let persisted: {
      productId: string;
      slug: string;
      imageUrls: string[];
    } | null = null;

    if (payload.persist && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();
      const slug = await ensureUniqueSlug(slugify(draft.slug || draft.name));
      const sku = draft.sku || `AI-${Date.now().toString().slice(-6)}`;
      const price = Number(payload.priceHint || draft.price);

      const uploadedImageUrls: string[] = [];
      if (files.length) {
        const bucket = process.env.SUPABASE_PRODUCT_UPLOAD_BUCKET || 'product-media';

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const ext = inferExtension(file);
          const path = `ai-import/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${i}.${ext}`;
          const bytes = Buffer.from(await file.arrayBuffer());

          const upload = await supabase.storage
            .from(bucket)
            .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });

          if (upload.error) {
            warnings.push(`Image upload skipped (${file.name}): ${upload.error.message}`);
            continue;
          }

          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          if (data?.publicUrl) uploadedImageUrls.push(data.publicUrl);
        }
      }

      const imageUrls = uploadedImageUrls.length ? uploadedImageUrls : payload.imageUrls;

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: draft.name,
          slug,
          sku,
          description_short: draft.descriptionShort,
          description_long: draft.descriptionLong,
          price,
          composition: draft.composition,
          dimensions: draft.dimensions || null,
          care_instructions: draft.careInstructions,
          origin: draft.origin,
          status: 'draft',
          seo_title: draft.name,
          seo_description: draft.descriptionShort,
        })
        .select('id, slug')
        .single();

      if (productError || !product) {
        warnings.push(`Product DB insert skipped: ${productError?.message || 'Unknown DB error'}`);
      } else {
        if (imageUrls.length) {
          const imagesRows = imageUrls.map((url, index) => ({
            product_id: product.id,
            image_url: url,
            alt_text: `${draft.name} - immagine ${index + 1}`,
            display_order: index,
            is_primary: index === draft.imageLayout.heroImageIndex,
          }));
          const { error: imagesError } = await supabase.from('product_images').insert(imagesRows);
          if (imagesError) {
            warnings.push(`Product images insert skipped: ${imagesError.message}`);
          }
        }

        const { error: inventoryError } = await supabase.from('inventory').insert({
          product_id: product.id,
          quantity_total: payload.initialStock,
          quantity_available: payload.initialStock,
          quantity_reserved: 0,
        });
        if (inventoryError) {
          warnings.push(`Inventory insert skipped: ${inventoryError.message}`);
        }

        persisted = {
          productId: product.id,
          slug: product.slug,
          imageUrls,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      draft,
      persisted,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
