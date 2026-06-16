'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

type OrderSummary = {
  orderNumber: string;
  customerName: string | null;
  items: { name: string; quantity: number }[];
  total: number;
  currency: string;
  withinWindow: boolean;
  alreadyRequested: boolean;
  existingNumber?: string;
};

type Step = 'identify' | 'review' | 'done';

export function RecessoForm() {
  const t = useTranslations('recessoForm');
  const locale = useLocale();

  const [step, setStep] = useState<Step>('identify');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number?: string; receiptSent: boolean } | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !orderNumber.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recesso/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 404 ? t('notFound') : data.error || t('errorGeneric'));
        return;
      }
      const o = data.order as OrderSummary;
      if (o.alreadyRequested) {
        setError(t('alreadyRequested', { number: o.existingNumber || '' }));
        return;
      }
      if (!o.withinWindow) {
        setError(t('windowExpired'));
        return;
      }
      setOrder(o);
      setStep('review');
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (loading || !order) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recesso/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.orderNumber, email: email.trim(), locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 409 ? t('windowExpired') : data.error || t('errorGeneric'),
        );
        return;
      }
      setDone({ number: data.withdrawalNumber, receiptSent: data.receiptSent !== false });
      setStep('done');
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  // ---- Done ---------------------------------------------------------------
  if (step === 'done' && done) {
    return (
      <div className="not-prose border border-gold-primary/40 bg-ivory p-6 sm:p-8" id="recesso-form">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-4 h-4 text-gold-dark" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark">{t('successTitle')}</p>
        </div>
        {done.number && <p className="font-display text-2xl mb-2">{done.number}</p>}
        <p className="text-sm font-light text-soft-black/75 leading-relaxed">
          {t('successBody', { number: done.number || '' })}
        </p>
        <p className="text-sm font-light text-soft-black/75 leading-relaxed mt-2">
          {done.receiptSent ? t('successReceipt') : t('successNoEmail')}
        </p>
      </div>
    );
  }

  // ---- Review (double-confirm) -------------------------------------------
  if (step === 'review' && order) {
    return (
      <div className="not-prose border border-pearl-grey/60 bg-warm-white p-6 sm:p-8" id="recesso-form">
        <h3 className="font-display text-xl mb-1">{t('step2Title')}</h3>
        <p className="text-xs text-soft-black/60 font-light mb-5">{t('reviewIntro')}</p>

        <dl className="space-y-3 mb-6 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.3em] text-soft-black/55 mb-1">{t('orderLabel')}</dt>
            <dd className="font-light">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.3em] text-soft-black/55 mb-1">{t('itemsLabel')}</dt>
            <dd className="font-light">
              <ul className="space-y-1">
                {order.items.map((it, i) => (
                  <li key={i}>
                    {it.name}
                    {it.quantity > 1 ? ` · ×${it.quantity}` : ''}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-60"
          >
            {loading ? t('confirming') : t('confirmButton')}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('identify');
              setError(null);
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-3 border border-pearl-grey text-soft-black text-[10px] uppercase tracking-[0.3em] hover:border-gold-primary disabled:opacity-60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  // ---- Identify -----------------------------------------------------------
  return (
    <form
      onSubmit={handleLookup}
      className="not-prose border border-pearl-grey/60 bg-warm-white p-6 sm:p-8 space-y-5"
      id="recesso-form"
    >
      <div>
        <h3 className="font-display text-xl mb-1">{t('step1Title')}</h3>
        <p className="text-xs text-soft-black/60 font-light">{t('intro')}</p>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/70 mb-2">
          {t('orderNumberLabel')}
        </label>
        <input
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder={t('orderNumberPlaceholder')}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm focus:outline-none focus:border-gold-primary"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/70 mb-2">
          {t('emailLabel')}
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm focus:outline-none focus:border-gold-primary"
        />
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !orderNumber.trim() || !email.trim()}
        className="inline-flex items-center gap-2 px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-60"
      >
        {loading ? t('looking') : t('lookupButton')}
        {!loading && <ArrowRight className="w-3.5 h-3.5" />}
      </button>
    </form>
  );
}
