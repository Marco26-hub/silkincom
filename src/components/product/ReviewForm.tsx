'use client';

import { useState } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Props = {
  productSlug: string;
  isAuthenticated: boolean;
};

export function ReviewForm({ productSlug, isAuthenticated }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="border border-pearl-grey/60 p-8 text-center bg-warm-white">
        <p className="font-display italic text-xl text-soft-black/80 mb-4">
          Per lasciare una recensione devi essere registrato.
        </p>
        <Link
          href={`/login?redirect=/prodotto/${productSlug}`}
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-gold-primary/40 hover:border-gold-primary pb-1"
        >
          Accedi <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="border border-gold-primary/30 p-8 text-center bg-ivory">
        <p className="font-display italic text-xl text-soft-black/80">
          Grazie. La sua recensione sarà visibile dopo moderazione.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError('Seleziona un punteggio.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: productSlug, rating, title, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Errore invio recensione');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-pearl-grey/60 p-8 bg-warm-white space-y-6">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/60 mb-3">
          Punteggio
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(s)}
              aria-label={`${s} stelle`}
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

      <div>
        <label htmlFor="rev-title" className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/60 mb-2">
          Titolo (facoltativo)
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
          La sua recensione
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
        {loading ? 'Invio…' : 'Invia recensione'}
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
