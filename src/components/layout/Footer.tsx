'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Instagram, Facebook, Mail, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CERTIFICATIONS } from '@/data/credentials';

export function Footer() {
  const t = useTranslations('footer');
  const tn = useTranslations('nav');
  const [email, setEmail] = useState('');
  const [nlState, setNlState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [nlMsg, setNlMsg] = useState<string | null>(null);

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || nlState === 'loading') return;
    setNlState('loading');
    setNlMsg(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source: 'footer' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNlState('success');
        setNlMsg(data.message || 'Controlla la tua email per confermare');
        setEmail('');
      } else {
        setNlState('error');
        setNlMsg(data.error || 'Errore');
      }
    } catch {
      setNlState('error');
      setNlMsg('Errore di rete');
    }
  }

  return (
    <footer className="bg-soft-black text-warm-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 pt-12 sm:pt-16 md:pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-12 pb-12 sm:pb-16 border-b border-warm-white/10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-7">
              <Logo size="2xl" variant="gold" withMark />
            </div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4 font-light">
              {t('madeIn')}
            </p>
            <p className="text-sm text-warm-white/65 leading-relaxed font-light max-w-[280px]">
              {t('newsletter.description')}
            </p>
          </div>

          {/* Maison */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-gold-primary mb-5">{t('sections.maison')}</h4>
            <ul className="space-y-3 text-sm font-light">
              <li><Link href="/la-nostra-storia" className="hover:text-gold-primary transition-colors">{tn('story')}</Link></li>
              <li><Link href="/materiali" className="hover:text-gold-primary transition-colors">{tn('materials')}</Link></li>
              <li><Link href="/artigiani" className="hover:text-gold-primary transition-colors">{tn('artigiani')}</Link></li>
              <li><Link href="/trame-di-como" className="hover:text-gold-primary transition-colors">Journal</Link></li>
              <li><Link href="/contatti" className="hover:text-gold-primary transition-colors">{tn('contacts')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-gold-primary mb-5">{t('sections.support')}</h4>
            <ul className="space-y-3 text-sm font-light">
              <li><Link href="/spedizioni" className="hover:text-gold-primary transition-colors">{t('links.shipping')}</Link></li>
              <li><Link href="/resi" className="hover:text-gold-primary transition-colors">{t('links.returns')}</Link></li>
              <li><Link href="/cura-prodotto" className="hover:text-gold-primary transition-colors">{t('links.care')}</Link></li>
              <li><Link href="/faq" className="hover:text-gold-primary transition-colors">{t('links.faq')}</Link></li>
              <li><Link href="/recensioni" className="hover:text-gold-primary transition-colors">{t('links.reviews')}</Link></li>
              <li><Link href="/b2b" className="hover:text-gold-primary transition-colors">B2B</Link></li>
            </ul>
          </div>

          {/* Newsletter + language */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-gold-primary mb-5">{t('newsletter.title')}</h4>
            <p className="text-sm text-warm-white/60 mb-4 font-light">{t('newsletter.description')}</p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex border border-warm-white/20 focus-within:border-gold-primary transition-colors"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder')}
                disabled={nlState === 'loading' || nlState === 'success'}
                className="flex-1 bg-transparent px-4 py-3 text-sm placeholder:text-warm-white/40 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={nlState === 'loading' || nlState === 'success'}
                className="px-4 text-gold-primary hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-60"
                aria-label={t('newsletter.submit')}
              >
                {nlState === 'success' ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </button>
            </form>
            {nlMsg && (
              <p
                className={`text-xs mt-2 ${nlState === 'success' ? 'text-gold-primary' : 'text-red-400'}`}
                role={nlState === 'error' ? 'alert' : 'status'}
              >
                {nlMsg}
              </p>
            )}
            <div className="flex gap-4 mt-6">
              <a href="https://www.instagram.com/silkincom.official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-warm-white/60 hover:text-gold-primary transition-colors">
                <Instagram className="w-[18px] h-[18px]" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61581900780447" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-warm-white/60 hover:text-gold-primary transition-colors">
                <Facebook className="w-[18px] h-[18px]" />
              </a>
              <a href="https://it.pinterest.com/silkincomofficial" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="text-warm-white/60 hover:text-gold-primary transition-colors">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>
            </div>
            <div className="mt-6">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Credentials — certifications (rendered only when populated) */}
        {CERTIFICATIONS.length > 0 && (
          <div className="py-10 border-b border-warm-white/10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-5">Certificazioni</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {CERTIFICATIONS.map((c) => {
                const img = (
                  <Image
                    src={c.image}
                    alt={c.label}
                    width={100}
                    height={40}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  />
                );
                return c.url ? (
                  <a key={c.label} href={c.url} target="_blank" rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  <span key={c.label}>{img}</span>
                );
              })}
            </div>
          </div>
        )}

        {/* Legal */}
        <div className="pt-8 flex flex-col md:flex-row justify-between gap-4 text-[11px] text-warm-white/40 uppercase tracking-[0.15em]">
          <p>© {new Date().getFullYear()} SILKinCOM — {t('madeIn')}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy-policy" className="hover:text-gold-primary transition-colors">{t('links.privacy')}</Link>
            <Link href="/cookie-policy" className="hover:text-gold-primary transition-colors">{t('links.cookies')}</Link>
            <Link href="/termini" className="hover:text-gold-primary transition-colors">{t('links.terms')}</Link>
            <span>P.IVA 03786790133</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
