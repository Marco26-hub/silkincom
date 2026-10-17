'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Minus, Plus, Search, ShoppingBag, User, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getCollectionNavigation } from '@/data/collection-navigation';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  links: Array<{ href: string; label: string }>;
  cartCount: number;
  onClose: () => void;
  onCart: () => void;
  onSearch: () => void;
};

export function PremiumMobileMenu({ links, cartCount, onClose, onCart, onSearch }: Props) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const collectionsCopy = useTranslations('collezioni');
  const collections = getCollectionNavigation(locale);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.32;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : document.querySelector<HTMLElement>('[aria-controls="mobile-navigation"]');
    const mountedPanel = panel.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, [tabindex="0"]',
      )).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      const active = document.activeElement;
      if (previousFocus?.isConnected && (active === document.body || mountedPanel?.contains(active))) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  return (
    <motion.div
      id="mobile-navigation"
      className="fixed inset-x-0 bottom-0 top-9 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration }}
    >
      <button
        tabIndex={-1}
        aria-label={tc('close')}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={tc('menu')}
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-gold-primary/25 bg-[#13120f] text-warm-white shadow-2xl"
        initial={{ x: reduceMotion ? 0 : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: reduceMotion ? 0 : '100%' }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gold-primary/20 px-7 py-5 sm:px-10">
          <Logo size="sm" variant="gold" href={null} withMark />
          <button
            ref={closeButton}
            onClick={onClose}
            aria-label={tc('close')}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gold-primary/25 text-warm-white/80 transition-colors hover:border-gold-primary hover:text-gold-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-primary"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pb-8 pt-7 sm:px-10">
          <span className="mb-5 block text-[11px] uppercase tracking-[0.2em] text-gold-primary/80">Como · Italia</span>
          <nav aria-label={t('collections')}>
            <Link href="/collezioni" onClick={onClose} className="group mb-4 flex min-h-12 items-center justify-between font-display text-[1.75rem] font-light">
              {t('collections')}
              <ArrowUpRight className="h-5 w-5 text-gold-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.2} />
            </Link>
            {collections.map((collection, index) => {
              const open = expanded === collection.slug;
              const panelId = `menu-collection-${collection.slug}`;
              return (
                <div key={collection.slug} className="border-t border-gold-primary/20">
                  <button
                    onClick={() => setExpanded(open ? null : collection.slug)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex min-h-16 w-full items-center gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-primary"
                  >
                    <span aria-hidden="true" className="text-[9px] tracking-[0.2em] text-gold-primary/60">0{index + 1}</span>
                    <span className={`flex-1 font-display text-[1.5rem] font-light transition-colors ${open ? 'text-gold-primary' : 'text-warm-white/90'}`}>{collection.label}</span>
                    {open ? <Minus className="h-4 w-4 text-gold-primary" strokeWidth={1.2} /> : <Plus className="h-4 w-4 text-gold-primary/75" strokeWidth={1.2} />}
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div id={panelId} key={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24 }} className="overflow-hidden">
                        <div className="pb-5 pl-8">
                          <Link href={collection.href} onClick={onClose} className="flex min-h-11 items-center justify-between text-[10px] uppercase tracking-[0.2em] text-gold-primary">
                            {collectionsCopy('explore')} {collection.label}
                            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.2} />
                          </Link>
                          {collection.links.map(item => (
                            <Link key={item.href} href={item.href} onClick={onClose} className="block border-l border-gold-primary/20 py-3 pl-4 text-sm font-light tracking-[0.04em] text-warm-white/70 transition-colors hover:border-gold-primary hover:text-gold-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-primary">
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          <nav aria-label={tc('menu')} className="mt-5 grid grid-cols-1 border-t border-gold-primary/20 pt-4">
            {links.filter(link => link.href !== '/collezioni').map(link => (
              <Link key={link.href} href={link.href} onClick={onClose} className="flex min-h-11 items-center py-2 text-[11px] font-light uppercase tracking-[0.16em] text-warm-white/65 transition-colors hover:text-gold-primary">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-5 border-t border-gold-primary/20 pt-5">
            <div className="grid grid-cols-3 gap-2 text-[9px] uppercase tracking-[0.12em] text-warm-white/70">
              <button onClick={onSearch} className="flex min-h-14 flex-col items-center justify-center gap-2 hover:text-gold-primary"><Search className="h-4 w-4" strokeWidth={1.2} />{t('search')}</button>
              <Link href="/account" onClick={onClose} className="flex min-h-14 flex-col items-center justify-center gap-2 hover:text-gold-primary"><User className="h-4 w-4" strokeWidth={1.2} />{t('account')}</Link>
              <button onClick={onCart} className="flex min-h-14 flex-col items-center justify-center gap-2 hover:text-gold-primary"><ShoppingBag className="h-4 w-4" strokeWidth={1.2} />{t('cart')}{cartCount > 0 ? ` (${cartCount})` : ''}</button>
            </div>
            <div className="mt-5 flex justify-center border-t border-gold-primary/10 pt-5"><LanguageSwitcher placement="top" /></div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}
