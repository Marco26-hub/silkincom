import { ExternalLink, Star } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import {
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEWS,
  TRUSTPILOT_SUMMARY,
} from '@/data/trustpilot-reviews';

type Copy = {
  eyebrow: string;
  title: string;
  accent: string;
  reviews: string;
  readOriginal: string;
  viewAll: string;
};

const COPY: Record<string, Copy> = {
  it: {
    eyebrow: 'Recensioni su Trustpilot',
    title: 'Esperienze vere,',
    accent: 'eleganza condivisa.',
    reviews: 'recensioni',
    readOriginal: 'Leggi su Trustpilot',
    viewAll: 'Vedi tutte le recensioni',
  },
  en: {
    eyebrow: 'Reviews on Trustpilot',
    title: 'Real experiences,',
    accent: 'shared elegance.',
    reviews: 'reviews',
    readOriginal: 'Read on Trustpilot',
    viewAll: 'See all reviews',
  },
  de: {
    eyebrow: 'Bewertungen auf Trustpilot',
    title: 'Echte Erfahrungen,',
    accent: 'geteilte Eleganz.',
    reviews: 'Bewertungen',
    readOriginal: 'Auf Trustpilot lesen',
    viewAll: 'Alle Bewertungen ansehen',
  },
  fr: {
    eyebrow: 'Avis sur Trustpilot',
    title: 'Expériences réelles,',
    accent: 'élégance partagée.',
    reviews: 'avis',
    readOriginal: 'Lire sur Trustpilot',
    viewAll: 'Voir tous les avis',
  },
  es: {
    eyebrow: 'Opiniones en Trustpilot',
    title: 'Experiencias reales,',
    accent: 'elegancia compartida.',
    reviews: 'opiniones',
    readOriginal: 'Leer en Trustpilot',
    viewAll: 'Ver todas las opiniones',
  },
  pt: {
    eyebrow: 'Avaliações no Trustpilot',
    title: 'Experiências reais,',
    accent: 'elegância partilhada.',
    reviews: 'avaliações',
    readOriginal: 'Ler no Trustpilot',
    viewAll: 'Ver todas as avaliações',
  },
  nl: {
    eyebrow: 'Reviews op Trustpilot',
    title: 'Echte ervaringen,',
    accent: 'gedeelde elegantie.',
    reviews: 'reviews',
    readOriginal: 'Lees op Trustpilot',
    viewAll: 'Bekijk alle reviews',
  },
};

type TrustpilotReviewsProps = {
  limit?: number;
  compact?: boolean;
};

export async function TrustpilotReviews({
  limit = TRUSTPILOT_REVIEWS.length,
  compact = false,
}: TrustpilotReviewsProps) {
  const locale = await getLocale();
  const copy = COPY[locale] ?? COPY.it;
  const reviews = TRUSTPILOT_REVIEWS.slice(0, limit);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <section
      id="trustpilot-reviews"
      aria-labelledby="trustpilot-reviews-title"
      className={
        compact ? 'bg-warm-white py-16 md:py-20' : 'bg-[#f2ede4] py-20 md:py-28'
      }
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <header className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
          <span className="mx-auto mb-4 block h-px w-12 bg-[#00b67a]" />
          <span className="mb-4 block text-[9px] uppercase text-soft-black/60">
            {copy.eyebrow}
          </span>
          <h2
            id="trustpilot-reviews-title"
            className="mb-6 font-display text-4xl font-light leading-[1.05] md:text-5xl"
          >
            {copy.title}{' '}
            <em className="italic text-gold-dark">{copy.accent}</em>
          </h2>
          <a
            href={TRUSTPILOT_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-soft-black/70 transition-colors hover:text-soft-black"
          >
            <span className="font-semibold text-soft-black">Trustpilot</span>
            <span
              className="flex"
              aria-label={`${TRUSTPILOT_SUMMARY.trustScore} su 5`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(TRUSTPILOT_SUMMARY.trustScore)
                      ? 'fill-[#00b67a] text-[#00b67a]'
                      : 'fill-pearl-grey text-pearl-grey'
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span>
              TrustScore {TRUSTPILOT_SUMMARY.trustScore.toLocaleString(locale)}{' '}
              / 5{' · '}
              {TRUSTPILOT_SUMMARY.reviewCount} {copy.reviews}
            </span>
          </a>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="flex min-h-[280px] flex-col border border-pearl-grey/70 bg-warm-white p-7 md:p-8"
            >
              <div className="mb-5 flex" aria-label={`${review.rating} su 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= review.rating
                        ? 'fill-[#00b67a] text-[#00b67a]'
                        : 'text-pearl-grey'
                    }`}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <h3 className="mb-3 font-display text-xl font-normal leading-tight">
                {review.title}
              </h3>
              <blockquote className="mb-7 flex-1 text-sm font-light leading-[1.75] text-soft-black/75">
                &ldquo;{review.body}&rdquo;
              </blockquote>
              <footer className="border-t border-pearl-grey/50 pt-5">
                <p className="mb-1 text-[11px] font-medium uppercase text-soft-black/70">
                  {review.author}
                </p>
                <p className="mb-4 text-[10px] uppercase text-soft-black/40">
                  {dateFormatter.format(new Date(review.experiencedAt))}
                </p>
                <a
                  href={review.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[10px] uppercase text-soft-black/60 transition-colors hover:text-[#007a52]"
                >
                  {copy.readOriginal}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </footer>
            </article>
          ))}
        </div>

        {limit < TRUSTPILOT_REVIEWS.length && (
          <div className="mt-10 text-center">
            <a
              href={TRUSTPILOT_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-b border-soft-black pb-1 text-[10px] uppercase text-soft-black transition-colors hover:border-[#00b67a] hover:text-[#007a52]"
            >
              {copy.viewAll}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
