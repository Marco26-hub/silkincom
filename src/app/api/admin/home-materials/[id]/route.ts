import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeMaterials } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap } from '@/lib/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

type I18nMap = Record<string, string>;

const I18N_FIELDS = [
  'name_i18n', 'description_i18n',
  'origin_title_i18n', 'origin_body_i18n',
  'characteristics_title_i18n', 'characteristics_body_i18n',
  'benefit_title_i18n', 'benefit_body_i18n',
] as const;

const IT_TO_COL: Record<string, typeof I18N_FIELDS[number]> = {
  name_it: 'name_i18n',
  description_it: 'description_i18n',
  origin_title_it: 'origin_title_i18n',
  origin_body_it: 'origin_body_i18n',
  characteristics_title_it: 'characteristics_title_i18n',
  characteristics_body_it: 'characteristics_body_i18n',
  benefit_title_it: 'benefit_title_i18n',
  benefit_body_it: 'benefit_body_i18n',
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const { data: current, error: readErr } = await supabase
    .from('materials')
    .select('*')
    .eq('id', id)
    .single();
  if (readErr || !current) return NextResponse.json({ error: 'Materiale non trovato' }, { status: 404 });

  const update: Record<string, unknown> = {};

  const italianFields: Record<string, string> = {};
  for (const [itKey, col] of Object.entries(IT_TO_COL)) {
    if (typeof body[itKey] === 'string') {
      italianFields[col] = body[itKey];
    }
  }

  const italianChanged = Object.entries(italianFields).some(
    ([col, val]) => (current[col]?.it || '') !== val
  );

  if (Object.keys(italianFields).length > 0) {
    const next: Record<string, I18nMap> = {};
    for (const [col, itValue] of Object.entries(italianFields)) {
      const prev = (current[col] || {}) as I18nMap;
      next[col] = { ...prev, it: itValue };
    }

    if (italianChanged && process.env.OPENROUTER_API_KEY && body.translate !== false) {
      try {
        const flat: Record<string, string> = {};
        for (const [col, val] of Object.entries(italianFields)) flat[col] = val;
        const translated = await translateToAllLocales(flat);
        for (const col of Object.keys(italianFields)) {
          next[col] = buildI18nMap(italianFields[col], translated, col);
        }
      } catch (e) {
        console.error('Auto-translate failed (material update):', e);
      }
    }

    Object.assign(update, next);
    // Keep legacy text columns in sync with Italian for backwards compatibility.
    if (italianFields.name_i18n) update.name = italianFields.name_i18n;
    if (italianFields.description_i18n) update.description = italianFields.description_i18n;
    if (italianFields.origin_body_i18n) update.origin = italianFields.origin_body_i18n;
    if (italianFields.characteristics_body_i18n) update.characteristics = italianFields.characteristics_body_i18n;
    if (italianFields.benefit_body_i18n) update.benefits = italianFields.benefit_body_i18n;
  }

  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
  if (typeof body.display_order === 'number') update.display_order = body.display_order;
  if (typeof body.href === 'string') update.href = body.href;
  if (typeof body.code === 'string') update.code = body.code;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, material: current });
  }

  const { data: material, error: updErr } = await supabase
    .from('materials')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_home_material', 'material', id, Object.keys(update));
  revalidateHomeMaterials();

  return NextResponse.json({ ok: true, material });
}
