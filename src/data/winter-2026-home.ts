import type { HeroSlideInput } from '@/components/sections/Hero';

import { WINTER_COPY } from './winter-2026-copy';
import { WINTER_PRODUCTS } from './winter-2026';
import { normLocale } from './catalog-meta';
import { WINTER_VISUALS } from './winter-2026-visuals';

const MODEL_ALT = {
  it: 'Modello con maglione Brunate in lana panna e ricamo blu, sul Lago di Como in inverno',
  en: 'Model wearing the cream wool Brunate sweater with blue embroidery, beside Lake Como in winter',
  es: 'Modelo con jersey Brunate de lana crema y bordado azul, junto al Lago de Como en invierno',
  fr: 'Mannequin portant le pull Brunate en laine écrue à broderie bleue, au bord du lac de Côme en hiver',
  de: 'Model im cremefarbenen Brunate-Wollpullover mit blauer Stickerei am Comer See im Winter',
  pt: 'Modelo com camisola Brunate de lã creme e bordado azul, junto ao Lago de Como no inverno',
  nl: 'Model in de crèmekleurige wollen Brunate-trui met blauw borduurwerk, aan het Comomeer in de winter',
} as const;

const BEANIE_ALT = {
  it: 'Modello con berretto Menaggio in cashmere grigio e ricamo blu sul Lago di Como, luce calda invernale',
  en: 'Model wearing the grey cashmere Menaggio beanie with blue embroidery beside Lake Como, warm winter light',
  es: 'Modelo con gorro Menaggio de cachemira gris y bordado azul junto al Lago de Como, luz cálida de invierno',
  fr: 'Mannequin portant le bonnet Menaggio en cachemire gris à broderie bleue au lac de Côme, lumière hivernale chaude',
  de: 'Model mit grauer Menaggio-Kaschmirmütze und blauer Stickerei am Comer See in warmem Winterlicht',
  pt: 'Modelo com gorro Menaggio de caxemira cinzenta e bordado azul junto ao Lago de Como, luz quente de inverno',
  nl: 'Model met de grijze kasjmieren Menaggio-muts met blauw borduurwerk aan het Comomeer in warm winterlicht',
} as const;

export function getWinter2026HomeSlides(locale: string): HeroSlideInput[] {
  const lang = normLocale(locale);
  const t = WINTER_COPY[lang];
  const shared = {
    ctaLabel: t.discover,
    offer: t.offer,
  };

  return [
    {
      id: 'winter-2026-brunate',
      src: WINTER_VISUALS.brunate.cinematic,
      alt: MODEL_ALT[lang],
      focus: '50% 0%',
      portrait: true,
      titleMain: t.title,
      titleAccent: t.accent,
      subtitle: t.intro,
      href: '/collezioni/inverno',
      ...shared,
    },
    {
      id: 'winter-2026-menaggio-home',
      src: '/home/menaggio-hero-inverno-v1.webp',
      alt: BEANIE_ALT[lang],
      focus: '72% 0%',
      portrait: true,
      titleMain: 'Menaggio',
      titleAccent: t.headlines[1],
      subtitle: WINTER_PRODUCTS[1].content[lang].short,
      href: '/prodotto/menaggio-berretto-cashmere-grigio#macro-ricamo',
      ctaLabel: t.view,
      offer: WINTER_PRODUCTS[1].content[lang].composition,
    },
  ];
}
