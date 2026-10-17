'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Check } from 'lucide-react';
import { useAntibot } from '@/components/antibot/useAntibot';
import { Link } from '@/i18n/navigation';
import { normLocale } from '@/data/catalog-meta';
import { WINTER_PRODUCTS } from '@/data/winter-2026';
import { WINTER_SIGNUP_COPY } from '@/data/winter-2026-signup-copy';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const previewProducts = [
  { value: 'brunate', label: 'Brunate · girocollo' },
  { value: 'menaggio', label: 'Menaggio · berretto' },
  { value: 'domaso', label: 'Domaso · termica merino' },
  { value: 'capsule', label: 'La capsule completa' },
] as const;

export function WinterPreviewSignup({ previewOnly = false }: { previewOnly?: boolean }) {
  const locale = normLocale(useLocale());
  const t = WINTER_SIGNUP_COPY[locale];
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState('');
  const [product, setProduct] = useState('capsule');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { fields, Honeypot } = useAntibot();
  useEffect(() => {
    const interest = searchParams.get('interesse');
    if (interest && previewProducts.some(item => item.value === interest)) setProduct(interest);
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_RX.test(email)) {
      setError(t.invalid);
      return;
    }
    if (!consent) { setError(t.consent); return; }
    if (previewOnly) {
      console.info('[winter-2026] Local signup preview: external submission skipped.');
      setSubmitted(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: `inverno-2026-${product}`,
          ...fields(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.failed);

      setSubmitted(true);
      setEmail('');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t.failed);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-10 flex max-w-xl items-start gap-4 border border-[#e4c06d]/40 bg-white/[0.04] p-6 text-left">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#e4c06d]" />
        <div>
          <p className="font-display text-2xl italic text-[#e4c06d]">{t.received}</p>
          <p className="mt-2 text-xs font-light leading-relaxed text-white/60">
            {previewOnly ? t.preview : t.confirm}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-2xl text-left" noValidate>
      <Honeypot />
      <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr_auto]">
        <label className="sr-only" htmlFor="winter-preview-email">{t.email}</label>
        <input
          id="winter-preview-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.email}
          className="min-h-14 border border-white/20 bg-white/[0.04] px-5 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#e4c06d]"
        />
        <label className="sr-only" htmlFor="winter-preview-product">{t.interest}</label>
        <select
          id="winter-preview-product"
          value={product}
          onChange={(event) => setProduct(event.target.value)}
          className="min-h-14 border border-white/20 bg-[#111216] px-5 text-xs text-white outline-none transition-colors focus:border-[#e4c06d]"
        >
          {previewProducts.map((item) => (
            <option key={item.value} value={item.value}>{item.value === 'capsule' ? t.capsule : WINTER_PRODUCTS.find(product => product.key === item.value)?.content[locale].name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-14 items-center justify-center gap-2 bg-[#e4c06d] px-6 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#11100e] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? t.sending : t.notify} <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="mt-4 flex items-start gap-3 text-[11px] leading-relaxed text-white/70">
        <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#e4c06d]" />
        <span>{t.consent} <Link href="/privacy-policy" className="underline underline-offset-2">{t.privacy}</Link></span>
      </label>
      {error ? <p role="alert" className="mt-3 text-xs text-red-300">{error}</p> : null}
      <p className="mt-4 text-[10px] font-light leading-relaxed text-white/38">
        {previewOnly ? t.preview : t.note}
      </p>
    </form>
  );
}
