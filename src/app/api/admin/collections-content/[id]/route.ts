import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateCollections } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap } from '@/lib/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const { data: current, error: readErr } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single();
  if (readErr || !current) return NextResponse.json({ error: 'Collezione non trovata' }, { status: 404 });

  const update: Record<string, unknown> = {};

  const newNameIt: string | undefined = body.name_it;
  const newTaglineIt: string | undefined = body.tagline_it;
  const newDescIt: string | undefined = body.description_it;
  const newShortIt: string | undefined = body.short_name_it;
  const newAccentIt: string | undefined = body.accent_it;

  const italianChanged =
    (typeof newNameIt === 'string' && newNameIt !== (current.name_i18n?.it || '')) ||
    (typeof newTaglineIt === 'string' && newTaglineIt !== (current.tagline_i18n?.it || '')) ||
    (typeof newDescIt === 'string' && newDescIt !== (current.description_i18n?.it || '')) ||
    (typeof newShortIt === 'string' && newShortIt !== (current.short_name_i18n?.it || '')) ||
    (typeof newAccentIt === 'string' && newAccentIt !== (current.accent_i18n?.it || ''));

  if (italianChanged) {
    const nameIt = newNameIt ?? current.name_i18n?.it ?? '';
    const taglineIt = newTaglineIt ?? current.tagline_i18n?.it ?? '';
    const descIt = newDescIt ?? current.description_i18n?.it ?? '';
    const shortIt = newShortIt ?? current.short_name_i18n?.it ?? '';
    const accentIt = newAccentIt ?? current.accent_i18n?.it ?? '';

    const nameI18n: Record<string, string> = { it: nameIt };
    const taglineI18n: Record<string, string> = { it: taglineIt };
    const descI18n: Record<string, string> = { it: descIt };
    const shortI18n: Record<string, string> = { it: shortIt };
    const accentI18n: Record<string, string> = { it: accentIt };

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const translated = await translateToAllLocales({
          name: nameIt,
          tagline: taglineIt,
          description: descIt,
          short_name: shortIt,
          accent: accentIt,
        });
        Object.assign(nameI18n, buildI18nMap(nameIt, translated, 'name'));
        Object.assign(taglineI18n, buildI18nMap(taglineIt, translated, 'tagline'));
        Object.assign(descI18n, buildI18nMap(descIt, translated, 'description'));
        Object.assign(shortI18n, buildI18nMap(shortIt, translated, 'short_name'));
        Object.assign(accentI18n, buildI18nMap(accentIt, translated, 'accent'));
      } catch (e) {
        console.error('Auto-translate failed (collection update):', e);
      }
    }

    update.name_i18n = nameI18n;
    update.tagline_i18n = taglineI18n;
    update.description_i18n = descI18n;
    update.short_name_i18n = shortI18n;
    update.accent_i18n = accentI18n;
    // Keep name column in sync with Italian for legacy compatibility.
    update.name = nameIt;
    update.description = descIt;
  }

  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
  if (typeof body.display_order === 'number') update.display_order = body.display_order;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, collection: current });
  }

  const { data: collection, error: updErr } = await supabase
    .from('collections')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_collection_content', 'collection', id, update);
  revalidateCollections();

  return NextResponse.json({ ok: true, collection });
}
