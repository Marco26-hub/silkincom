'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe, Check, ChevronDown } from 'lucide-react';
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

      {open && (
        <ul
          role="listbox"
          aria-label={t('selectLanguage')}
          className="absolute right-0 mt-2 w-56 bg-warm-white border border-pearl-grey shadow-lg z-50 py-1"
        >
          {LOCALES.map((loc) => {
            const label = LOCALE_LABELS[loc];
            const active = loc === currentLocale;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-light transition-colors ${
                    active ? 'bg-ivory text-gold-primary' : 'hover:bg-ivory text-soft-black'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base leading-none">{label.flag}</span>
                    <span>{label.nativeName}</span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 stroke-1" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
