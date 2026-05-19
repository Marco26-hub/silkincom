'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

const REASON_VALUES = [
  'defective',
  'wrong_item',
  'not_as_described',
  'damaged_shipping',
  'too_small',
  'too_large',
  'changed_mind',
  'other',
] as const;

export function ReturnRequestForm({ orderId }: { orderId: string }) {
  const t = useTranslations('returnForm');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string; rn?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, reason, customer_notes: notes }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: 'success', text: data.message, rn: data.return_number });
      } else {
        setResult({ type: 'error', text: data.error || t('errorGeneric') });
      }
    } catch {
      setResult({ type: 'error', text: t('errorNetwork') });
    } finally {
      setLoading(false);
    }
  }

  if (result?.type === 'success') {
    return (
      <div className="border border-gold-primary/40 bg-ivory p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark mb-2">
          {t('requestSent')}
        </p>
        <p className="font-display text-lg mb-1">{result.rn}</p>
        <p className="text-sm font-light text-soft-black/70">{result.text}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-soft-black border-b border-pearl-grey hover:border-gold-primary hover:text-gold-primary pb-0.5 transition-colors"
      >
        {t('openButton')}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-pearl-grey/60 p-6 space-y-5 bg-warm-white">
      <div>
        <h3 className="font-display text-xl mb-1">{t('formTitle')}</h3>
        <p className="text-xs text-soft-black/60 font-light">
          {t('formIntro')}
        </p>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/70 mb-2">
          {t('reasonLabel')}
        </label>
        <select
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm focus:outline-none focus:border-gold-primary"
        >
          <option value="">{t('reasonPlaceholder')}</option>
          {REASON_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`reasons.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/70 mb-2">
          {t('notesLabel')}
        </label>
        <textarea
          rows={4}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm leading-relaxed focus:outline-none focus:border-gold-primary resize-none"
        />
      </div>

      {result?.type === 'error' && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">
          {result.text}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !reason}
          className="px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-60"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-8 py-3 border border-pearl-grey text-soft-black text-[10px] uppercase tracking-[0.3em] hover:border-gold-primary"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
