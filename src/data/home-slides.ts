// Server-only loader for home hero slides.
// Reads from Supabase via createPublicClient (cookieless, safe inside
// unstable_cache). Admin mutations call revalidateHomeSlides() to refresh.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>> | null;

const SLIDE_TRANSLATION_OVERRIDES: Record<string, { title: Record<string, string>; subtitle: Record<string, string>; alt: Record<string, string> }> = {
  '5d699b03-9cdb-4a6e-baf1-166bcafe54fb': {
    title: {
      it: "Sinfonia d'estate||il candore del cotone.", en: 'A summer symphony||the purity of cotton.',
      es: 'Sinfonía de verano||la pureza del algodón.', fr: "Symphonie d'été||la pureté du coton.",
      de: 'Eine Sommersinfonie||die Reinheit der Baumwolle.', pt: 'Sinfonia de verão||a pureza do algodão.',
      nl: 'Een zomersymfonie||de puurheid van katoen.',
    },
    subtitle: {
      it: "L'essenza del relax sul Lago di Como si svela in un outfit di puro cotone, dove la leggerezza della materia incontra l'atmosfera sospesa di un crepuscolo italiano.",
      en: 'The essence of relaxation on Lake Como unfolds in pure cotton, where lightness meets the suspended atmosphere of an Italian twilight.',
      es: 'La esencia del descanso en el Lago de Como se revela en puro algodón, donde la ligereza se encuentra con la atmósfera de un crepúsculo italiano.',
      fr: "L'essence de la détente sur le lac de Côme se révèle dans le pur coton, où la légèreté rencontre l'atmosphère suspendue d'un crépuscule italien.",
      de: 'Die Essenz der Entspannung am Comer See zeigt sich in reiner Baumwolle, wo Leichtigkeit auf die schwebende Stimmung einer italienischen Dämmerung trifft.',
      pt: 'A essência do descanso no Lago de Como revela-se em puro algodão, onde a leveza encontra a atmosfera suspensa de um crepúsculo italiano.',
      nl: 'De essentie van ontspanning aan het Comomeer ontvouwt zich in puur katoen, waar lichtheid de verstilde sfeer van een Italiaanse schemering ontmoet.',
    },
    alt: {
      it: 'Donna con t-shirt e cappellino in cotone bianco che sorseggia un cocktail in una terrazza sul Lago di Como.',
      en: 'Woman in a white cotton T-shirt and cap enjoying a cocktail on a Lake Como terrace.',
      es: 'Mujer con camiseta y gorra de algodón blanco tomando un cóctel en una terraza del Lago de Como.',
      fr: 'Femme en t-shirt et casquette de coton blanc savourant un cocktail sur une terrasse du lac de Côme.',
      de: 'Frau in weißem Baumwoll-T-Shirt und Cap mit einem Cocktail auf einer Terrasse am Comer See.',
      pt: 'Mulher com t-shirt e boné de algodão branco a beber um cocktail num terraço do Lago de Como.',
      nl: 'Vrouw in een wit katoenen T-shirt en pet met een cocktail op een terras aan het Comomeer.',
    },
  },
};

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
  const override = SLIDE_TRANSLATION_OVERRIDES[row.id];
  const rawTitle = pickI18n(override?.title ?? row.title_i18n, locale);
  const [titleMain, titleAccent = ''] = rawTitle.split('||').map((s) => s.trim());
  return {
    id: row.id,
    src: row.image_url,
    alt: pickI18n(override?.alt ?? row.alt_i18n, locale),
    focus: row.focus || 'center',
    titleMain: titleMain || '',
    titleAccent,
    subtitle: pickI18n(override?.subtitle ?? row.subtitle_i18n, locale),
  };
}

export async function getHomeSlides(locale: Locale | string): Promise<HomeSlide[]> {
  const rows = await getCachedSlides();
  return rows.map((r) => localize(r, locale));
}
