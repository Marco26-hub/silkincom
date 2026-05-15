'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { UserPlus, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

function RegisterForm() {
  const t = useTranslations('auth.register');
  const tc = useTranslations('common');
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '' });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!form.nome || !form.cognome || !form.email || !form.password) {
      setError(t('missingFields'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (!accept) {
      setError(t('termsRequired'));
      return;
    }
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { first_name: form.nome, last_name: form.cognome, full_name: `${form.nome} ${form.cognome}` },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${redirect}` : undefined,
        },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      // Se Supabase richiede conferma email, sessione null
      if (!data.session) {
        setInfo(t('emailSent'));
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Registrazione fallita. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (authError) {
        setError(authError.message);
      }
    } catch (err: any) {
      setError(err?.message || tc('error'));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <section className="pt-40 pb-32 bg-warm-white min-h-[70vh]">
      <div className="max-w-md mx-auto px-6">
        <div className="text-center mb-10">
          <span className="inline-flex w-14 h-14 items-center justify-center border border-gold-primary/40 rounded-full mb-6">
            <UserPlus className="w-6 h-6 text-gold-primary stroke-1" />
          </span>
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-3">Maison SILKinCOM</span>
          <h1 className="font-display font-light text-4xl md:text-5xl mb-3">{t('title')}</h1>
          <p className="text-sm text-soft-black/70 font-light">{t('subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full inline-flex items-center justify-center gap-3 px-10 py-4 bg-warm-white border border-pearl-grey text-soft-black text-[11px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-all duration-500 disabled:opacity-60 mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? tc('loading') : 'Sign up with Google'}
        </button>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('firstName')}</label>
              <input
                type="text"
                autoComplete="given-name"
                value={form.nome}
                onChange={(e) => update('nome', e.target.value)}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('lastName')}</label>
              <input
                type="text"
                autoComplete="family-name"
                value={form.cognome}
                onChange={(e) => update('cognome', e.target.value)}
                className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('email')}</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('password')}</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              required
              minLength={8}
            />
          </div>

          <label className="flex items-start gap-3 text-xs text-soft-black/70 font-light leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-1 accent-gold-primary"
            />
            <span>
              {t.rich('acceptTerms', {
                termsLink: (chunks) => <Link href="/termini" className="text-gold-dark hover:text-gold-primary underline">{chunks}</Link>,
                privacyLink: (chunks) => <Link href="/privacy-policy" className="text-gold-dark hover:text-gold-primary underline">{chunks}</Link>,
              })}
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-200 px-4 py-3" role="status">
              {info}
            </p>
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

        <p className="text-center text-sm text-soft-black/70 font-light mt-10">
          {t('haveAccount')}{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-gold-dark hover:text-gold-primary border-b border-gold-primary/40 pb-0.5">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="pt-40 pb-32 min-h-[70vh]" />}>
      <RegisterForm />
    </Suspense>
  );
}
