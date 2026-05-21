'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useState, Suspense } from 'react';
import { User, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const t = useTranslations('auth.login');
  const tc = useTranslations('common');
  const router = useRouter();
  const params = useSearchParams();
  const redirectParam = params.get('redirect');
  const redirect = redirectParam || '/account';
  // /auth/callback bounces failed confirmation/OAuth links here with ?error=.
  const errorParam = params.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'auth_failed' ? t('invalidCredentials') : errorParam || null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t('missingFields'));
      return;
    }
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        const m = authError.message;
        if (m === 'Invalid login credentials') setError(t('invalidCredentials'));
        else if (/email not confirmed/i.test(m)) setError(t('emailNotConfirmed'));
        else setError(m);
        return;
      }

      // Route staff accounts straight to the admin dashboard. The role is
      // always checked — even when a ?redirect= param is present (e.g. an
      // admin bounced off /account lands here with redirect=/account).
      let dest = redirect;
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        const ADMIN_ROLES = ['admin', 'super_admin', 'editor', 'order_manager'];
        if (profile && ADMIN_ROLES.includes(profile.role)) {
          // Staff → /admin, unless deep-linked to a specific admin page.
          dest = redirectParam && redirectParam.startsWith('/admin') ? redirectParam : '/admin';
        }
      }

      router.push(dest);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || tc('error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
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
            <User className="w-6 h-6 text-gold-primary stroke-1" />
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
          {googleLoading ? tc('loading') : 'Sign in with Google'}
        </button>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('email')}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              required
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.25em] text-soft-black/70">{t('password')}</label>
              <Link href="/recupera-password" className="text-[10px] uppercase tracking-[0.2em] text-gold-dark hover:text-gold-primary">
                {t('forgot')}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">
              {error}
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

        <div className="my-10 flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-soft-black/40">
          <span className="flex-1 h-px bg-pearl-grey" />
          {tc('or')}
          <span className="flex-1 h-px bg-pearl-grey" />
        </div>

        <p className="text-center text-sm text-soft-black/70 font-light">
          {t('noAccount')}{' '}
          <Link href={`/registrati?redirect=${encodeURIComponent(redirect)}`} className="text-gold-dark hover:text-gold-primary border-b border-gold-primary/40 pb-0.5">
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </section>
  );
}

export function LoginClient() {
  return (
    <Suspense fallback={<div className="pt-40 pb-32 min-h-[70vh]" />}>
      <LoginForm />
    </Suspense>
  );
}
