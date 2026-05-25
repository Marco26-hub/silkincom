'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe, Check, ChevronDown, X } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/routing';

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('languageSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Lock page scroll while the mobile bottom-sheet is open so the customer
  // can't accidentally scroll the footer behind the panel.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleSelect(locale: Locale) {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }
    startTransition(() => {
      // Navigate to the same page under the chosen locale. next-intl adds the
      // locale prefix as needed (default locale stays unprefixed).
      router.replace(pathname, { locale });
      setOpen(false);
    });
  }

  const current = LOCALE_LABELS[currentLocale];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('selectLanguage')}
        disabled={pending}
        className={
          variant === 'minimal'
            ? 'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-soft-black/70 hover:text-gold-primary transition-colors disabled:opacity-50'
            : 'inline-flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.2em] border border-pearl-grey hover:border-soft-black transition-colors disabled:opacity-50'
        }
      >
        {variant === 'minimal' ? (
          <Globe className="w-3.5 h-3.5 stroke-1" />
        ) : (
          <span className="text-base leading-none">{current.flag}</span>
        )}
        <span>{currentLocale.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* ============================================================
          MOBILE: full-width bottom-sheet. The previous tiny right-aligned
          dropdown looked cheap and routinely overflowed the viewport on
          narrow screens. A proper bottom-sheet matches the rest of the
          Maison voice and gives generous touch targets.
          ============================================================ */}
      {open && (
        <div className="sm:hidden">
          <button
            type="button"
            aria-label={t('close')}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] bg-soft-black/55 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('selectLanguage')}
            className="fixed inset-x-0 bottom-0 z-[101] bg-warm-white shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.25)] animate-[slideUp_280ms_cubic-bezier(0.21,0.47,0.32,0.98)]"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-pearl-grey rounded-full" />
            </div>
            <div className="relative text-center pt-4 pb-5 px-6 border-b border-pearl-grey/70">
              <p className="text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-2">
                {t('selectLanguage')}
              </p>
              <p className="font-display text-2xl font-light leading-none">
                <em className="italic text-gold-primary">Maison</em> SILKinCOM
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="absolute top-4 right-4 p-1.5 text-soft-black/50 hover:text-soft-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul
              role="listbox"
              aria-label={t('selectLanguage')}
              className="py-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              {LOCALES.map((loc) => {
                const label = LOCALE_LABELS[loc];
                const active = loc === currentLocale;
                return (
                  <li key={loc} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => handleSelect(loc)}
                      className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${
                        active
                          ? 'bg-ivory/80 text-gold-primary'
                          : 'hover:bg-ivory text-soft-black active:bg-ivory'
                      }`}
                    >
                      <span className="text-xl leading-none">{label.flag}</span>
                      <span className="flex-1 text-left">
                        <span className="block font-display text-lg leading-tight">
                          {label.nativeName}
                        </span>
                        <span className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/40 mt-0.5">
                          {loc}
                        </span>
                      </span>
                      {active && (
                        <span className="inline-flex w-7 h-7 items-center justify-center border border-gold-primary/40 text-gold-primary">
                          <Check className="w-3.5 h-3.5 stroke-[1.5]" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ============================================================
          DESKTOP / TABLET: refined dropdown anchored to the button. The
          mobile bottom-sheet above replaces this on <sm screens.
          ============================================================ */}
      {open && (
        <ul
          role="listbox"
          aria-label={t('selectLanguage')}
          className="hidden sm:block absolute right-0 mt-3 w-64 max-w-[calc(100vw-2rem)] bg-warm-white border border-pearl-grey/70 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.25)] z-[100] py-2"
        >
          <li className="px-5 pb-2 mb-1 border-b border-pearl-grey/60">
            <p className="text-[9px] uppercase tracking-[0.5em] text-gold-primary">
              {t('selectLanguage')}
            </p>
          </li>
          {LOCALES.map((loc) => {
            const label = LOCALE_LABELS[loc];
            const active = loc === currentLocale;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-colors ${
                    active
                      ? 'bg-ivory/70 text-gold-primary'
                      : 'hover:bg-ivory text-soft-black'
                  }`}
                >
                  <span className="text-lg leading-none">{label.flag}</span>
                  <span className="flex-1 text-left">
                    <span className="block font-display text-base leading-tight">
                      {label.nativeName}
                    </span>
                  </span>
                  {active && <Check className="w-4 h-4 stroke-[1.5] text-gold-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
