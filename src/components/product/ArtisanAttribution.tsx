/**
 * ArtisanAttribution — luxury attribution card for PDP.
 *
 * Renders only if product has a mapped artisan in src/data/artisans.ts.
 * Pure no-op when no mapping exists, so safe to mount everywhere.
 */
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { getProductArtisan } from '@/data/artisans';

export function ArtisanAttribution({ productSlug }: { productSlug: string }) {
  const artisan = getProductArtisan(productSlug);
  if (!artisan) return null;

  return (
    <div className="mt-6 mb-2 border border-pearl-grey/60 bg-ivory p-5 flex items-center gap-4">
      {artisan.portrait && (
        <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden border border-gold-primary/30">
          <Image
            src={artisan.portrait}
            alt={artisan.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.4em] text-gold-dark mb-1">
          Realizzato da
        </p>
        <Link
          href={`/artigiani/${artisan.slug}`}
          className="font-display text-lg leading-tight hover:text-gold-primary transition-colors"
        >
          {artisan.name}
        </Link>
        <p className="text-xs text-soft-black/60 mt-0.5">
          {artisan.role} · {artisan.city}
        </p>
      </div>
    </div>
  );
}
