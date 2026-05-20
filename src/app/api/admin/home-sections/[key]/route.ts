import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeSections } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap } from '@/lib/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

type I18nMap = Record<string, string>;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { key } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const { data: current, error: readErr } = await supabase
    .from('home_sections')
    .select('*')
    .eq('section_key', key)
    .single();
  if (readErr || !current) return NextResponse.json({ error: 'Sezione non trovata' }, { status: 404 });

  const update: Record<string, unknown> = {};

  // body.content_it: { [fieldName]: string } — Italian source for any subset of fields.
  // body.translate: boolean — if true and OPENROUTER_API_KEY set, fill 6 other locales.
  const contentIt: Record<string, string> | undefined = body.content_it;
  if (contentIt && typeof contentIt === 'object' && Object.keys(contentIt).length) {
    const existing = (current.content_i18n || {}) as Record<string, I18nMap>;
    const next: Record<string, I18nMap> = { ...existing };
    let needsTranslate = false;

    for (const [field, itValue] of Object.entries(contentIt)) {
      const prev = existing[field] || {};
      next[field] = { ...prev, it: itValue };
      if (prev.it !== itValue) needsTranslate = true;
    }

    if (needsTranslate && process.env.OPENROUTER_API_KEY && body.translate !== false) {
      try {
        const sourceFields: Record<string, string> = contentIt;
        const translated = await translateToAllLocales(sourceFields);
        for (const field of Object.keys(contentIt)) {
          next[field] = buildI18nMap(contentIt[field], translated, field);
        }
      } catch (e) {
        console.error('Auto-translate failed (section update):', e);
      }
    }

    update.content_i18n = next;
  }

  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
  if (body.social_links && typeof body.social_links === 'object') update.social_links = body.social_links;
  if (Array.isArray(body.images)) update.images = body.images;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, section: current });
  }

  const { data: section, error: updErr } = await supabase
    .from('home_sections')
    .update(update)
    .eq('section_key', key)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_home_section', 'home_section', key, Object.keys(update));
  revalidateHomeSections(key);

  return NextResponse.json({ ok: true, section });
}
