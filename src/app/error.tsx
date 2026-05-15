'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    console.error(error);
    // Log to backend (best-effort, fire-and-forget)
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : null,
        context: { digest: error.digest, source: 'app-error-boundary' },
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <section className="min-h-screen bg-warm-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6">
          {t('tag')}
        </span>
        <h1 className="font-display font-light text-5xl text-soft-black mb-4">
          {t('title')}
        </h1>
        <p className="text-soft-grey font-light mb-10 leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
          >
            {t('retry')}
          </button>
          <Link
            href="/"
            className="px-8 py-3 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:border-gold-primary hover:text-gold-primary transition-all duration-300"
          >
            {t('home')}
          </Link>
        </div>
      </div>
    </section>
  );
}
