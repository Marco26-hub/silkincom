'use client';

import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';

// Commercial quick-nav placed immediately under the hero. The funnel data
// showed only ~11% of visits ever reached a product page — the editorial hero
// + value props pushed products two scrolls down. This band puts a priced,
// clickable category one tap away, above the fold on most viewports.
type Tile = { href: string; label: Record<string, string>; priceFrom: number };

const TILES: Tile[] = [
  { href: '/foulard-seta', priceFrom: 75, label: { it: 'Foulard di seta', en: 'Silk foulards', de: 'Seidentücher', fr: 'Foulards en soie', es: 'Foulards de seda', pt: 'Lenços de seda', nl: 'Zijden foulards' } },
  { href: '/sciarpe-seta', priceFrom: 70, label: { it: 'Sciarpe in cashmere', en: 'Cashmere scarves', de: 'Kaschmirschals', fr: 'Écharpes cachemire', es: 'Bufandas de cachemir', pt: 'Cachecóis de caxemira', nl: 'Kasjmier sjaals' } },
  { href: '/pashmine-cashmere', priceFrom: 120, label: { it: 'Pashmine in cashmere', en: 'Cashmere pashminas', de: 'Kaschmir-Pashminas', fr: 'Pashminas cachemire', es: 'Pashminas de cachemir', pt: 'Pashminas de caxemira', nl: 'Kasjmier pashmina’s' } },
  { href: '/camicie-lino', priceFrom: 75, label: { it: 'Camicie in lino', en: 'Linen shirts', de: 'Leinenhemden', fr: 'Chemises en lin', es: 'Camisas de lino', pt: 'Camisas de linho', nl: 'Linnen overhemden' } },
  { href: '/regalo-seta-donna', priceFrom: 0, label: { it: 'Idee regalo', en: 'Gift ideas', de: 'Geschenkideen', fr: 'Idées cadeaux', es: 'Ideas de regalo', pt: 'Ideias de presente', nl: 'Cadeau-ideeën' } },
];

const HEADING: Record<string, string> = { it: 'Acquista per categoria', en: 'Shop by category', de: 'Nach Kategorie kaufen', fr: 'Acheter par catégorie', es: 'Comprar por categoría', pt: 'Comprar por categoria', nl: 'Shop per categorie' };
const FROM: Record<string, string> = { it: 'da', en: 'from', de: 'ab', fr: 'dès', es: 'desde', pt: 'a partir de', nl: 'vanaf' };

export function ShopStrip() {
  const locale = useLocale();
  const pick = (m: Record<string, string>) => m[locale] ?? m.en ?? m.it;

  return (
    <section className="bg-ivory border-b border-pearl-grey/40 py-10 md:py-14">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-center gap-3 mb-7 md:mb-9">
          <span className="block h-px w-8 bg-gold-primary/60" />
          <h2 className="text-[10px] uppercase tracking-[0.4em] text-gold-dark">{pick(HEADING)}</h2>
          <span className="block h-px w-8 bg-gold-primary/60" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex min-h-[116px] flex-col justify-between gap-5 border border-pearl-grey/70 bg-warm-white px-5 py-6 transition-all duration-500 hover:border-gold-primary/60 hover:shadow-soft"
            >
              <span className="font-display text-lg md:text-xl font-light leading-tight text-soft-black transition-colors group-hover:text-gold-dark">
                {pick(tile.label)}
              </span>
              <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                <span>{tile.priceFrom > 0 ? `${pick(FROM)} €${tile.priceFrom}` : ' '}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gold-primary transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
