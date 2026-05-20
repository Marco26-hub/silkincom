import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeSlides } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap, TARGET_LANGS } from '@/lib/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY non configurata sul server' }, { status: 500 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: slide, error: readErr } = await supabase
    .from('home_slides')
    .select('id, title_i18n, subtitle_i18n, alt_i18n')
    .eq('id', id)
    .single();
  if (readErr || !slide) return NextResponse.json({ error: 'Slide non trovata' }, { status: 404 });

  const titleIt = slide.title_i18n?.it || '';
  const subtitleIt = slide.subtitle_i18n?.it || '';
  const altIt = slide.alt_i18n?.it || '';

  if (!titleIt && !subtitleIt && !altIt) {
    return NextResponse.json({ error: 'Nessun testo italiano da tradurre' }, { status: 400 });
  }

  try {
    const translated = await translateToAllLocales({
      title: titleIt,
      subtitle: subtitleIt,
      alt: altIt,
    });

    const titleI18n = buildI18nMap(titleIt, translated, 'title');
    const subtitleI18n = buildI18nMap(subtitleIt, translated, 'subtitle');
    const altI18n = buildI18nMap(altIt, translated, 'alt');

    const { error: updErr } = await supabase
      .from('home_slides')
      .update({
        title_i18n: titleI18n,
        subtitle_i18n: subtitleI18n,
        alt_i18n: altI18n,
      })
      .eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await logAdminAction(auth.userId, 'translate_home_slide', 'home_slide', id, { languages: Object.keys(TARGET_LANGS) });
    revalidateHomeSlides();

    return NextResponse.json({ ok: true, languages: Object.keys(TARGET_LANGS) });
  } catch (e) {
    return NextResponse.json({ error: `Traduzione fallita: ${(e as Error).message}` }, { status: 502 });
  }
}
