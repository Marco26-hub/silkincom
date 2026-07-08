'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { useAntibot } from '@/components/antibot/useAntibot';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FormState = {
  nome: string;
  azienda: string;
  email: string;
  telefono: string;
  tipo: string;
  volume: string;
  messaggio: string;
  privacy: boolean;
};

const INITIAL: FormState = {
  nome: '',
  azienda: '',
  email: '',
  telefono: '',
  tipo: '',
  volume: '',
  messaggio: '',
  privacy: false,
};

export function B2BForm() {
  const t = useTranslations('b2bPage.form');
  const tc = useTranslations('common');
  const [data, setData] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fields: antibotFields, Honeypot } = useAntibot();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!data.nome.trim()) return setError(t('requiredName'));
    if (!data.email.trim() || !EMAIL_RX.test(data.email)) return setError(t('invalidEmail'));
    if (!data.messaggio.trim()) return setError(t('requiredMessage'));
    if (!data.privacy) return setError(t('requiredPrivacy'));

    setLoading(true);
    try {
      const res = await fetch('/api/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: data.nome.trim(),
          azienda: data.azienda.trim() || null,
          email: data.email.trim().toLowerCase(),
          telefono: data.telefono.trim() || null,
          tipo: data.tipo || null,
          volume: data.volume.trim() || null,
          messaggio: data.messaggio.trim(),
          ...antibotFields(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || tc('error'));
      setSubmitted(true);
      setData(INITIAL);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center bg-warm-white text-soft-black px-8 py-12">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-4">{t('successEyebrow')}</p>
        <h3 className="font-display font-light text-3xl md:text-4xl mb-4">{t('successTitle')}</h3>
        <p className="text-sm text-soft-black/70 leading-relaxed">{t('successBody')}</p>
      </div>
    );
  }

  const inputCls =
    'w-full bg-transparent border-b border-warm-white/30 text-warm-white text-sm py-3 px-1 focus:outline-none focus:border-gold-primary placeholder:text-warm-white/40 transition-colors';
  const labelCls = 'block text-[10px] uppercase tracking-[0.3em] text-warm-white/60 mb-2';

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto text-left" noValidate>
      <Honeypot />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="b2b-nome" className={labelCls}>{t('nomeLabel')} *</label>
          <input
            id="b2b-nome"
            type="text"
            value={data.nome}
            onChange={(e) => update('nome', e.target.value)}
            placeholder={t('nomePlaceholder')}
            disabled={loading}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="b2b-azienda" className={labelCls}>{t('aziendaLabel')}</label>
          <input
            id="b2b-azienda"
            type="text"
            value={data.azienda}
            onChange={(e) => update('azienda', e.target.value)}
            placeholder={t('aziendaPlaceholder')}
            disabled={loading}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="b2b-email" className={labelCls}>{t('emailLabel')} *</label>
          <input
            id="b2b-email"
            type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder={t('emailPlaceholder')}
            disabled={loading}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="b2b-telefono" className={labelCls}>{t('telefonoLabel')}</label>
          <input
            id="b2b-telefono"
            type="tel"
            value={data.telefono}
            onChange={(e) => update('telefono', e.target.value)}
            placeholder={t('telefonoPlaceholder')}
            disabled={loading}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="b2b-tipo" className={labelCls}>{t('tipoLabel')}</label>
          <select
            id="b2b-tipo"
            value={data.tipo}
            onChange={(e) => update('tipo', e.target.value)}
            disabled={loading}
            className={inputCls + ' appearance-none cursor-pointer'}
          >
            <option value="" className="bg-soft-black">{t('tipoOptionDefault')}</option>
            <option value="hospitality" className="bg-soft-black">{t('tipoOptionHospitality')}</option>
            <option value="gifting" className="bg-soft-black">{t('tipoOptionGifting')}</option>
            <option value="white-label" className="bg-soft-black">{t('tipoOptionWhiteLabel')}</option>
            <option value="altro" className="bg-soft-black">{t('tipoOptionOther')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="b2b-volume" className={labelCls}>{t('volumeLabel')}</label>
          <input
            id="b2b-volume"
            type="text"
            value={data.volume}
            onChange={(e) => update('volume', e.target.value)}
            placeholder={t('volumePlaceholder')}
            disabled={loading}
            className={inputCls}
          />
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="b2b-messaggio" className={labelCls}>{t('messaggioLabel')} *</label>
        <textarea
          id="b2b-messaggio"
          value={data.messaggio}
          onChange={(e) => update('messaggio', e.target.value)}
          placeholder={t('messaggioPlaceholder')}
          disabled={loading}
          required
          rows={5}
          className={inputCls + ' resize-y'}
        />
      </div>

      <label className="flex items-start gap-3 mb-8 cursor-pointer text-xs text-warm-white/60 leading-relaxed">
        <input
          type="checkbox"
          checked={data.privacy}
          onChange={(e) => update('privacy', e.target.checked)}
          disabled={loading}
          className="mt-1 w-4 h-4 accent-gold-primary cursor-pointer"
        />
        <span>
          {t.rich('privacyConsent', {
            link: (chunks) => (
              <Link href="/privacy-policy" className="underline hover:text-gold-primary transition-colors">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-400 mb-4" role="alert">{error}</p>
      )}

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-3 px-12 py-5 bg-gold-primary text-soft-black text-[10px] uppercase tracking-[0.4em] hover:bg-warm-white transition-all duration-500 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('submitting') : t('submit')}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </form>
  );
}
