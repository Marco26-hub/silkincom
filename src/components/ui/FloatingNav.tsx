'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Floating premium nav: a "back" button on the left and a "back to top"
 * button on the right. Both appear once the user scrolls down a little.
 *
 * Near the bottom of the page the pair *docks just above the footer*
 * instead of disappearing — "torna su" stays reachable exactly where it
 * is most useful (at the end of a long page). Hidden on the cart drawer,
 * checkout and admin routes by PublicChrome.
 */
const SHOW_AFTER = 280; // px scrolled before the nav appears
const FOOTER_GAP = 12; // px kept between the nav and the footer
// Persistent WhatsApp FAB sits bottom-right at 24px and is 56px tall (h-14).
// Lift the whole nav row above it so "back to top" never overlaps the FAB.
const FAB_CLEARANCE = 64;

export function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const [visible, setVisible] = useState(false);
  const [lift, setLift] = useState(0);
  const [canBack, setCanBack] = useState(false);

  // Hide on the homepage (no useful "back" there) and on auth flows.
  const hideRoute =
    pathname === '/' ||
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanBack(window.history.length > 1);

    let frame = 0;
    const measure = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER);
      // Dock above the footer rather than hiding: once the footer scrolls
      // into view, lift the buttons by the overlapping amount so they
      // never cover the legal row — and never vanish.
      const footer = document.querySelector('footer');
      const overlap = footer
        ? window.innerHeight - footer.getBoundingClientRect().top
        : 0;
      setLift(overlap > 0 ? overlap + FOOTER_GAP : 0);
    };
    // rAF-throttle: getBoundingClientRect is read at most once per frame.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  if (hideRoute) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="floating-nav"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
          style={{ bottom: 24 + FAB_CLEARANCE + lift }}
          className="fixed inset-x-0 z-40 flex justify-between items-center pointer-events-none px-4 md:px-6"
        >
          {canBack ? (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('back')}
              className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-black/90 text-warm-white shadow-lg border border-gold-primary/30 hover:border-gold-primary hover:bg-gold-primary hover:text-soft-black transition-all duration-500 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={scrollTop}
            aria-label={t('backToTop')}
            className="group pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-soft-black/90 text-warm-white shadow-lg border border-gold-primary/30 hover:border-gold-primary hover:bg-gold-primary hover:text-soft-black transition-all duration-500 backdrop-blur-sm"
          >
            <ArrowUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" strokeWidth={1.6} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
