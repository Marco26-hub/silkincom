'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, User, ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '@/store/cart';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SearchOverlay } from './SearchOverlay';

export function Header() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { openCart, count } = useCart();
  const cartCount = count();

  // Homepage carries a full-bleed dark hero. Until the user scrolls past
  // it the header is transparent with ivory text + drop-shadow so the
  // luxury photography breathes. Every other route uses the solid warm-
  // white treatment for crisp readability.
  const isHome = /^\/(?:it|en|es|fr|de|pt|nl)?\/?$/.test(pathname || '/');
  const overHero = isHome && !scrolled;

  const NAV_LINKS = [
    { href: '/collezioni', label: t('collections') },
    { href: '/materiali', label: t('materials') },
    { href: '/artigiani', label: t('artigiani') },
    { href: '/la-nostra-storia', label: t('story') },
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
      <header
        className={`fixed top-9 left-0 right-0 z-40 transition-all duration-700 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] ${
          overHero
            ? 'bg-transparent py-3 md:py-4'
            : scrolled
            ? 'bg-warm-white/95 backdrop-blur-md border-b border-pearl-grey/40 py-2.5'
            : 'bg-warm-white/95 backdrop-blur-md py-3 md:py-4 shadow-[0_1px_0_rgba(212,175,55,0.22)]'
        }`}
      >
        {/* Hero scrim — only over homepage hero, gives links a contrast
            cushion without committing to a solid bar. */}
        {overHero ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-9 h-[200%] bg-gradient-to-b from-soft-black/55 via-soft-black/25 to-transparent"
          />
        ) : null}

        <div className={`relative max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-3 items-center ${overHero ? 'text-warm-white' : 'text-soft-black'}`}>
          {/* Left nav (desktop) */}
          <nav className={`hidden lg:flex items-center gap-6 xl:gap-8 text-[11px] uppercase tracking-[0.28em] font-light ${overHero ? '[text-shadow:0_1px_3px_rgba(0,0,0,0.55)]' : ''}`}>
            {NAV_LINKS.slice(0, 4).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap hover:text-gold-primary transition-colors duration-300 relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold-primary group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <button
            className={overHero ? 'lg:hidden text-warm-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]' : 'lg:hidden text-soft-black'}
            onClick={() => setMobileOpen(true)}
            aria-label={tc('menu')}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo — hero brand presence. Over the dark hero the default
              (halo) treatment pops; on the solid cream bar the gold is
              deepened so it never washes out. */}
          <div className="flex justify-center">
            <Logo
              size={scrolled ? 'md' : 'lg'}
              variant={overHero ? 'default' : 'solid'}
              withMark
            />
          </div>

          {/* Right nav + icons */}
          <div className={`hidden lg:flex items-center justify-end gap-6 xl:gap-8 text-[11px] uppercase tracking-[0.28em] font-light ${overHero ? '[text-shadow:0_1px_3px_rgba(0,0,0,0.55)]' : ''}`}>
            {NAV_LINKS.slice(4).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap hover:text-gold-primary transition-colors duration-300 relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold-primary group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
            <div className={`flex items-center gap-4 pl-4 border-l ${overHero ? 'border-warm-white/30' : 'border-pearl-grey/60'}`}>
              <button aria-label={t('search')} onClick={() => setSearchOpen(true)} className="hover:text-gold-primary transition-colors">
                <Search className="w-[18px] h-[18px]" />
              </button>
              <Link href="/account" aria-label={t('account')} className="hover:text-gold-primary transition-colors">
                <User className="w-[18px] h-[18px]" />
              </Link>
              <button
                aria-label={`${t('cart')} (${cartCount})`}
                onClick={openCart}
                className="relative hover:text-gold-primary transition-colors"
              >
                <ShoppingBag className="w-[18px] h-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-gold-primary text-warm-white text-[9px] rounded-full flex items-center justify-center font-medium">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
              <LanguageSwitcher variant="minimal" />
            </div>
          </div>

          {/* Mobile right icons */}
          <div className={`lg:hidden flex justify-end gap-4 ${overHero ? 'text-warm-white [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]' : ''}`}>
            <button
              aria-label={`${t('cart')} (${cartCount})`}
              onClick={openCart}
              className="relative"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-gold-primary text-warm-white text-[8px] rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-warm-white lg:hidden">
          <div className="flex justify-between items-center p-6 border-b border-pearl-grey">
            <Logo size="sm" variant="solid" href={null} withMark />
            <button onClick={() => setMobileOpen(false)} aria-label={tc('close')}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col p-6 gap-6 text-sm uppercase tracking-[0.2em]">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="hover:text-gold-primary transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-pearl-grey pt-6 mt-2 flex flex-col gap-4 text-xs">
              <Link href="/account" onClick={() => setMobileOpen(false)}>
                {t('account')}
              </Link>
              <button
                onClick={() => { setMobileOpen(false); openCart(); }}
                className="text-left"
              >
                {t('cart')} {cartCount > 0 && `(${cartCount})`}
              </button>
              <div className="pt-2">
                <LanguageSwitcher />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
