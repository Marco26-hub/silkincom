// Versioned visual proofs; original source photos remain available for review.
// Catalog overrides are restricted to the explicit local preview in catalog.ts.
export const WINTER_VISUALS = {
  brunate: {
    product: '/products/inverno-2026/revisioni/brunate-prodotto-v2.webp',
    cinematic: '/products/inverno-2026/revisioni/brunate-cinematografica-v2.webp',
    detail: '/products/inverno-2026/originali/brunate-originale-web.webp',
    originals: ['/products/inverno-2026/originali/brunate-originale-web.webp'],
  },
  menaggio: {
    product: '/products/inverno-2026/revisioni/menaggio-prodotto-v4.webp',
    cinematic: '/products/inverno-2026/revisioni/menaggio-cinematografica-v3.webp',
    detail: '/products/inverno-2026/revisioni/menaggio-macro-originale-senza-cellofan.webp',
    magazine: '/products/inverno-2026/revisioni/menaggio-magazine-v2.webp',
    originals: [
      '/products/inverno-2026/revisioni/menaggio-macro-originale-senza-cellofan.webp',
      '/products/inverno-2026/revisioni/menaggio-etichetta-v2.webp',
      '/products/inverno-2026/revisioni/menaggio-magazine-v2.webp',
    ],
  },
  domaso: {
    product: '/products/inverno-2026/final/dolcevita-uomo-lana-merino-nero-domaso-silkincom-01-prodotto.webp',
    cinematic: '/products/inverno-2026/final/dolcevita-uomo-lana-merino-nero-domaso-silkincom-02-indossato-lago-como.webp',
    detail: '/products/inverno-2026/final/dolcevita-uomo-lana-merino-nero-domaso-silkincom-03-ricamo-etichetta-interna.webp',
    originals: [] as string[],
  },
} as const;

export const WINTER_MACRO_ALT = {
  it: 'Menaggio — macro del profilo del Lago di Como ricamato in blu sul cashmere grigio',
  en: 'Menaggio — close-up of the Lake Como profile embroidered in blue on grey cashmere',
  es: 'Menaggio — detalle del perfil del Lago de Como bordado en azul sobre cachemira gris',
  fr: 'Menaggio — gros plan du profil du Lac de Côme brodé en bleu sur le cachemire gris',
  de: 'Menaggio — Nahaufnahme des blau gestickten Comer Seeprofils auf grauem Kaschmir',
  pt: 'Menaggio — detalhe do perfil do Lago de Como bordado em azul sobre caxemira cinzenta',
  nl: 'Menaggio — detail van het profiel van het Comomeer, blauw geborduurd op grijs kasjmier',
} as const;

export const WINTER_MAGAZINE_ALT = {
  it: 'Menaggio — berretto in cashmere grigio, fotografia editoriale con ricamo blu',
  en: 'Menaggio — grey cashmere beanie, editorial photograph with blue embroidery',
  es: 'Menaggio — gorro de cachemira gris, fotografía editorial con bordado azul',
  fr: 'Menaggio — bonnet en cachemire gris, photographie éditoriale avec broderie bleue',
  de: 'Menaggio — graue Kaschmirmütze, redaktionelles Foto mit blauer Stickerei',
  pt: 'Menaggio — gorro de caxemira cinzenta, fotografia editorial com bordado azul',
  nl: 'Menaggio — grijze kasjmiermuts, redactionele foto met blauw borduurwerk',
} as const;

export function winterPhotoClass(src: string): string {
  if (/brunate-originale(?:-web)?\.(?:jpg|webp)$/.test(src)) return 'object-cover object-[50%_68%]';
  if (src.endsWith('menaggio-prodotto.jpg')) return 'object-contain rotate-90';
  if (src.endsWith('menaggio-ricamo.jpg')) return 'object-cover rotate-90';
  return 'object-cover';
}

// Storage adds a content hash before the filename; recognize both local and
// uploaded assets so the production gallery keeps captions and deep links.
export function isWinterMacro(src: string): boolean {
  return /menaggio-macro-originale-senza-cellofan\.(?:png|webp)$/.test(src);
}

export function isWinterMagazine(src: string): boolean {
  return /menaggio-magazine-v2\.(?:png|webp)$/.test(src);
}
