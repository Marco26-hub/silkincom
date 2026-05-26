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

  // Shared column-heading treatment: tiny gold eyebrow with a thin hairline
  // underline. Sets the editorial cadence across all four footer columns.
  function ColumnHeading({ children }: { children: React.ReactNode }) {
    return (
      <div className="mb-6">
        <h4 className="text-[10px] uppercase tracking-[0.4em] text-gold-primary">{children}</h4>
        <span className="block w-8 h-px bg-gold-primary/60 mt-3" />
      </div>
    );
  }

  return (
    <footer className="relative bg-soft-black text-warm-white">
      {/* Top ornament: a hairline gold gradient that closes the page chapter
          before the dark footer begins. Subtle, purely decorative. */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-primary/40 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 pt-14 sm:pt-20 md:pt-24 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 md:gap-14 pb-14 sm:pb-16 border-b border-warm-white/10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-7">
              <Logo size="2xl" variant="gold" withMark />
            </div>
            <p className="text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5 font-light">
              {t('madeIn')}
            </p>
            <p className="font-display text-lg italic text-warm-white/80 leading-snug max-w-[280px] mb-5">
              Tradizione serica dal 1400.
            </p>
            <p className="text-[13px] text-warm-white/55 leading-[1.85] font-light max-w-[280px]">
              {t('newsletter.description')}
            </p>
          </div>

          {/* Maison */}
          <div>
            <ColumnHeading>{t('sections.maison')}</ColumnHeading>
            <ul className="space-y-3.5 text-[13px] font-light text-warm-white/80">
              <li><Link href="/la-nostra-storia" className="hover:text-gold-primary transition-colors">{tn('story')}</Link></li>
              <li><Link href="/materiali" className="hover:text-gold-primary transition-colors">{tn('materials')}</Link></li>
              <li><Link href="/artigiani" className="hover:text-gold-primary transition-colors">{tn('artigiani')}</Link></li>
              <li><Link href="/trame-di-como" className="hover:text-gold-primary transition-colors">Journal</Link></li>
              <li><Link href="/contatti" className="hover:text-gold-primary transition-colors">{tn('contacts')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <ColumnHeading>{t('sections.support')}</ColumnHeading>
            <ul className="space-y-3.5 text-[13px] font-light text-warm-white/80">
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
            <ColumnHeading>{t('newsletter.title')}</ColumnHeading>
            <p className="text-[13px] text-warm-white/55 mb-5 font-light leading-[1.85]">{t('newsletter.description')}</p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex items-stretch border-b border-warm-white/25 focus-within:border-gold-primary transition-colors"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder')}
                disabled={nlState === 'loading' || nlState === 'success'}
                className="flex-1 bg-transparent py-3 text-sm placeholder:text-warm-white/35 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={nlState === 'loading' || nlState === 'success'}
                className="pl-4 text-gold-primary hover:text-warm-white transition-colors disabled:opacity-60"
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
            <div className="flex gap-2 mt-8">
              <a
                href="https://www.instagram.com/silkincom.official/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex w-9 h-9 items-center justify-center border border-warm-white/15 text-warm-white/60 hover:text-gold-primary hover:border-gold-primary/60 transition-colors"
              >
                <Instagram className="w-4 h-4 stroke-[1.2]" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61581900780447"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex w-9 h-9 items-center justify-center border border-warm-white/15 text-warm-white/60 hover:text-gold-primary hover:border-gold-primary/60 transition-colors"
              >
                <Facebook className="w-4 h-4 stroke-[1.2]" />
              </a>
              <a
                href="https://it.pinterest.com/silkincomofficial"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pinterest"
                className="inline-flex w-9 h-9 items-center justify-center border border-warm-white/15 text-warm-white/60 hover:text-gold-primary hover:border-gold-primary/60 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </a>
            </div>
            <div className="mt-7">
              {/* placement='auto' (default) auto-detects viewport space.
                  In the footer there's no room below → dropdown opens upward. */}
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Credentials — certifications (rendered only when populated) */}
        {CERTIFICATIONS.length > 0 && (
          <div className="py-10 border-b border-warm-white/10">
            <p className="text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">Certificazioni</p>
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
        <div className="pt-10 flex flex-col items-center gap-4 text-center text-[10px] text-warm-white/40 uppercase tracking-[0.3em] md:flex-row md:items-center md:justify-between md:gap-4 md:text-left">
          <p>© {new Date().getFullYear()} SILKinCOM — {t('madeIn')}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:justify-end">
            <Link href="/privacy-policy" className="hover:text-gold-primary transition-colors">{t('links.privacy')}</Link>
            <Link href="/cookie-policy" className="hover:text-gold-primary transition-colors">{t('links.cookies')}</Link>
            <Link href="/termini" className="hover:text-gold-primary transition-colors">{t('links.terms')}</Link>
            <span className="text-warm-white/30">P.IVA 03786790133</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
