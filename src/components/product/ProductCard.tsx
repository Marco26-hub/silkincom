'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getMaterials, type Product } from '@/data/catalog-meta';

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function ProductCard({ product }: { product: Product }) {
  const img1 = product.images[0] || '';
  const img2 = product.images[1] || '';
  const [wished, setWished] = useState(false);
  const t = useTranslations('product');
  const locale = useLocale();
  const materialLabel = product.material
    ? getMaterials(locale).find((m) => m.slug === product.material)?.name ?? ''
    : '';
  const shortComp = product.composition?.split(/[\.\n]/)[0]?.trim() || '';

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
          {materialLabel && (
            <div className="flex items-center gap-2 mb-2">
              <span className="block w-3 h-px bg-gold-dark" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-gold-dark font-semibold">
                {materialLabel}
              </span>
            </div>
          )}
          <h3 className="font-display text-lg md:text-[22px] font-normal leading-[1.15] text-soft-black group-hover:text-gold-dark transition-colors duration-500">
            {product.name}
          </h3>
          {shortComp && (
            <p className="text-[11.5px] text-soft-black/65 font-light mt-1.5 line-clamp-1 tracking-[0.01em]">
              {shortComp}
            </p>
          )}
          <div className="flex items-baseline justify-between mt-3 pt-2.5 border-t border-pearl-grey/60">
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
