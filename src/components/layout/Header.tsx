'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Search, User, ShoppingBag, Menu } from 'lucide-react';
import { useCart } from '@/store/cart';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SearchOverlay } from './SearchOverlay';
import { PremiumMobileMenu } from './PremiumMobileMenu';

export function Header() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { openCart, count } = useCart();
  const cartCount = count();
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Keep the opening navigation restrained; every destination remains in the drawer.
  const isHome = /^\/(?:it|en|es|fr|de|pt|nl)?\/?$/.test(pathname || '/');
  const overHero = isHome && !scrolled;

  const NAV_LINKS = [
    { href: '/collezioni', label: t('collections') },
    { href: '/materiali', label: t('materials') },
    { href: '/artigiani', label: t('artigiani') },
    { href: '/la-nostra-storia', label: t('story') },
    { href: '/maison/marco-dibenedetto', label: t('founder') },
    { href: '/trame-di-como', label: 'Journal' },
    { href: '/b2b', label: 'B2B' },
    { href: '/contatti', label: t('contacts') },
  ];

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`fixed left-0 right-0 top-9 z-40 border-b transition-[background-color,border-color] duration-300 ${overHero ? 'border-white/15 bg-[#181b18]/75 backdrop-blur-md' : 'border-white/15 bg-[#181b18]/95 backdrop-blur-xl'}`}>
        <div className="mx-auto grid h-[76px] max-w-[1680px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 text-warm-white sm:px-10 lg:h-[88px]">
          <div className="flex min-w-0 items-center gap-6">
            <button className="inline-flex min-h-11 min-w-11 items-center gap-3 text-warm-white transition-colors hover:text-[#d8bf89]" onClick={() => setMobileOpen(true)} aria-label={tc('menu')} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-haspopup="dialog">
              <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.3} />
              <span className="hidden text-[11px] uppercase tracking-[0.16em] sm:inline">{tc('menu')}</span>
            </button>
            <Link href="/collezioni" className="hidden min-h-11 items-center text-[11px] uppercase tracking-[0.14em] transition-colors hover:text-[#d8bf89] lg:inline-flex">{t('collections')}</Link>
          </div>
          <div className="flex justify-center"><Logo size="md" variant="default" withMark /></div>
          <div className="flex min-w-0 items-center justify-end gap-0 sm:gap-2">
            <div className="mr-2 hidden xl:block"><LanguageSwitcher variant="minimal" /></div>
            <button aria-label={t('search')} onClick={() => setSearchOpen(true)} className="hidden h-11 w-11 items-center justify-center transition-colors hover:text-[#d8bf89] sm:flex"><Search aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.3} /></button>
            <Link href="/account" aria-label={t('account')} className="hidden h-11 w-11 items-center justify-center transition-colors hover:text-[#d8bf89] md:flex"><User aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.3} /></Link>
            <button aria-label={`${t('cart')} (${cartCount})`} onClick={openCart} className="relative flex h-11 w-11 items-center justify-center transition-colors hover:text-[#d8bf89]">
              <ShoppingBag aria-hidden="true" className="h-5 w-5" strokeWidth={1.3} />
              {cartCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d8bf89] px-1 text-[9px] font-medium text-[#181b18]">{cartCount > 9 ? '9+' : cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      <AnimatePresence>
        {mobileOpen && (
          <PremiumMobileMenu
            links={NAV_LINKS}
            cartCount={cartCount}
            onClose={closeMobileMenu}
            onCart={() => { closeMobileMenu(); openCart(); }}
            onSearch={() => { closeMobileMenu(); setSearchOpen(true); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
