'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Basic RFC-5322-ish email validation. Enough for live feedback; final
// validation still happens server-side at /api/newsletter.
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function Newsletter() {
  const t = useTranslations('home.newsletter');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isInvalid = touched && email.length > 0 && !EMAIL_RX.test(email);
  const isValid = email.length > 0 && EMAIL_RX.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !EMAIL_RX.test(email)) {
      setTouched(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || tc('error'));
      }

      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden border-t border-gold-primary/20 bg-[#11100e] py-24 text-warm-white md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="mx-auto grid max-w-[1300px] gap-12 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-end md:gap-20 lg:px-10"
      >
        <div>
          <span className="mb-6 block h-px w-12 bg-gold-primary" />
          <span className="mb-5 block text-[9px] uppercase tracking-[0.48em] text-gold-primary">{t('eyebrow')}</span>
          <h2 className="font-display text-5xl font-light leading-[0.9] tracking-[-0.035em] md:text-6xl lg:text-7xl">
            {t('titlePlain')}<br />
            <em className="italic text-gold-primary">{t('titleAccent')}</em>
          </h2>
        </div>

        <div>
          <p className="mb-9 max-w-xl text-sm font-light leading-[1.85] text-warm-white/60 md:text-base">{t('description')}</p>

        {submitted ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display text-2xl italic text-gold-primary"
          >
            {t('success')}
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3" noValidate>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={t('placeholder')}
                disabled={loading}
                aria-invalid={isInvalid || undefined}
                aria-describedby={isInvalid ? 'newsletter-error' : undefined}
                className={`flex-1 border-0 border-b bg-transparent px-0 py-4 text-sm text-warm-white placeholder:text-warm-white/30 focus:outline-none transition-colors disabled:opacity-50 ${
                  isInvalid
                    ? 'border-red-500 focus:border-red-500'
                    : isValid
                      ? 'border-gold-primary/60 focus:border-gold-primary'
                      : 'border-warm-white/25 focus:border-gold-primary'
                }`}
              />
              <button
                type="submit"
                disabled={loading || isInvalid}
                className="bg-gold-primary px-8 py-4 text-[9px] uppercase tracking-[0.3em] text-soft-black transition-all duration-300 hover:bg-warm-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t('submitting') : t('submit')}
              </button>
            </div>
            {isInvalid && (
              <p id="newsletter-error" className="text-xs text-red-600 text-left">
                {t('invalidEmail')}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </form>
        )}
        <p className="mt-4 max-w-md text-[10px] leading-relaxed text-warm-white/35">
          {t.rich('privacyDisclaimer', {
            link: (chunks) => (
              <Link href="/privacy-policy" className="underline hover:text-gold-primary transition-colors">
                {chunks}
              </Link>
            ),
          })}
        </p>
        </div>
      </motion.div>
    </section>
  );
}
