'use client';

import { useState, useEffect } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAntibot } from '@/components/antibot/useAntibot';

type Props = {
  productSlug: string;
  isAuthenticated: boolean;
};

const NAME_LABEL: Record<string, string> = { it: 'Il tuo nome', en: 'Your name', de: 'Dein Name', fr: 'Votre nom', es: 'Tu nombre', pt: 'O seu nome', nl: 'Je naam' };

export function ReviewForm({ productSlug, isAuthenticated }: Props) {
  const t = useTranslations('product.reviews.form');
  const locale = useLocale();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(false);
  const { fields: antibotFields, Honeypot } = useAntibot();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Signed token from the post-delivery review email — lets an account-less
  // buyer review without logging in. Read from the URL on the client so the
  // PDP can stay statically rendered (no useSearchParams Suspense boundary).
  const [reviewToken, setReviewToken] = useState<string | null>(null);
  useEffect(() => {
    setReviewToken(new URLSearchParams(window.location.search).get('rt'));
  }, []);

  const isGuestToken = !isAuthenticated && !!reviewToken;

  if (!isAuthenticated && !reviewToken) {
    return (
      <div className="border border-pearl-grey/60 p-8 text-center bg-warm-white">
        <p className="font-display italic text-xl text-soft-black/80 mb-4">
          {t('loginRequired')}
        </p>
        <Link
          href={`/login?redirect=/prodotto/${productSlug}`}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-gold-primary/40 hover:border-gold-primary pb-1"
        >
          {t('login')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="border border-gold-primary/30 p-8 text-center bg-ivory">
        <p className="font-display italic text-xl text-soft-black/80">
          {t('thankYou')}
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError(t('ratingRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: productSlug,
          rating,
          title,
          comment,
          ...(reviewToken ? { rt: reviewToken, author_name: authorName } : {}),
          ...antibotFields(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || t('submitError'));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-pearl-grey/60 p-8 bg-warm-white space-y-6">
      <Honeypot />
      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/60 mb-3">
          {t('ratingLabel')}
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(s)}
              aria-label={t('starsAria', { count: s })}
              className="p-1"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  s <= (hoverRating || rating)
                    ? 'fill-gold-primary text-gold-primary'
                    : 'text-pearl-grey'
                }`}
                strokeWidth={1.4}
              />
            </button>
          ))}
        </div>
      </div>

      {isGuestToken && (
        <div>
          <label htmlFor="rev-name" className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/60 mb-2">
            {NAME_LABEL[locale] ?? NAME_LABEL.en}
          </label>
          <input
            id="rev-name"
            type="text"
            maxLength={80}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm focus:outline-none focus:border-gold-primary transition-colors"
          />
        </div>
      )}

      <div>
        <label htmlFor="rev-title" className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/60 mb-2">
          {t('titleLabel')}
        </label>
        <input
          id="rev-title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm focus:outline-none focus:border-gold-primary transition-colors"
        />
      </div>

      <div>
        <label htmlFor="rev-comment" className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/60 mb-2">
          {t('bodyLabel')}
        </label>
        <textarea
          id="rev-comment"
          rows={5}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm leading-relaxed focus:outline-none focus:border-gold-primary transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="group inline-flex items-center justify-center gap-3 px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-500 disabled:opacity-60"
      >
        {loading ? t('submitting') : t('submit')}
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
