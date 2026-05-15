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
    <div className="fixed bottom-0 inset-x-0 z-50 bg-soft-black text-warm-white border-t border-gold-primary/30 animate-fade-in">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
        <p className="text-sm font-light leading-relaxed flex-1">
          {t('description')}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => decide('reject')}
            className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] border border-warm-white/30 hover:border-warm-white transition-colors"
          >
            {t('reject')}
          </button>
          <button
            onClick={() => decide('accept')}
            className="px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] bg-gold-primary text-soft-black hover:bg-warm-white transition-colors"
          >
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
