'use client';

import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

export default function RecuperaPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return;
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (authError) throw authError;
      setSent(true);
    } catch (err: any) {
      setError(err?.message || t('errorDefault'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pt-40 pb-32 bg-warm-white min-h-[70vh]">
      <div className="max-w-md mx-auto px-6">
        <div className="text-center mb-10">
          <span className="inline-flex w-14 h-14 items-center justify-center border border-gold-primary/40 rounded-full mb-6">
            <KeyRound className="w-6 h-6 text-gold-primary stroke-1" />
          </span>
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-3">{t('tag')}</span>
          <h1 className="font-display font-light text-4xl md:text-5xl mb-3">{t('title')}</h1>
          <p className="text-sm text-soft-black/70 font-light">{t('subtitle')}</p>
        </div>

        {sent ? (
          <div className="text-center bg-ivory border border-gold-primary/30 px-6 py-10">
            <p className="text-sm text-soft-black/80 font-light mb-6">{t('successMessage')}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gold-dark border-b border-gold-primary/40 pb-1 hover:text-gold-primary"
            >
              {t('backToLogin')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('emailLabel')}</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                required
              />
            </div>
            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="group w-full inline-flex items-center justify-center gap-3 px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-500 disabled:opacity-60"
            >
              {loading ? t('submitting') : t('submit')}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        )}

        <p className="text-center text-sm text-soft-black/70 font-light mt-10">
          <Link href="/login" className="text-gold-dark hover:text-gold-primary border-b border-gold-primary/40 pb-0.5">
            {t('backToLogin')}
          </Link>
        </p>
      </div>
    </section>
  );
}
