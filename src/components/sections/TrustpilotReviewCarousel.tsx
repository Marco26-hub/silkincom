'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react';
import type { TrustpilotReview } from '@/data/trustpilot-reviews';

type TrustpilotReviewCarouselProps = {
  reviews: TrustpilotReview[];
  locale: string;
  readOriginal: string;
  previousLabel: string;
  nextLabel: string;
  reviewLabel: string;
};

export function TrustpilotReviewCarousel({
  reviews,
  locale,
  readOriginal,
  previousLabel,
  nextLabel,
  reviewLabel,
}: TrustpilotReviewCarouselProps) {
  const [[activeIndex, direction], setSlide] = useState<[number, -1 | 0 | 1]>([
    0, 0,
  ]);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const review = reviews[activeIndex];
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  useEffect(() => {
    if (paused || reduceMotion || reviews.length < 2) return;

    const timer = window.setInterval(() => {
      setSlide(([index]) => [(index + 1) % reviews.length, 1]);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, reviews.length]);

  function move(direction: -1 | 1) {
    setSlide(([index]) => [
      (index + direction + reviews.length) % reviews.length,
      direction,
    ]);
  }

  function goTo(index: number) {
    if (index === activeIndex) return;
    setSlide([index, index > activeIndex ? 1 : -1]);
  }

  if (!review) return null;

  return (
    <div
      className="mx-auto max-w-[980px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') move(-1);
        if (event.key === 'ArrowRight') move(1);
      }}
    >
      <div className="relative min-h-[440px] overflow-hidden sm:mx-14 sm:min-h-[360px] lg:mx-20">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.article
            key={review.id}
            custom={direction}
            initial={
              reduceMotion
                ? false
                : { opacity: 0, x: direction === -1 ? -32 : 32 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: direction === -1 ? 32 : -32 }
            }
            transition={{
              duration: reduceMotion ? 0.15 : 0.6,
              ease: 'easeOut',
            }}
            className="absolute inset-0 flex flex-col border-y border-pearl-grey/80 bg-warm-white px-5 py-8 text-center sm:border sm:px-10 sm:py-9 md:px-14"
          >
            <span className="absolute right-5 top-5 font-display text-xs text-soft-black/35 sm:right-8 sm:top-7">
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(reviews.length).padStart(2, '0')}
            </span>
            <div
              className="mb-6 flex justify-center"
              aria-label={`${review.rating} su 5`}
            >
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

            <h3 className="mb-4 font-display text-2xl font-normal leading-tight sm:text-3xl md:text-4xl">
              {review.title}
            </h3>
            <blockquote className="mx-auto mb-7 max-w-2xl flex-1 text-sm font-light leading-[1.8] text-soft-black/75 sm:text-base">
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
                {readOriginal}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </footer>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="mx-auto mt-7 grid max-w-md grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-4 sm:grid-cols-[48px_minmax(0,1fr)_48px]">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label={previousLabel}
          title={previousLabel}
          className="flex h-11 w-11 items-center justify-center border border-soft-black/20 text-soft-black transition-colors hover:border-[#00b67a] hover:text-[#007a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b67a] sm:h-12 sm:w-12"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center justify-center gap-2">
          {reviews.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`${reviewLabel} ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              title={`${reviewLabel} ${index + 1}`}
              className="flex h-8 flex-1 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b67a] focus-visible:ring-offset-2"
            >
              <span
                className={`block h-px w-full transition-colors duration-500 ${
                  index === activeIndex
                    ? 'bg-[#00b67a]'
                    : 'bg-soft-black/20 hover:bg-soft-black/45'
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => move(1)}
          aria-label={nextLabel}
          title={nextLabel}
          className="flex h-11 w-11 items-center justify-center border border-soft-black/20 text-soft-black transition-colors hover:border-[#00b67a] hover:text-[#007a52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b67a] sm:h-12 sm:w-12"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
