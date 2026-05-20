'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Floating premium nav: a "back" pill on the left and a "back to top"
 * pill on the right. Both appear only after the user scrolls past 480px
 * (so the hero stays uncluttered). Hidden on the cart drawer, checkout,
 * and admin routes by PublicChrome.
 */
export function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const [visible, setVisible] = useState(false);
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
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
          className="fixed bottom-6 inset-x-0 z-40 flex justify-between items-center pointer-events-none px-4 md:px-6"
        >
          {canBack ? (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('back')}
              className="group pointer-events-auto inline-flex items-center gap-2.5 pl-3 pr-5 py-3 bg-soft-black text-warm-white shadow-2xl border border-gold-primary/30 hover:border-gold-primary hover:bg-gold-primary hover:text-soft-black transition-all duration-500 backdrop-blur-sm"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 border border-gold-primary/40 group-hover:border-soft-black/30 rounded-full transition-colors">
                <ArrowLeft className="w-3 h-3" strokeWidth={1.6} />
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] font-medium hidden sm:inline">
                {t('back')}
              </span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={scrollTop}
            aria-label={t('backToTop')}
            className="group pointer-events-auto inline-flex items-center gap-2.5 pl-5 pr-3 py-3 bg-soft-black text-warm-white shadow-2xl border border-gold-primary/30 hover:border-gold-primary hover:bg-gold-primary hover:text-soft-black transition-all duration-500 backdrop-blur-sm"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] font-medium hidden sm:inline">
              {t('backToTop')}
            </span>
            <span className="inline-flex items-center justify-center w-6 h-6 border border-gold-primary/40 group-hover:border-soft-black/30 rounded-full transition-colors">
              <ArrowUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" strokeWidth={1.6} />
            </span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
