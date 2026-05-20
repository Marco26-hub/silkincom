import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateCollections } from '@/lib/revalidate';
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

  const { data: row, error: readErr } = await supabase
    .from('collections')
    .select('id, name_i18n, tagline_i18n, description_i18n, short_name_i18n, accent_i18n')
    .eq('id', id)
    .single();
  if (readErr || !row) return NextResponse.json({ error: 'Collezione non trovata' }, { status: 404 });

  const nameIt = row.name_i18n?.it || '';
  const taglineIt = row.tagline_i18n?.it || '';
  const descIt = row.description_i18n?.it || '';
  const shortIt = row.short_name_i18n?.it || '';
  const accentIt = row.accent_i18n?.it || '';

  if (!nameIt && !taglineIt && !descIt) {
    return NextResponse.json({ error: 'Nessun testo italiano da tradurre' }, { status: 400 });
  }

  try {
    const translated = await translateToAllLocales({
      name: nameIt,
      tagline: taglineIt,
      description: descIt,
      short_name: shortIt,
      accent: accentIt,
    });

    const update = {
      name_i18n: buildI18nMap(nameIt, translated, 'name'),
      tagline_i18n: buildI18nMap(taglineIt, translated, 'tagline'),
      description_i18n: buildI18nMap(descIt, translated, 'description'),
      short_name_i18n: buildI18nMap(shortIt, translated, 'short_name'),
      accent_i18n: buildI18nMap(accentIt, translated, 'accent'),
    };

    const { error: updErr } = await supabase.from('collections').update(update).eq('id', id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await logAdminAction(auth.userId, 'translate_collection', 'collection', id, { languages: Object.keys(TARGET_LANGS) });
    revalidateCollections();

    return NextResponse.json({ ok: true, languages: Object.keys(TARGET_LANGS) });
  } catch (e) {
    return NextResponse.json({ error: `Traduzione fallita: ${(e as Error).message}` }, { status: 502 });
  }
}
