'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getMaterials, type Product } from '@/data/catalog-meta';

// Each storefront category maps to a product TYPE shown as the secondary
// eyebrow above the product name (e.g. "T-shirt", "Cappellino"). Keeps the
// shopper oriented when the brand-named categories (Lario, Darsena, Bellagio,
// …) don't immediately read as garment types.
const CATEGORY_TYPE: Record<string, string> = {
  bellagio: 'pashmina',
  cernobbio: 'scarf',
  tremezzo: 'scarf',
  varenna: 'scarf',
  'twilly-como': 'twilly',
  darsena: 'cap',
  lario: 'tshirt',
  melzi: 'shorts',
  riva: 'shirt',
  tivan: 'beachTowel',
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// Parse composition text ("95% cotone, 5% elastan", "53% lino, 47% cotone",
// "100% Cotone") and return an uppercase eyebrow that reflects the blend.
// Single fiber → "COTONE". Two-fiber blend → "COTONE / EA" or "LINO /
// COTONE". Elastane is abbreviated to "EA" because it never wants the full
// word on a chip; everything else stays full so the brand voice stays
// editorial rather than acronym-spam.
const ABBREVIATED: Record<string, string> = {
  elastan: 'EA',
  elastane: 'EA',
  elastico: 'EA',
  elastiek: 'EA',
};
function deriveMaterialEyebrow(composition: string, fallback: string): string {
  if (!composition) return fallback.toUpperCase();
  // Keep the highest percentage per fibre. Compositions often repeat the
  // blend (spec line + descriptive prose), which would otherwise surface the
  // same fibre twice — e.g. "LINO / LINO" for a 53% lino / 47% cotone shirt.
  const byFibre = new Map<string, number>();
  for (const m of composition.matchAll(/(\d+(?:[.,]\d+)?)\s*%\s*([A-Za-zÀ-ÿ]+)/g)) {
    const pct = Number(m[1].replace(',', '.'));
    const name = m[2].toLowerCase();
    if (Number.isFinite(pct) && pct > 0) {
      byFibre.set(name, Math.max(byFibre.get(name) ?? 0, pct));
    }
  }
  const fibres = Array.from(byFibre, ([name, pct]) => ({ name, pct }))
    .sort((a, b) => b.pct - a.pct);
  if (fibres.length === 0) return fallback.toUpperCase();
  const norm = (s: string) => (ABBREVIATED[s] ?? s).toUpperCase();
  if (fibres.length === 1) return norm(fibres[0].name);
  // Two or more fibres: show the top two so the chip stays readable.
  return `${norm(fibres[0].name)} / ${norm(fibres[1].name)}`;
}

export function ProductCard({ product }: { product: Product }) {
  const img1 = product.images[0] || '';
  const img2 = product.images[1] || '';
  const [wished, setWished] = useState(false);
  const t = useTranslations('product');
  const locale = useLocale();
  const taxonomyName = product.material
    ? getMaterials(locale).find((m) => m.slug === product.material)?.name ?? ''
    : '';
  const materialLabel = taxonomyName
    ? deriveMaterialEyebrow(product.composition || '', taxonomyName)
    : '';
  const typeKey = CATEGORY_TYPE[product.category];
  // i18n keys live under product.types.* — fall back to '' (no badge) if the
  // category doesn't map to a known type so we don't render an empty chip.
  const typeLabel = typeKey ? t(`types.${typeKey}`) : '';
  return (
    <article className="group relative">
      <Link href={`/prodotto/${product.slug}`} className="block">
        {/* Image well — luxury gradient bg, soft inner shadow, gold accent */}
        <div
          className="relative aspect-[4/5] overflow-hidden mb-5 transition-all duration-700 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:-translate-y-1"
          style={{
            background:
              'radial-gradient(ellipse at 50% 35%, #FFFDF8 0%, #F7F2EA 55%, #EDE3D3 100%)',
            boxShadow:
              '0 1px 2px rgba(23,23,23,0.04), inset 0 0 0 1px rgba(212,175,55,0.06), 0 12px 32px -16px rgba(23,23,23,0.10)',
          }}
        >
          {/* Subtle radial spotlight (top) */}
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,253,248,0.85) 0%, transparent 70%)',
            }}
          />

          {/* Floor shadow under product (subtle ground) */}
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[60%] h-3 opacity-40 blur-md"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(23,23,23,0.35) 0%, transparent 70%)',
            }}
          />

          {img1 && (
            <Image
              src={img1}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1400px) 25vw, 320px"
              quality={92}
              className={`object-contain p-7 md:p-9 transition-all ease-[cubic-bezier(0.21,0.47,0.32,0.98)] drop-shadow-[0_8px_18px_rgba(23,23,23,0.10)] ${
                img2
                  ? 'duration-[1100ms] group-hover:opacity-0 group-hover:scale-[1.02]'
                  : 'duration-[1500ms] group-hover:scale-[1.05]'
              }`}
            />
          )}
          {img2 && (
            <Image
              src={img2}
              alt={`${product.name} — vista 2`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1400px) 25vw, 320px"
              quality={92}
              className="object-contain p-7 md:p-9 transition-all duration-[1100ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] opacity-0 group-hover:opacity-100 scale-[1.02] group-hover:scale-100 drop-shadow-[0_8px_18px_rgba(23,23,23,0.10)]"
            />
          )}

          {/* Gold corner accent — top-left */}
          <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <span className="absolute top-0 left-0 w-full h-px bg-gold-primary" />
            <span className="absolute top-0 left-0 w-px h-full bg-gold-primary" />
          </div>
          {/* Gold corner accent — bottom-right */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <span className="absolute bottom-0 right-0 w-full h-px bg-gold-primary" />
            <span className="absolute bottom-0 right-0 w-px h-full bg-gold-primary" />
          </div>

          {/* Gold hairline frame on hover */}
          <div className="pointer-events-none absolute inset-0 border border-gold-primary/0 group-hover:border-gold-primary/30 transition-colors duration-700" />

          {/* Quick view label — bottom hover */}
          <div className="absolute left-0 right-0 bottom-0 py-3 bg-gradient-to-t from-soft-black/90 via-soft-black/60 to-transparent text-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 ease-out">
            <span className="text-[10px] uppercase tracking-[0.35em] text-warm-white font-medium">
              {t('quickView')}
            </span>
          </div>
        </div>

        {/* Text block — premium hierarchy */}
        <div className="px-1">
          {(typeLabel || materialLabel) && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="block w-3 h-px bg-gold-dark" />
              {typeLabel && (
                <span className="text-[10px] uppercase tracking-[0.4em] text-gold-dark font-semibold">
                  {typeLabel}
                </span>
              )}
              {typeLabel && materialLabel && (
                <span className="text-[10px] text-soft-black/30">·</span>
              )}
              {materialLabel && (
                <span className="text-[10px] uppercase tracking-[0.4em] text-soft-black/55 font-light">
                  {materialLabel}
                </span>
              )}
            </div>
          )}
          <h3 className="font-display text-lg md:text-[22px] font-normal leading-[1.15] text-soft-black group-hover:text-gold-dark transition-colors duration-500">
            {product.name}
          </h3>
          {product.descriptionShort && (
            <p className="text-[12px] text-soft-black/65 font-light mt-2 line-clamp-2 leading-relaxed">
              {product.descriptionShort}
            </p>
          )}
          <div className="flex items-baseline justify-between mt-4 pt-2.5 border-t border-pearl-grey/60">
            <p className="text-[15px] font-medium text-soft-black tracking-wide">
              {formatPrice(product.price)}
            </p>
            {product.dimensions && (
              <p className="text-[11px] text-soft-black/55 font-light tracking-wide">
                {product.dimensions}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Wishlist — refined, minimal */}
      <button
        aria-label={wished ? t('wishlistRemove') : t('wishlistAdd')}
        onClick={(e) => {
          e.preventDefault();
          setWished((w) => !w);
        }}
        className="absolute top-3.5 right-3.5 w-11 h-11 md:w-9 md:h-9 flex items-center justify-center bg-warm-white/85 backdrop-blur-sm shadow-sm rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-warm-white transition-all duration-500 ease-out"
      >
        <Heart
          className={`w-[15px] h-[15px] transition-all duration-300 ${
            wished
              ? 'text-gold-dark fill-gold-primary scale-110'
              : 'text-soft-black hover:text-gold-dark'
          }`}
          strokeWidth={1.4}
        />
      </button>
    </article>
  );
}
