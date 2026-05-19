'use client';

import { useState } from 'react';
import { Star, Check, X, MessageSquare } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  product_name?: string;
  product_slug?: string;
  author_name?: string;
  author_email?: string;
  admin_reply?: string | null;
};

export function ReviewModerationRow({ review }: { review: Review }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'approve' | 'reject' | 'reply'>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState(review.admin_reply || '');

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    try {
      await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function saveReply() {
    setBusy('reply');
    try {
      await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', admin_reply: replyText }),
      });
      setReplyOpen(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border border-pearl-grey/60 bg-warm-white p-6">
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= review.rating
                      ? 'fill-gold-primary text-gold-primary'
                      : 'text-pearl-grey'
                  }`}
                  strokeWidth={1.4}
                />
              ))}
            </div>
            {review.is_verified_purchase && (
              <span className="text-[9px] uppercase tracking-[0.25em] text-gold-dark">
                Acquisto verificato
              </span>
            )}
          </div>
          {review.title && <h3 className="font-display text-lg mb-2">{review.title}</h3>}
          {review.comment && (
            <p className="text-sm font-light text-soft-black/75 leading-relaxed mb-3">
              {review.comment}
            </p>
          )}
          <p className="text-xs text-soft-black/60">
            <strong>Prodotto:</strong> {review.product_name || review.product_slug || '—'}
          </p>
          <p className="text-xs text-soft-black/60">
            <strong>Autore:</strong> {review.author_name || '—'}
            {review.author_email && ` (${review.author_email})`}
          </p>
          <p className="text-xs text-soft-black/40 mt-1">
            {new Date(review.created_at).toLocaleString('it-IT')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => act('approve')}
            disabled={!!busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-all disabled:opacity-60"
          >
            <Check className="w-3.5 h-3.5" />
            {busy === 'approve' ? '...' : 'Approva'}
          </button>
          <button
            onClick={() => act('reject')}
            disabled={!!busy}
            className="inline-flex items-center gap-2 px-4 py-2 border border-pearl-grey text-soft-black text-[10px] uppercase tracking-[0.2em] hover:bg-soft-black hover:text-warm-white transition-all disabled:opacity-60"
          >
            <X className="w-3.5 h-3.5" />
            {busy === 'reject' ? '...' : 'Rifiuta'}
          </button>
          <button
            onClick={() => setReplyOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold-primary/40 text-gold-primary text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary/10 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {review.admin_reply ? 'Modifica risposta' : 'Rispondi'}
          </button>
        </div>
      </div>

      {replyOpen && (
        <div className="mt-4 border-t border-pearl-grey pt-4 space-y-3">
          {review.admin_reply && (
            <p className="text-xs text-soft-black/60 italic">Risposta attuale: &ldquo;{review.admin_reply}&rdquo;</p>
          )}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Scrivi la risposta pubblica alla recensione..."
            className="w-full px-3 py-2 border border-pearl-grey text-sm font-light focus:outline-none focus:border-gold-primary resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={saveReply}
              disabled={busy === 'reply'}
              className="px-5 py-2 bg-gold-primary text-soft-black text-[10px] uppercase tracking-[0.2em] disabled:opacity-60"
            >
              {busy === 'reply' ? 'Salvataggio...' : 'Salva risposta'}
            </button>
            <button onClick={() => setReplyOpen(false)} className="px-4 py-2 text-xs text-soft-grey hover:text-soft-black">
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
