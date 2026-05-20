// Server-only loader for Featured Collections (homepage + /collezioni).
// DB-backed via createPublicClient (cookieless), wrapped in unstable_cache.
// Admin mutations call revalidateCollections() to refresh.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>> | null;

export type CollectionRow = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean;
  name_i18n: I18nMap;
  tagline_i18n: I18nMap;
  short_name_i18n: I18nMap;
  accent_i18n: I18nMap;
  description_i18n: I18nMap;
  seo_title: string | null;
  seo_description: string | null;
};

export type FeaturedCollection = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  tagline: string;
  description: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
};

function pickI18n(map: I18nMap, locale: string, fallback = ''): string {
  if (!map) return fallback;
  return map[locale] || map.en || map.it || fallback;
}

async function fetchCollectionsFromDB(): Promise<CollectionRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('collections')
    .select(`id, slug, name, description, image_url, storage_path, display_order, is_active,
             name_i18n, tagline_i18n, short_name_i18n, accent_i18n, description_i18n,
             seo_title, seo_description`)
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
  return (data as CollectionRow[]) || [];
}

const getCachedCollections = unstable_cache(
  fetchCollectionsFromDB,
  ['featured-collections'],
  { revalidate: 60, tags: ['collections-meta'] }
);

function localize(row: CollectionRow, locale: string): FeaturedCollection {
  return {
    id: row.id,
    slug: row.slug,
    name: pickI18n(row.name_i18n, locale, row.name || row.slug),
    shortName: pickI18n(row.short_name_i18n, locale, row.name || row.slug),
    accent: pickI18n(row.accent_i18n, locale, ''),
    tagline: pickI18n(row.tagline_i18n, locale, ''),
    description: pickI18n(row.description_i18n, locale, row.description || ''),
    image: row.image_url || '',
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active,
  };
}

export async function getFeaturedCollections(locale: Locale | string): Promise<FeaturedCollection[]> {
  const rows = await getCachedCollections();
  return rows.map((r) => localize(r, locale));
}

export async function getFeaturedCollection(slug: string, locale: Locale | string): Promise<FeaturedCollection | null> {
  const rows = await getCachedCollections();
  const row = rows.find((r) => r.slug === slug);
  return row ? localize(row, locale) : null;
}
