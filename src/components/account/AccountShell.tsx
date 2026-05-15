'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

export function AccountShell({ title, children }: { title: string; children: React.ReactNode }) {
  const ta = useTranslations('account');
  const td = useTranslations('account.dashboard');
  const tn = useTranslations('nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const NAV = [
    { href: '/account', label: 'Dashboard' },
    { href: '/account/ordini', label: td('orders') },
    { href: '/account/indirizzi', label: td('addresses') },
    { href: '/account/wishlist', label: td('wishlist') },
    { href: '/account/recensioni', label: 'Recensioni' },
    { href: '/account/profilo', label: td('profile') },
  ];

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/account')}`);
        return;
      }
      setReady(true);
    })();
  }, [router, pathname]);

  async function logout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  if (!ready) return <section className="pt-40 pb-32 min-h-[60vh]" />;

  return (
    <section className="pt-32 sm:pt-36 md:pt-40 pb-20 md:pb-32 bg-warm-white min-h-[80vh]">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-12">
        {/* Side nav */}
        <aside>
          <Link href="/account" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-soft-black/60 hover:text-gold-primary mb-8 lg:hidden">
            <ArrowLeft className="w-3.5 h-3.5" /> {tc('back')}
          </Link>
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">{ta('title')}</span>
          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-x-3 gap-y-0 mb-10">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-3 lg:py-3 border-b border-pearl-grey/40 text-sm font-light transition-colors min-h-[44px] flex items-center ${
                    active ? 'text-gold-primary border-gold-primary/40' : 'text-soft-black/80 hover:text-gold-primary'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-soft-black/60 hover:text-gold-primary"
          >
            <LogOut className="w-3.5 h-3.5" /> {tn('logout')}
          </button>
        </aside>

        {/* Main */}
        <main>
          <h1 className="font-display font-light text-3xl md:text-4xl mb-10 tracking-[-0.005em]">{title}</h1>
          {children}
        </main>
      </div>
    </section>
  );
}
