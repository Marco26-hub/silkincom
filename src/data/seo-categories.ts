/**
 * Typed commercial CATEGORY / landing pages — the buyer-intent page type the
 * brand was missing (it only had PDPs + brand-named /collezioni). Each maps a
 * keyword-rich URL (e.g. /foulard-seta) to a curated product grid + localized
 * H1/intro + schema. Italy-first slugs; content localized (it/en, others fall
 * back to en). See SEO research dossier 2026-06-19.
 */
export type SeoFaq = { q: Record<string, string>; a: Record<string, string> };

export type SeoCategory = {
  slug: string;
  /** product `category` slugs whose products fill the grid */
  categories: string[];
  eyebrow: Record<string, string>;
  h1: Record<string, string>;
  title: Record<string, string>;
  description: Record<string, string>;
  intro: Record<string, string>;
  faq: SeoFaq[];
};

export function pickLocale(m: Record<string, string>, locale: string): string {
  return m[locale] ?? m.en ?? m.it ?? '';
}

export const SEO_CATEGORIES: SeoCategory[] = [
  {
    slug: 'pashmine-cashmere',
    categories: ['bellagio'],
    eyebrow: { it: 'Cashmere · Lago di Como', en: 'Cashmere · Lake Como' },
    h1: { it: 'Pashmine in Cashmere — Bellagio, Lago di Como', en: 'Cashmere Pashminas — Bellagio, Lake Como' },
    title: { it: 'Pashmine in Cashmere — Bellagio · Lago di Como', en: 'Cashmere Pashminas — Bellagio · Lake Como' },
    description: {
      it: 'Pashmine e scialli in puro cashmere, lavorati sul Lago di Como. Bellagio Cipria, morbidezza assoluta. Made in Como, spedizione gratuita oltre €200.',
      en: 'Pure cashmere pashminas and shawls, crafted by Lake Como. Bellagio Cipria, absolute softness. Made in Como, free shipping over €200.',
    },
    intro: {
      it: 'Le pashmine Bellagio nascono sul Lago di Como, nel distretto serico più antico d’Europa: puro cashmere, una mano leggera e calda che resta elegante dall’aperitivo alla sera. Un regalo che dura una vita.',
      en: 'Our Bellagio pashminas are made by Lake Como, in the oldest silk district in Europe: pure cashmere, light and warm, elegant from aperitivo to evening. A gift that lasts a lifetime.',
    },
    faq: [
      {
        q: { it: 'Le pashmine sono in vero cashmere?', en: 'Are the pashminas real cashmere?' },
        a: { it: 'Sì, puro cashmere lavorato nel distretto del Lago di Como, Made in Como.', en: 'Yes, pure cashmere crafted in the Lake Como district, Made in Como.' },
      },
      {
        q: { it: 'Quanto costa la spedizione?', en: 'How much is shipping?' },
        a: { it: 'Gratuita in Italia per ordini oltre €200, con reso entro 14 giorni.', en: 'Free in Italy for orders over €200, with 14-day returns.' },
      },
    ],
  },
  {
    slug: 'foulard-seta',
    categories: ['twilly-como'],
    eyebrow: { it: 'Seta 100% · Made in Como', en: 'Silk 100% · Made in Como' },
    h1: { it: 'Foulard in Seta di Como', en: 'Como Silk Scarves' },
    title: { it: 'Foulard in Seta di Como — 100% Seta, Made in Italy', en: 'Como Silk Scarves — 100% Silk, Made in Italy' },
    description: {
      it: 'Foulard e twilly in 100% seta di Como, orlo arrotolato a mano. Il distretto serico più antico d’Europa, da cui le grandi maison comprano la seta. Made in Italy.',
      en: 'Foulards and twillys in 100% Como silk, hand-rolled hem. The oldest silk district in Europe — where the big maisons buy their silk. Made in Italy.',
    },
    intro: {
      it: 'Como produce gran parte della seta italiana: i nostri foulard e twilly sono 100% seta, con orlo arrotolato a mano, tessuti nel distretto serico. La fonte da cui nasce il lusso, senza l’etichetta della maison.',
      en: 'Como produces most of Italy’s silk: our foulards and twillys are 100% silk with a hand-rolled hem, woven in the silk district. The source luxury comes from — without the maison markup.',
    },
    faq: [
      {
        q: { it: 'La seta è davvero di Como?', en: 'Is the silk really from Como?' },
        a: { it: 'Sì: tessuta e rifinita nel distretto serico di Como, 100% seta, orlo a mano.', en: 'Yes: woven and finished in the Como silk district, 100% silk, hand-rolled hem.' },
      },
      {
        q: { it: 'Posso usarlo come regalo?', en: 'Can it be a gift?' },
        a: { it: 'Sì, il foulard di seta è un regalo elegante e senza tempo, spedito con cura.', en: 'Yes, a silk foulard is a timeless elegant gift, shipped with care.' },
      },
    ],
  },
  {
    slug: 'sciarpe-seta',
    categories: ['varenna', 'tremezzo', 'cernobbio'],
    eyebrow: { it: 'Seta 100% · Made in Como', en: 'Silk 100% · Made in Como' },
    h1: { it: 'Sciarpe in Seta di Como', en: 'Como Silk Scarves' },
    title: { it: 'Sciarpe in Seta di Como — 100% Seta, Uomo e Donna', en: 'Como Silk Scarves — 100% Silk, Men & Women' },
    description: {
      it: 'Sciarpe in 100% seta tessute nel distretto serico di Como, per uomo e donna. Eleganza Made in Como, spedizione gratuita oltre €200.',
      en: 'Scarves in 100% silk woven in the Como silk district, for men and women. Made in Como elegance, free shipping over €200.',
    },
    intro: {
      it: 'Sciarpe in pura seta di Como, tessute nel distretto serico più antico d’Europa. Per lui e per lei, una mano fresca che cade impeccabile in ogni stagione.',
      en: 'Scarves in pure Como silk, woven in the oldest silk district in Europe. For him and her — a fresh hand that drapes impeccably in every season.',
    },
    faq: [
      {
        q: { it: 'Sono adatte a uomo e donna?', en: 'Are they for men and women?' },
        a: { it: 'Sì, i modelli sono unisex e disponibili in più colori.', en: 'Yes, the styles are unisex and available in several colours.' },
      },
    ],
  },
  {
    slug: 'regalo-seta-donna',
    categories: ['twilly-como', 'bellagio'],
    eyebrow: { it: 'Idee Regalo · Made in Como', en: 'Gift Ideas · Made in Como' },
    h1: { it: 'Idee Regalo in Seta e Cashmere per Lei', en: 'Silk & Cashmere Gift Ideas for Her' },
    title: { it: 'Regalo Donna in Seta e Cashmere — Made in Como', en: 'Gifts for Her in Silk & Cashmere — Made in Como' },
    description: {
      it: 'Idee regalo eleganti per lei: foulard in seta di Como e pashmine in cashmere, Made in Italy. Perfetti per matrimoni, anniversari e occasioni speciali.',
      en: 'Elegant gift ideas for her: Como silk foulards and cashmere pashminas, Made in Italy. Perfect for weddings, anniversaries and special occasions.',
    },
    intro: {
      it: 'Un foulard di seta o una pashmina in cashmere è il regalo rituale: elegante, autentico, Made in Como. Ideale per testimoni di nozze, anniversari e per chi ama il lusso vero.',
      en: 'A silk foulard or a cashmere pashmina is the ritual gift: elegant, authentic, Made in Como. Ideal for wedding witnesses, anniversaries and lovers of true luxury.',
    },
    faq: [
      {
        q: { it: 'Qual è un buon regalo elegante per una donna?', en: 'What is a good elegant gift for a woman?' },
        a: { it: 'Un foulard in seta di Como o una pashmina in cashmere: senza tempo e Made in Italy.', en: 'A Como silk foulard or a cashmere pashmina: timeless and Made in Italy.' },
      },
    ],
  },
];

export function getSeoCategory(slug: string): SeoCategory | undefined {
  return SEO_CATEGORIES.find((c) => c.slug === slug);
}

export const SEO_CATEGORY_SLUGS = SEO_CATEGORIES.map((c) => c.slug);
