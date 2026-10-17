// Server-only loader for home hero slides.
// Reads from Supabase via createPublicClient (cookieless, safe inside
// unstable_cache). Admin mutations call revalidateHomeSlides() to refresh.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>> | null;

const SLIDE_TRANSLATION_OVERRIDES: Record<string, { title: Record<string, string>; subtitle: Record<string, string>; alt: Record<string, string> }> = {
  'f7685d9b-de4b-4a06-8c92-0fcc044350a3': {
    title: {
      it: 'Il twilly||che danza al vento.', en: 'The twilly||dancing in the breeze.',
      es: 'El twilly||que baila con el viento.', fr: 'Le twilly||qui danse au vent.',
      de: 'Der Twilly||der im Wind tanzt.', pt: 'O twilly||que dança ao vento.', nl: 'De twilly||die danst in de wind.',
    },
    subtitle: {
      it: 'Un nastro di seta, mille interpretazioni. Al collo, fra i capelli o sulla borsa: il dettaglio che firma il tuo stile.',
      en: 'A silk ribbon, endless interpretations. Around the neck, in your hair or on a bag: the detail that defines your style.',
      es: 'Una cinta de seda, mil interpretaciones. Al cuello, en el pelo o en el bolso: el detalle que define su estilo.',
      fr: 'Un ruban de soie, mille interprétations. Autour du cou, dans les cheveux ou sur un sac : le détail qui signe votre style.',
      de: 'Ein Seidenband, unzählige Möglichkeiten. Am Hals, im Haar oder an der Tasche: das Detail, das Ihren Stil prägt.',
      pt: 'Uma fita de seda, mil interpretações. Ao pescoço, no cabelo ou na mala: o detalhe que assina o seu estilo.',
      nl: 'Een zijden lint, eindeloze mogelijkheden. Om de hals, in het haar of aan een tas: het detail dat uw stijl tekent.',
    },
    alt: {},
  },
  'ed37153e-7d85-4cd5-a191-c236986d66ad': {
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
  '5d699b03-9cdb-4a6e-baf1-166bcafe54fb': {
    title: {
      it: 'Una sera sul Lago||la leggerezza del bianco.', en: 'An evening by the Lake||the lightness of white.',
      es: 'Una tarde junto al Lago||la ligereza del blanco.', fr: 'Un soir au bord du Lac||la légèreté du blanc.',
      de: 'Ein Abend am See||die Leichtigkeit von Weiß.', pt: 'Uma tarde junto ao Lago||a leveza do branco.',
      nl: 'Een avond aan het meer||de lichtheid van wit.',
    },
    subtitle: {
      it: 'Una camicia bianca, una linea essenziale e la luce del tramonto sul Lago di Como.',
      en: 'A white shirt, a clean silhouette and sunset light on Lake Como.',
      es: 'Una camisa blanca, una silueta sencilla y la luz del atardecer sobre el Lago de Como.',
      fr: 'Une chemise blanche, une ligne épurée et la lumière du couchant sur le lac de Côme.',
      de: 'Ein weißes Hemd, eine klare Silhouette und Abendlicht am Comer See.',
      pt: 'Uma camisa branca, uma silhueta simples e a luz do entardecer sobre o Lago de Como.',
      nl: 'Een wit overhemd, een zuivere lijn en het licht van de zonsondergang aan het Comomeer.',
    },
    alt: {
      it: 'Donna con camicia bianca e occhiali da sole sul Lago di Como al tramonto.',
      en: 'Woman in a white shirt and sunglasses by Lake Como at sunset.',
      es: 'Mujer con camisa blanca y gafas de sol junto al Lago de Como al atardecer.',
      fr: 'Femme en chemise blanche et lunettes de soleil au bord du lac de Côme au coucher du soleil.',
      de: 'Frau in weißem Hemd und Sonnenbrille am Comer See bei Sonnenuntergang.',
      pt: 'Mulher com camisa branca e óculos de sol junto ao Lago de Como ao pôr do sol.',
      nl: 'Vrouw met een wit overhemd en zonnebril aan het Comomeer bij zonsondergang.',
    },
  },
};

const PORTRAIT_SLIDE_IDS = new Set([
  'f7685d9b-de4b-4a06-8c92-0fcc044350a3',
  'ed37153e-7d85-4cd5-a191-c236986d66ad',
  '5d699b03-9cdb-4a6e-baf1-166bcafe54fb',
]);

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
  portrait: boolean;
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  href?: string;
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
    alt: pickI18n(Object.keys(override?.alt ?? {}).length ? override!.alt : row.alt_i18n, locale),
    focus: PORTRAIT_SLIDE_IDS.has(row.id) ? '50% 0%' : row.focus || 'center',
    portrait: PORTRAIT_SLIDE_IDS.has(row.id),
    titleMain: titleMain || '',
    titleAccent,
    subtitle: pickI18n(override?.subtitle ?? row.subtitle_i18n, locale),
    href: ({
      'f7685d9b-de4b-4a06-8c92-0fcc044350a3': '/collezioni/twilly-como',
      'ed37153e-7d85-4cd5-a191-c236986d66ad': '/collezioni/lario',
      '5d699b03-9cdb-4a6e-baf1-166bcafe54fb': '/collezioni/riva',
    } as Record<string, string>)[row.id],
  };
}

export async function getHomeSlides(locale: Locale | string): Promise<HomeSlide[]> {
  const rows = await getCachedSlides();
  return rows.map((r) => localize(r, locale));
}
