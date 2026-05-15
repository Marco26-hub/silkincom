'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function Newsletter() {
  const t = useTranslations('home.newsletter');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

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
    <section className="py-24 md:py-section bg-ivory overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="max-w-2xl mx-auto text-center px-6"
      >
        <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
          {t('eyebrow')}
        </span>
        <span className="block w-10 h-px bg-gold-primary mx-auto mb-7" />
        <h2 className="font-display font-light text-4xl md:text-5xl mb-6 leading-[1.05] tracking-[-0.005em]">
          {t('titlePlain')}<br />
          <em className="italic text-gold-primary">{t('titleAccent')}</em>
        </h2>
        <p className="text-base font-light text-soft-black/70 mb-10 leading-[1.8]">
          {t('description')}
        </p>

        {submitted ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display italic text-2xl text-gold-primary"
          >
            {t('success')}
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-lg mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholder')}
                disabled={loading}
                className="flex-1 px-5 py-4 bg-warm-white border border-pearl-grey text-sm focus:outline-none focus:border-gold-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('submitting') : t('submit')}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </form>
        )}
        <p className="text-[11px] text-soft-grey mt-4 max-w-md mx-auto leading-relaxed">
          {t.rich('privacyDisclaimer', {
            link: (chunks) => (
              <a href="/privacy-policy" className="underline hover:text-gold-primary transition-colors">
                {chunks}
              </a>
            ),
          })}
        </p>
      </motion.div>
    </section>
  );
}
