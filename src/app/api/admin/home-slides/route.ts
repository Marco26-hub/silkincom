import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeSlides } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap } from '@/lib/translate';
import { optimiseUpload } from '@/lib/image-optimize';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'home-slides';
const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

export async function GET() {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('home_slides')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slides: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const titleIt = (formData.get('title_it') as string || '').trim();
  const subtitleIt = (formData.get('subtitle_it') as string || '').trim();
  const altIt = (formData.get('alt_it') as string || '').trim();
  const focus = (formData.get('focus') as string || 'center').trim();

  if (!file) return NextResponse.json({ error: 'File richiesto' }, { status: 400 });
  if (!titleIt) return NextResponse.json({ error: 'Titolo italiano richiesto' }, { status: 400 });

  const optimised = await optimiseUpload(file);
  const storagePath = `${crypto.randomUUID()}.${optimised.ext}`;

  const supabase = createServiceClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, optimised.buffer, { contentType: optimised.contentType, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Compute next display_order (append to end).
  const { count } = await supabase
    .from('home_slides')
    .select('id', { count: 'exact', head: true });

  const titleI18n: Record<string, string> = { it: titleIt };
  const subtitleI18n: Record<string, string> = { it: subtitleIt };
  const altI18n: Record<string, string> = { it: altIt };

  // Best-effort auto-translate. Skip silently if OPENROUTER_API_KEY missing or fails.
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const translated = await translateToAllLocales({
        title: titleIt,
        subtitle: subtitleIt,
        alt: altIt,
      });
      Object.assign(titleI18n, buildI18nMap(titleIt, translated, 'title'));
      Object.assign(subtitleI18n, buildI18nMap(subtitleIt, translated, 'subtitle'));
      Object.assign(altI18n, buildI18nMap(altIt, translated, 'alt'));
    } catch (e) {
      console.error('Auto-translate failed (slide create):', e);
    }
  }

  const { data: slide, error: dbError } = await supabase
    .from('home_slides')
    .insert({
      image_url: publicUrl,
      storage_path: storagePath,
      title_i18n: titleI18n,
      subtitle_i18n: subtitleI18n,
      alt_i18n: altI18n,
      focus,
      display_order: (count || 0) + 1,
      is_active: true,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'create_home_slide', 'home_slide', slide.id, { storage_path: storagePath });
  revalidateHomeSlides();

  return NextResponse.json({ ok: true, slide });
}
