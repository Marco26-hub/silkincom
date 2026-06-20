'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const KEY = 'silkincom-cookie-consent';

export function CookieBanner() {
  const t = useTranslations('cookies');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  function decide(value: 'accept' | 'reject') {
    localStorage.setItem(KEY, value);
    setVisible(false);
    // Notify analytics + other listeners (Analytics component switches GA4/Meta)
    window.dispatchEvent(new CustomEvent('silkincom:consent-changed', { detail: value }));
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 animate-fade-in border border-gold-primary/35 bg-[#11100e] text-warm-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:inset-x-6 sm:bottom-6 md:left-auto md:right-8 md:w-[min(620px,calc(100vw-4rem))]">
      <div className="relative p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-2 border border-warm-white/5" />
        <div className="relative flex flex-col gap-4">
          <span className="text-[8px] uppercase tracking-[0.4em] text-gold-primary">Privacy · SILKinCOM</span>
          <p className="text-[12px] font-light leading-[1.65] text-warm-white/75 sm:text-[13px]">
            {t('description')}
          </p>
          <div className="flex items-center gap-2.5 sm:justify-end">
            <button
              onClick={() => decide('reject')}
              className="flex-1 border border-warm-white/25 px-4 py-3 text-[9px] uppercase tracking-[0.24em] transition-colors hover:border-gold-primary hover:text-gold-primary sm:flex-none sm:px-6"
            >
              {t('reject')}
            </button>
            <button
              onClick={() => decide('accept')}
              className="flex-[1.45] bg-gold-primary px-4 py-3 text-[9px] uppercase tracking-[0.24em] text-soft-black transition-colors hover:bg-warm-white sm:flex-none sm:px-7"
            >
              {t('accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
