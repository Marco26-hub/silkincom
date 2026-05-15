'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const t = useTranslations('auth.resetPassword');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase injects session via hash fragment on redirect
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // fallback: if already authed via recovery link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t('errorMinLength'));
      return;
    }
    if (password !== confirm) {
      setError(t('errorMismatch'));
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.push('/account'), 3000);
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

        {done ? (
          <div className="text-center bg-ivory border border-green-200 px-6 py-10">
            <p className="text-sm text-green-800 font-light mb-4">{t('successMessage')}</p>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gold-dark border-b border-gold-primary/40 pb-1 hover:text-gold-primary"
            >
              {t('goToAccount')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : !ready ? (
          <div className="text-center bg-ivory border border-pearl-grey/60 px-6 py-10">
            <p className="text-sm text-soft-black/70 font-light mb-4">{t('invalidLink')}</p>
            <Link
              href="/recupera-password"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-gold-dark border-b border-gold-primary/40 pb-1 hover:text-gold-primary"
            >
              {t('requestNewLink')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('newPassword')}</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('confirmPassword')}</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                required
                minLength={8}
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
      </div>
    </section>
  );
}
