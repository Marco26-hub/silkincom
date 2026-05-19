'use client';

import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { User, Package, MapPin, Heart, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

type Profile = {
  email: string | null;
  fullName: string | null;
  ordersCount: number;
};

export default function AccountPage() {
  const t = useTranslations('account');
  const tn = useTranslations('nav');
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirect=/account');
        return;
      }

      // Conteggio ordini (RLS deve permettere read by user_id = auth.uid())
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', user.id);

      if (cancelled) return;
      setProfile({
        email: user.email ?? null,
        fullName: (user.user_metadata?.full_name as string) || null,
        ordersCount: ordersCount ?? 0,
      });
      setReady(true);
    })();

    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  if (!ready || !profile) {
    return <section className="pt-40 pb-32 min-h-[60vh]" />;
  }

  return (
    <section className="pt-40 pb-32 bg-warm-white min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-3">{t('title')}</span>
            <h1 className="font-display font-light text-4xl md:text-5xl">
              {profile.fullName ? t('greeting', { name: profile.fullName.split(' ')[0] }) : t('greetingDefault')}
            </h1>
            {profile.email && <p className="text-sm text-soft-black/60 font-light mt-3">{profile.email}</p>}
          </div>
          <button
            onClick={logout}
            className="hidden md:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-soft-black/70 hover:text-gold-primary transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {tn('logout')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashCard
            href="/account/ordini"
            icon={Package}
            title={t('dashboard.orders')}
            desc={t('dashboard.ordersDescription', { count: profile.ordersCount })}
          />
          <DashCard href="/account/indirizzi" icon={MapPin} title={t('dashboard.addresses')} desc={t('dashboard.addressesDescription')} />
          <DashCard href="/account/wishlist" icon={Heart} title={t('dashboard.wishlist')} desc={t('dashboard.wishlistDescription')} />
          <DashCard href="/account/profilo" icon={User} title={t('dashboard.profile')} desc={t('dashboard.profileDescription')} />
        </div>

        <button
          onClick={logout}
          className="md:hidden mt-10 w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-soft-black/20 text-[11px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {tn('logout')}
        </button>
      </div>
    </section>
  );
}

function DashCard({ href, icon: Icon, title, desc }: { href: string; icon: typeof User; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group block bg-ivory border border-pearl-grey/60 hover:border-gold-primary/40 p-6 transition-all duration-500 hover:shadow-soft"
    >
      <Icon className="w-6 h-6 text-gold-primary stroke-1 mb-4" />
      <h3 className="font-display font-light text-xl text-soft-black group-hover:text-gold-dark transition-colors mb-1">{title}</h3>
      <p className="text-xs text-soft-black/60 font-light">{desc}</p>
    </Link>
  );
}
