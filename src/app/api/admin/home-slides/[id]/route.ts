import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeSlides } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap } from '@/lib/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'home-slides';
const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const { data: current, error: readErr } = await supabase
    .from('home_slides')
    .select('*')
    .eq('id', id)
    .single();
  if (readErr || !current) return NextResponse.json({ error: 'Slide non trovata' }, { status: 404 });

  const update: Record<string, unknown> = {};

  // Italian text changes → re-translate the affected fields.
  const newTitleIt: string | undefined = body.title_it;
  const newSubtitleIt: string | undefined = body.subtitle_it;
  const newAltIt: string | undefined = body.alt_it;

  const italianChanged =
    (typeof newTitleIt === 'string' && newTitleIt !== (current.title_i18n?.it || '')) ||
    (typeof newSubtitleIt === 'string' && newSubtitleIt !== (current.subtitle_i18n?.it || '')) ||
    (typeof newAltIt === 'string' && newAltIt !== (current.alt_i18n?.it || ''));

  if (italianChanged) {
    const titleIt = newTitleIt ?? current.title_i18n?.it ?? '';
    const subtitleIt = newSubtitleIt ?? current.subtitle_i18n?.it ?? '';
    const altIt = newAltIt ?? current.alt_i18n?.it ?? '';

    const titleI18n: Record<string, string> = { it: titleIt };
    const subtitleI18n: Record<string, string> = { it: subtitleIt };
    const altI18n: Record<string, string> = { it: altIt };

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
        console.error('Auto-translate failed (slide update):', e);
      }
    }

    update.title_i18n = titleI18n;
    update.subtitle_i18n = subtitleI18n;
    update.alt_i18n = altI18n;
  }

  if (typeof body.focus === 'string') update.focus = body.focus;
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
  if (typeof body.display_order === 'number') update.display_order = body.display_order;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, slide: current });
  }

  const { data: slide, error: updErr } = await supabase
    .from('home_slides')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_home_slide', 'home_slide', id, update);
  revalidateHomeSlides();

  return NextResponse.json({ ok: true, slide });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: slide } = await supabase
    .from('home_slides')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (slide?.storage_path && !slide.storage_path.startsWith('legacy:')) {
    await supabase.storage.from(BUCKET).remove([slide.storage_path]);
  }

  const { error: delErr } = await supabase.from('home_slides').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete_home_slide', 'home_slide', id, {});
  revalidateHomeSlides();

  return NextResponse.json({ ok: true });
}
