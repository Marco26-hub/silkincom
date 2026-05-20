// Server-only loader for generic home page CMS content.
// Two domains:
//   - home_sections (brand_story, editorial_banner, instagram_feed) → getHomeSection
//   - materials (5 home cards) → getHomeMaterials
//
// Uses createPublicClient inside unstable_cache. Admin mutations call
// revalidateHomeSections / revalidateHomeMaterials in src/lib/revalidate.ts.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>> | null;

function pickI18n(map: I18nMap, locale: string, fallback = ''): string {
  if (!map) return fallback;
  return map[locale] || map.en || map.it || fallback;
}

// ---------- HOME_SECTIONS ----------

export type HomeSectionImage = {
  url: string;
  storage_path: string;
  alt_i18n: Record<string, string>;
};

export type HomeSectionRow = {
  id: string;
  section_key: string;
  content_i18n: Record<string, I18nMap>;
  images: HomeSectionImage[];
  social_links: Record<string, string>;
  is_active: boolean;
};

export type HomeSectionLocalized = {
  id: string;
  sectionKey: string;
  content: Record<string, string>;
  images: { url: string; alt: string }[];
  socialLinks: Record<string, string>;
};

async function fetchSection(section_key: string): Promise<HomeSectionRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('home_sections')
    .select('*')
    .eq('section_key', section_key)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    console.error(`home_sections fetch (${section_key})`, error);
    return null;
  }
  return (data as HomeSectionRow) || null;
}

const getCachedSection = (key: string) =>
  unstable_cache(
    () => fetchSection(key),
    ['home-section', key],
    { revalidate: 60, tags: ['home-sections', `home-section:${key}`] }
  )();

export async function getHomeSection(section_key: string, locale: Locale | string): Promise<HomeSectionLocalized | null> {
  const row = await getCachedSection(section_key);
  if (!row) return null;
  const content: Record<string, string> = {};
  for (const [k, v] of Object.entries(row.content_i18n || {})) {
    content[k] = pickI18n(v, String(locale));
  }
  const images = (row.images || []).map((img) => ({
    url: img.url,
    alt: pickI18n(img.alt_i18n, String(locale)),
  }));
  return {
    id: row.id,
    sectionKey: row.section_key,
    content,
    images,
    socialLinks: row.social_links || {},
  };
}

// ---------- MATERIALS ----------

export type MaterialRow = {
  id: string;
  slug: string | null;
  code: string | null;
  href: string | null;
  image_url: string | null;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean;
  name_i18n: I18nMap;
  description_i18n: I18nMap;
  origin_title_i18n: I18nMap;
  origin_body_i18n: I18nMap;
  characteristics_title_i18n: I18nMap;
  characteristics_body_i18n: I18nMap;
  benefit_title_i18n: I18nMap;
  benefit_body_i18n: I18nMap;
};

export type HomeMaterialCard = {
  id: string;
  slug: string;
  code: string;
  href: string;
  image: string;
  name: string;
  description: string;
  tabs: {
    origine: { title: string; body: string };
    caratteristiche: { title: string; body: string };
    beneficio: { title: string; body: string };
  };
};

async function fetchMaterials(): Promise<MaterialRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('materials')
    .select(`id, slug, code, href, image_url, storage_path, display_order, is_active,
             name_i18n, description_i18n,
             origin_title_i18n, origin_body_i18n,
             characteristics_title_i18n, characteristics_body_i18n,
             benefit_title_i18n, benefit_body_i18n`)
    .not('slug', 'is', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('home_materials fetch', error);
    return [];
  }
  return (data as MaterialRow[]) || [];
}

const getCachedMaterials = unstable_cache(
  fetchMaterials,
  ['home-materials'],
  { revalidate: 60, tags: ['home-materials'] }
);

function localizeMaterial(r: MaterialRow, locale: string): HomeMaterialCard {
  return {
    id: r.id,
    slug: r.slug || '',
    code: r.code || '',
    href: r.href || `/materiali#${r.slug || ''}`,
    image: r.image_url || '',
    name: pickI18n(r.name_i18n, locale, r.slug || ''),
    description: pickI18n(r.description_i18n, locale),
    tabs: {
      origine: {
        title: pickI18n(r.origin_title_i18n, locale),
        body: pickI18n(r.origin_body_i18n, locale),
      },
      caratteristiche: {
        title: pickI18n(r.characteristics_title_i18n, locale),
        body: pickI18n(r.characteristics_body_i18n, locale),
      },
      beneficio: {
        title: pickI18n(r.benefit_title_i18n, locale),
        body: pickI18n(r.benefit_body_i18n, locale),
      },
    },
  };
}

export async function getHomeMaterials(locale: Locale | string): Promise<HomeMaterialCard[]> {
  const rows = await getCachedMaterials();
  return rows.map((r) => localizeMaterial(r, String(locale)));
}
