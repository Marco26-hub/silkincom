'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';

// Commercial quick-nav placed immediately under the hero. The funnel data
// showed only ~11% of visits ever reached a product page — the editorial hero
// + value props pushed products two scrolls down. This band puts a priced,
// clickable category one tap away, above the fold on most viewports.
type Tile = { href: string; label: Record<string, string>; priceFrom: number; image: string };

const TILES: Tile[] = [
  { href: '/foulard-seta', priceFrom: 75, image: '/instagram/ig-02.webp', label: { it: 'Foulard di seta', en: 'Silk foulards', de: 'Seidentücher', fr: 'Foulards en soie', es: 'Foulards de seda', pt: 'Lenços de seda', nl: 'Zijden foulards' } },
  { href: '/sciarpe-seta', priceFrom: 70, image: '/instagram/ig-10.webp', label: { it: 'Sciarpe in cashmere', en: 'Cashmere scarves', de: 'Kaschmirschals', fr: 'Écharpes cachemire', es: 'Bufandas de cachemir', pt: 'Cachecóis de caxemira', nl: 'Kasjmier sjaals' } },
  { href: '/pashmine-cashmere', priceFrom: 120, image: '/instagram/ig-05.webp', label: { it: 'Pashmine in cashmere', en: 'Cashmere pashminas', de: 'Kaschmir-Pashminas', fr: 'Pashminas cachemire', es: 'Pashminas de cachemir', pt: 'Pashminas de caxemira', nl: 'Kasjmier pashmina’s' } },
  { href: '/camicie-lino', priceFrom: 75, image: '/instagram/ig-01.webp', label: { it: 'Camicie in lino', en: 'Linen shirts', de: 'Leinenhemden', fr: 'Chemises en lin', es: 'Camisas de lino', pt: 'Camisas de linho', nl: 'Linnen overhemden' } },
  { href: '/regalo-seta-donna', priceFrom: 0, image: '/instagram/ig-08.webp', label: { it: 'Idee regalo', en: 'Gift ideas', de: 'Geschenkideen', fr: 'Idées cadeaux', es: 'Ideas de regalo', pt: 'Ideias de presente', nl: 'Cadeau-ideeën' } },
];

const HEADING: Record<string, string> = { it: 'Acquista per categoria', en: 'Shop by category', de: 'Nach Kategorie kaufen', fr: 'Acheter par catégorie', es: 'Comprar por categoría', pt: 'Comprar por categoria', nl: 'Shop per categorie' };
const FROM: Record<string, string> = { it: 'da', en: 'from', de: 'ab', fr: 'dès', es: 'desde', pt: 'a partir de', nl: 'vanaf' };

export function ShopStrip() {
  const locale = useLocale();
  const pick = (m: Record<string, string>) => m[locale] ?? m.en ?? m.it;

  return (
    <section className="relative overflow-hidden bg-[#11100e] py-14 md:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(212,175,55,0.13),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(120,88,28,0.12),transparent_30%)]" />
      <div className="relative max-w-[1500px] mx-auto">
        <div className="flex items-end justify-between gap-6 px-6 lg:px-10 mb-8 md:mb-11">
          <div>
            <span className="mb-4 block h-px w-12 bg-gold-primary" />
            <h2 className="font-display text-3xl sm:text-4xl font-light text-warm-white">
              {pick(HEADING)}
            </h2>
          </div>
          <span className="hidden sm:block text-[9px] uppercase tracking-[0.38em] text-gold-primary/80">
            Como · Italia
          </span>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-5 md:gap-3 md:overflow-visible lg:px-10">
          {TILES.map((tile, index) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group relative min-w-[76vw] snap-center overflow-hidden border border-gold-primary/25 bg-soft-black aspect-[4/5] sm:min-w-[44vw] md:min-w-0 md:aspect-[3/4]"
            >
              <Image
                src={tile.image}
                alt={pick(tile.label)}
                fill
                sizes="(max-width: 767px) 76vw, 20vw"
                className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.06]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/10 transition-colors duration-700 group-hover:from-black" />
              <span className="absolute inset-3 border border-warm-white/15 transition-colors duration-700 group-hover:border-gold-primary/60" />
              <span className="absolute left-6 top-6 text-[9px] uppercase tracking-[0.35em] text-gold-primary">
                0{index + 1}
              </span>
              <span className="absolute inset-x-0 bottom-0 p-7">
                <span className="font-display block text-[2rem] md:text-2xl lg:text-[1.7rem] font-light leading-[1.02] text-warm-white">
                  {pick(tile.label)}
                </span>
                <span className="mt-4 flex items-center justify-between border-t border-warm-white/25 pt-4 text-[9px] uppercase tracking-[0.24em] text-warm-white/70">
                  <span>{tile.priceFrom > 0 ? `${pick(FROM)} €${tile.priceFrom}` : 'SILKinCOM'}</span>
                  <ArrowUpRight className="w-4 h-4 text-gold-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
