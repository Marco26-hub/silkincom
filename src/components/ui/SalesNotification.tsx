'use client';

/**
 * SalesNotification — bottom-left toast that surfaces a real recent purchase
 * every 5 minutes. Anonymized (first name + initial + city). Real data only —
 * fetched from /api/recent-sales which queries paid/delivered orders.
 *
 * Behavior:
 * - First popup after 30s on page load
 * - Subsequent popups every 5 minutes
 * - Auto-hides after 8s
 * - Dismissible via X button
 * - Hidden if user dismissed in current session (sessionStorage)
 * - Hidden if no real sales data
 *
 * Mounted globally in layout.tsx — visible on every page.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ShoppingBag, X } from 'lucide-react';

type Sale = {
  initials: string;
  city: string;
  product: string;
  slug: string | null;
  when: string | null;
};

const FIRST_DELAY_MS = 15_000;       // 15s after mount (first impression)
const INTERVAL_MS = 5 * 60 * 1000;   // 5 min between popups (per user spec)
const VISIBLE_MS = 8_000;            // 8s on screen
const SESSION_KEY = 'silkincom-sales-popup-dismissed';

type Translator = ReturnType<typeof useTranslations<'salesNotification'>>;

function timeAgo(iso: string | null, t: Translator): string {
  if (!iso) return '';
  const diffMin = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 60) return t('minutesAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('hoursAgo', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return t('daysAgo', { count: diffD });
}

export function SalesNotification() {
  const t = useTranslations('salesNotification');
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [current, setCurrent] = useState<Sale | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const cycleIndex = useRef(0);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      setDismissed(true);
      return;
    }
    let alive = true;
    fetch('/api/recent-sales?limit=20')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const items: Sale[] = d?.items || [];
        setSales(items);
      })
      .catch(() => {
        if (alive) setSales([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sales?.length || dismissed) return;

    function showNext() {
      const next = sales![cycleIndex.current % sales!.length];
      cycleIndex.current += 1;
      setCurrent(next);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setCurrent(null), VISIBLE_MS);
    }

    const firstTimer = window.setTimeout(showNext, FIRST_DELAY_MS);
    const cycleTimer = window.setInterval(showNext, INTERVAL_MS);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(cycleTimer);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [sales, dismissed]);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
    setCurrent(null);
  }

  if (dismissed || !current) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[5.75rem] left-3 z-40 max-w-[190px] animate-fade-in sm:bottom-5 sm:left-5 sm:max-w-[228px]"
    >
      <div className="relative border border-gold-primary/25 border-l-2 border-l-gold-primary bg-warm-white/95 py-2.5 pl-3.5 pr-7 shadow-[0_14px_44px_-16px_rgba(23,23,23,0.32)] backdrop-blur-md sm:py-3 sm:pl-4">
        <p className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.26em] text-gold-primary font-medium">
          <ShoppingBag className="h-2.5 w-2.5 shrink-0 stroke-[1.6]" />
          <span className="truncate">{t('justOrdered')}</span>
        </p>
        <p className="mt-1 font-display text-[13px] italic leading-[1.2] text-soft-black line-clamp-2 sm:mt-1.5 sm:text-[14px]">
          {current.slug ? (
            <Link href={`/prodotto/${current.slug}`} className="hover:text-gold-primary transition-colors">
              {current.product}
            </Link>
          ) : (
            current.product
          )}
        </p>
        <p className="mt-1 truncate text-[9px] text-soft-black/45 sm:mt-1.5 sm:text-[10px]">
          {current.initials}
          {current.city ? ` · ${current.city}` : ''}
          {current.when ? ` · ${timeAgo(current.when, t)}` : ''}
        </p>
        <button
          onClick={dismiss}
          aria-label={t('dismiss')}
          className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center text-soft-black/25 hover:text-soft-black transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
