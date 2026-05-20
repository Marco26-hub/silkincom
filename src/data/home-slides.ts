// Server-only loader for home hero slides.
// Reads from Supabase via createPublicClient (cookieless, safe inside
// unstable_cache). Admin mutations call revalidateHomeSlides() to refresh.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>> | null;

export type HomeSlideRow = {
  id: string;
  image_url: string;
  storage_path: string;
  title_i18n: I18nMap;
  subtitle_i18n: I18nMap;
  alt_i18n: I18nMap;
  focus: string;
  display_order: number;
  is_active: boolean;
};

export type HomeSlide = {
  id: string;
  src: string;
  alt: string;
  focus: string;
  titleMain: string;
  titleAccent: string;
  subtitle: string;
};

function pickI18n(map: I18nMap, locale: string): string {
  if (!map) return '';
  return map[locale] || map.en || map.it || '';
}

async function fetchSlidesFromDB(): Promise<HomeSlideRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('home_slides')
    .select('id, image_url, storage_path, title_i18n, subtitle_i18n, alt_i18n, focus, display_order, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching home_slides:', error);
    return [];
  }
  return (data as HomeSlideRow[]) || [];
}

const getCachedSlides = unstable_cache(
  fetchSlidesFromDB,
  ['home-slides'],
  { revalidate: 60, tags: ['home-slides'] }
);

function localize(row: HomeSlideRow, locale: string): HomeSlide {
  const rawTitle = pickI18n(row.title_i18n, locale);
  const [titleMain, titleAccent = ''] = rawTitle.split('||').map((s) => s.trim());
  return {
    id: row.id,
    src: row.image_url,
    alt: pickI18n(row.alt_i18n, locale),
    focus: row.focus || 'center',
    titleMain: titleMain || '',
    titleAccent,
    subtitle: pickI18n(row.subtitle_i18n, locale),
  };
}

export async function getHomeSlides(locale: Locale | string): Promise<HomeSlide[]> {
  const rows = await getCachedSlides();
  return rows.map((r) => localize(r, locale));
}
