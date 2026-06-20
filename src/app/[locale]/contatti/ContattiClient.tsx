'use client';

import { Mail, MapPin, Instagram, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export function ContattiClient() {
  const t = useTranslations('contatti');
  const nav = useTranslations('nav');
  const locale = useLocale();
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    numero_ordine: '',
    messaggio: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/contatti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('error'));
      }

      setSuccess(true);
      setFormData({
        nome: '',
        cognome: '',
        email: '',
        telefono: '',
        numero_ordine: '',
        messaggio: '',
      });

      // Scroll into view so the user sees the confirmation immediately.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 7000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BreadcrumbSchema
        locale={locale}
        trail={[
          { name: nav('home'), path: '/' },
          { name: t('title'), path: '/contatti' },
        ]}
      />
      {/* Floating success toast — fixed at top so the user sees it after
          scrollTo + ensures feedback is unmissable on mobile. */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-soft-black text-warm-white border-l-2 border-gold-primary shadow-2xl px-5 py-4 flex items-start gap-3"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-5 h-5 text-gold-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm font-light leading-relaxed">{t('success')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="pt-28 md:pt-40 pb-16 bg-ivory">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center">
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            {t('eyebrow')}
          </span>
          <h1 className="font-display font-light text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
            <em className="italic text-gold-primary">{t('title')}</em>
          </h1>
          <p className="max-w-2xl mx-auto text-base font-light text-soft-black/70">
            {t('description')}
          </p>
        </div>
      </section>

      <section className="py-20 bg-warm-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] mb-2 text-soft-grey">{t('firstName')}</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] mb-2 text-soft-grey">{t('lastName')}</label>
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] mb-2 text-soft-grey">{t('email')} *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] mb-2 text-soft-grey">{t('phone')}</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] mb-2 text-soft-grey">{t('orderNumber')}</label>
              <input
                type="text"
                value={formData.numero_ordine}
                onChange={(e) => setFormData({ ...formData, numero_ordine: e.target.value })}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.2em] mb-2 text-soft-grey">{t('message')} *</label>
              <textarea
                rows={5}
                required
                value={formData.messaggio}
                onChange={(e) => setFormData({ ...formData, messaggio: e.target.value })}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
                {t('success')}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          {/* Info */}
          <div className="space-y-10 lg:pl-10">
            <div>
              <Mail className="w-6 h-6 text-gold-primary stroke-1 mb-4" />
              <h3 className="font-display text-2xl font-light mb-2">{t('emailLabel')}</h3>
              <a href="mailto:info@silkincom.com" className="text-soft-black/80 hover:text-gold-primary transition-colors">info@silkincom.com</a>
            </div>
            <div>
              <MapPin className="w-6 h-6 text-gold-primary stroke-1 mb-4" />
              <h3 className="font-display text-2xl font-light mb-2">{t('addressLabel')}</h3>
              <p className="text-soft-black/80 leading-relaxed">
                SILKinCOM<br />
                Via Giuseppe Verdi 2/B<br />
                22072 Cermenate (CO)<br />
                Italia
              </p>
            </div>
            <div>
              <Instagram className="w-6 h-6 text-gold-primary stroke-1 mb-4" />
              <h3 className="font-display text-2xl font-light mb-2">{t('socialLabel')}</h3>
              <a href="https://www.instagram.com/silkincom.official/" target="_blank" rel="noopener noreferrer" className="text-soft-black/80 hover:text-gold-primary transition-colors">
                @silkincom.official
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
