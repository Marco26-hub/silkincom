import { Star } from 'lucide-react';

export function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex" aria-hidden>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= Math.round(rating) ? 'fill-gold-primary text-gold-primary' : 'text-pearl-grey'}`}
          strokeWidth={1.4}
        />
      ))}
    </div>
  );
}
