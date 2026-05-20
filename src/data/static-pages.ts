// Server-only loader for static pages CMS.
// Each page has title + meta + an ordered list of content blocks.
//
// Block types (TipTap-inspired, kept simple for premium editorial layout):
//   - 'hero'        — eyebrow + title + accent + subtitle + image_url
//   - 'section'     — title + body (long-form paragraph)
//   - 'image-text'  — title + body side by side with image (left/right toggle)
//   - 'gallery'     — multiple images + caption
//   - 'cta'         — text + href + variant (primary|secondary)
//   - 'quote'       — quote + author
//   - 'list'        — title + array of items
//   - 'faq'         — title + array of {q, a}

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>>;

export type StaticPageBlock =
  | { id: string; type: 'hero'; eyebrow_i18n?: I18nMap; title_i18n?: I18nMap; accent_i18n?: I18nMap; subtitle_i18n?: I18nMap; image_url?: string }
  | { id: string; type: 'section'; title_i18n?: I18nMap; body_i18n?: I18nMap }
  | { id: string; type: 'image-text'; title_i18n?: I18nMap; body_i18n?: I18nMap; image_url?: string; image_position?: 'left' | 'right' }
  | { id: string; type: 'gallery'; images?: Array<{ url: string; caption_i18n?: I18nMap }> }
  | { id: string; type: 'cta'; text_i18n?: I18nMap; href?: string; variant?: 'primary' | 'secondary' }
  | { id: string; type: 'quote'; quote_i18n?: I18nMap; author_i18n?: I18nMap }
  | { id: string; type: 'list'; title_i18n?: I18nMap; items_i18n?: Array<I18nMap> }
  | { id: string; type: 'faq'; title_i18n?: I18nMap; items?: Array<{ q_i18n?: I18nMap; a_i18n?: I18nMap }> };

export type StaticPageRow = {
  id: string;
  page_key: string;
  title_i18n: I18nMap;
  meta_title_i18n: I18nMap;
  meta_description_i18n: I18nMap;
  blocks: StaticPageBlock[];
  images: Array<{ url: string; storage_path: string; alt_i18n?: I18nMap }>;
  is_active: boolean;
};

export type StaticPageLocalized = {
  id: string;
  pageKey: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  blocks: StaticPageBlock[];
  rawBlocks: StaticPageBlock[];
};

function pickI18n(map: I18nMap | undefined, locale: string, fallback = ''): string {
  if (!map) return fallback;
  return map[locale] || map.en || map.it || fallback;
}

async function fetchPage(pageKey: string): Promise<StaticPageRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .eq('page_key', pageKey)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    console.error(`static_pages fetch (${pageKey})`, error);
    return null;
  }
  return (data as StaticPageRow) || null;
}

const getCachedPage = (key: string) =>
  unstable_cache(
    () => fetchPage(key),
    ['static-page', key],
    { revalidate: 60, tags: ['static-pages', `static-page:${key}`] }
  )();

export async function getStaticPage(pageKey: string, locale: Locale | string): Promise<StaticPageLocalized | null> {
  const row = await getCachedPage(pageKey);
  if (!row) return null;
  return {
    id: row.id,
    pageKey: row.page_key,
    title: pickI18n(row.title_i18n, String(locale)),
    metaTitle: pickI18n(row.meta_title_i18n, String(locale)),
    metaDescription: pickI18n(row.meta_description_i18n, String(locale)),
    blocks: row.blocks || [],
    rawBlocks: row.blocks || [],
  };
}

/** Helper for client/server rendering: resolves a block's i18n field for the active locale. */
export function blockText(block: StaticPageBlock, field: string, locale: string, fallback = ''): string {
  const k = field + '_i18n';
  // @ts-expect-error dynamic block field access
  const map = block[k] as I18nMap | undefined;
  return pickI18n(map, locale, fallback);
}
