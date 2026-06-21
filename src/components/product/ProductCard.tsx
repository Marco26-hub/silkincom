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

// Bellagio Cipria ships in three embroidered-logo colourways on the same
// powder-pink pashmina — the thumbnail can't show the tiny logo, so the SKUs
// look identical. Surface the logo colour as a swatch to tell them apart.
const LOGO_SWATCH: Record<string, string> = { bianco: '#ECE3D6', bordeaux: '#7A1F2B', marrone: '#6B4423' };
const LOGO_LABEL: Record<string, string> = { bianco: 'Bianco', bordeaux: 'Bordeaux', marrone: 'Marrone' };

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
  // Per-product override (admin-set) wins over the category-derived default.
  // Empty string / null / undefined → fall back to the category map.
  const typeKey = product.productType?.trim() || CATEGORY_TYPE[product.category] || '';
  // i18n keys live under product.types.* — fall back to '' (no badge) if the
  // type doesn't map to a known key so we don't render an empty chip.
  const KNOWN_TYPES = ['pashmina', 'scarf', 'twilly', 'cap', 'tshirt', 'shorts', 'shirt', 'beachTowel'];
  const typeLabel = typeKey && KNOWN_TYPES.includes(typeKey) ? t(`types.${typeKey}`) : '';
  // Bellagio variants embed their colourway in the name ("… logo marrone").
  const logoMatch = product.name.match(/logo\s+(bianco|bordeaux|marrone)/i);
  const logoColor = logoMatch ? logoMatch[1].toLowerCase() : '';
  return (
    <article className="group relative min-w-0">
      <Link href={`/prodotto/${product.slug}`} className="block">
        <div
          className="relative mb-4 aspect-[4/5] overflow-hidden bg-[#d8d0c3] transition-all duration-700 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:-translate-y-1"
          style={{
            background:
              'radial-gradient(ellipse at 50% 26%, #fdfaf4 0%, #f4eee3 60%, #e7dfd0 116%)',
            boxShadow:
              'inset 0 0 0 1px rgba(212,175,55,0.2), 0 18px 42px -28px rgba(23,23,23,0.4)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.4),transparent_46%,rgba(23,23,23,0.06))]" />
          <div className="pointer-events-none absolute inset-2.5 border border-warm-white/45 transition-colors duration-700 group-hover:border-gold-primary/65" />
          <span className="pointer-events-none absolute left-5 top-5 z-10 text-[8px] uppercase tracking-[0.35em] text-soft-black/55">
            Made in Como
          </span>

          {img1 && (
            <Image
              src={img1}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1400px) 25vw, 320px"
              quality={92}
              className={`object-contain p-3 pt-7 sm:p-6 sm:pt-9 md:p-9 md:pt-12 mix-blend-multiply brightness-[1.06] transition-all ease-[cubic-bezier(0.21,0.47,0.32,0.98)] drop-shadow-[0_12px_18px_rgba(23,23,23,0.12)] ${
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
              className="object-contain p-3 pt-7 sm:p-6 sm:pt-9 md:p-9 md:pt-12 mix-blend-multiply brightness-[1.06] transition-all duration-[1100ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] opacity-0 group-hover:opacity-100 scale-[1.02] group-hover:scale-100 drop-shadow-[0_12px_18px_rgba(23,23,23,0.12)]"
            />
          )}

          {/* Mobile: always-visible "view product" CTA (no hover). Desktop:
              revealed on hover. */}
          <div className="absolute inset-x-2.5 bottom-2.5 block translate-y-0 bg-soft-black/90 py-2.5 text-center opacity-100 backdrop-blur-sm transition-all duration-700 ease-out md:translate-y-2 md:py-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <span className="text-[9px] uppercase tracking-[0.3em] text-warm-white font-medium sm:text-[10px] sm:tracking-[0.35em]">
              {t('quickView')}
            </span>
          </div>
        </div>

        <div className="px-0.5">
          {(typeLabel || materialLabel) && (
            <div className="mb-2 flex min-h-4 items-center gap-1.5 overflow-hidden">
              {typeLabel && (
                <span className="truncate text-[8px] font-medium uppercase tracking-[0.28em] text-gold-dark sm:text-[9px]">
                  {typeLabel}
                </span>
              )}
              {typeLabel && materialLabel && (
                <span className="text-[9px] text-soft-black/30">/</span>
              )}
              {materialLabel && (
                <span className="truncate text-[8px] font-light uppercase tracking-[0.24em] text-soft-black/55 sm:text-[9px]">
                  {materialLabel}
                </span>
              )}
            </div>
          )}
          <h3 className="font-display text-[1.35rem] md:text-[1.7rem] font-normal leading-[1.02] text-soft-black group-hover:text-gold-dark transition-colors duration-500">
            {product.name}
          </h3>
          {logoColor && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-soft-black/25"
                style={{ backgroundColor: LOGO_SWATCH[logoColor] }}
                aria-hidden
              />
              <span className="text-[9px] font-light uppercase tracking-[0.22em] text-soft-black/70">
                {LOGO_LABEL[logoColor]}
              </span>
            </div>
          )}
          {product.descriptionShort && (
            <p className="mt-2 hidden text-[12px] font-light leading-relaxed text-soft-black/60 lg:line-clamp-2 lg:block">
              {product.descriptionShort}
            </p>
          )}
          <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-soft-black/15 pt-3">
            <p className="text-[13px] font-medium tracking-wide text-soft-black sm:text-[15px]">
              {formatPrice(product.price)}
            </p>
            {product.dimensions && (
              <p className="truncate text-[9px] font-light tracking-wide text-soft-black/50 sm:text-[10px]">
                {product.dimensions}
              </p>
            )}
          </div>
        </div>
      </Link>

      <button
        aria-label={wished ? t('wishlistRemove') : t('wishlistAdd')}
        onClick={(e) => {
          e.preventDefault();
          setWished((w) => !w);
        }}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-warm-white/25 bg-soft-black/75 text-warm-white shadow-sm backdrop-blur-sm transition-all duration-500 ease-out hover:border-gold-primary hover:text-gold-primary md:right-4 md:top-4 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100"
      >
        <Heart
          className={`w-[13px] h-[13px] transition-all duration-300 ${
            wished
              ? 'text-gold-dark fill-gold-primary scale-110'
              : 'text-current'
          }`}
          strokeWidth={1.4}
        />
      </button>
    </article>
  );
}
