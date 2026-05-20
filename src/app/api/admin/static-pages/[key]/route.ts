import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateStaticPages } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';
import { translateToAllLocales, buildI18nMap } from '@/lib/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

type I18nMap = Record<string, string>;

/**
 * Walk a value recursively. Whenever an "*_it" key is found, treat it as
 * the Italian source and translate to the other 6 locales, replacing the
 * "*_it" key with an "*_i18n" map. Used for new blocks edited by the
 * admin where the form posts only the IT text.
 */
async function autoTranslateBlocks(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) {
    const out = [];
    for (const v of value) out.push(await autoTranslateBlocks(v));
    return out;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const pendingTranslate: Record<string, string> = {};
    const i18nKeys: Record<string, string> = {}; // original_key -> i18n_key

    for (const [k, v] of Object.entries(obj)) {
      if (k.endsWith('_it') && typeof v === 'string') {
        const base = k.slice(0, -3);
        const i18nKey = base + '_i18n';
        // If a corresponding _i18n already exists, preserve other locales.
        const existing = (obj[i18nKey] as I18nMap | undefined) || {};
        if (existing.it === v) {
          // Italian unchanged — keep existing i18n map intact.
          out[i18nKey] = existing;
        } else {
          pendingTranslate[base] = v;
          i18nKeys[base] = i18nKey;
          // Seed with IT immediately so save is not blocked by translate failures.
          out[i18nKey] = { ...existing, it: v };
        }
        // Drop the *_it key from the persisted payload (only kept for the
        // wire format coming from the admin form).
      } else if (k.endsWith('_i18n')) {
        // Allow direct i18n payload from the form.
        out[k] = v;
      } else {
        out[k] = await autoTranslateBlocks(v);
      }
    }

    // Translate any pending IT fields in one batch per object.
    if (Object.keys(pendingTranslate).length && process.env.OPENROUTER_API_KEY) {
      try {
        const translated = await translateToAllLocales(pendingTranslate);
        for (const base of Object.keys(pendingTranslate)) {
          const i18nKey = i18nKeys[base];
          const existing = (out[i18nKey] as I18nMap) || { it: pendingTranslate[base] };
          out[i18nKey] = { ...existing, ...buildI18nMap(pendingTranslate[base], translated, base) };
        }
      } catch (e) {
        console.error('autoTranslateBlocks failed:', e);
      }
    }

    return out;
  }
  return value;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const { key } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const { data: current, error: readErr } = await supabase
    .from('static_pages')
    .select('*')
    .eq('page_key', key)
    .single();
  if (readErr || !current) return NextResponse.json({ error: 'Pagina non trovata' }, { status: 404 });

  const update: Record<string, unknown> = {};

  // Header (title / meta_title / meta_description) — same i18n auto-translate pattern as sections.
  const headerIt: Record<string, string> = {};
  if (typeof body.title_it === 'string') headerIt.title = body.title_it;
  if (typeof body.meta_title_it === 'string') headerIt.meta_title = body.meta_title_it;
  if (typeof body.meta_description_it === 'string') headerIt.meta_description = body.meta_description_it;

  if (Object.keys(headerIt).length) {
    const titleI18n = { ...((current.title_i18n as I18nMap) || {}), it: headerIt.title ?? (current.title_i18n as I18nMap)?.it ?? '' };
    const metaTitleI18n = { ...((current.meta_title_i18n as I18nMap) || {}), it: headerIt.meta_title ?? (current.meta_title_i18n as I18nMap)?.it ?? '' };
    const metaDescI18n = { ...((current.meta_description_i18n as I18nMap) || {}), it: headerIt.meta_description ?? (current.meta_description_i18n as I18nMap)?.it ?? '' };

    if (process.env.OPENROUTER_API_KEY && body.translate !== false) {
      try {
        const translated = await translateToAllLocales(headerIt);
        if (headerIt.title) Object.assign(titleI18n, buildI18nMap(headerIt.title, translated, 'title'));
        if (headerIt.meta_title) Object.assign(metaTitleI18n, buildI18nMap(headerIt.meta_title, translated, 'meta_title'));
        if (headerIt.meta_description) Object.assign(metaDescI18n, buildI18nMap(headerIt.meta_description, translated, 'meta_description'));
      } catch (e) {
        console.error('Static page header translate failed:', e);
      }
    }

    if (headerIt.title) update.title_i18n = titleI18n;
    if (headerIt.meta_title) update.meta_title_i18n = metaTitleI18n;
    if (headerIt.meta_description) update.meta_description_i18n = metaDescI18n;
  }

  // Blocks: auto-translate every *_it key into *_i18n recursively.
  if (Array.isArray(body.blocks)) {
    update.blocks = await autoTranslateBlocks(body.blocks);
  }

  if (Array.isArray(body.images)) update.images = body.images;
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, page: current });
  }

  const { data: page, error: updErr } = await supabase
    .from('static_pages')
    .update(update)
    .eq('page_key', key)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_static_page', 'static_page', key, Object.keys(update));
  revalidateStaticPages(key);

  return NextResponse.json({ ok: true, page });
}
