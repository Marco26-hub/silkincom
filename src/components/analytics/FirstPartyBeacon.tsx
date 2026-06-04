'use client';

/**
 * First-party analytics beacon. Fires one lightweight `pageview` to
 * /api/analytics/track on every route change, plus exposes a global
 * `window.silkincomAnalytics(type, params)` helper for funnel events
 * (product_view, add_to_cart, begin_checkout, purchase, search).
 *
 * Privacy: the session id lives in sessionStorage only (cleared when the tab
 * closes), no persistent cookie, no PII. Because the payload is aggregate +
 * non-identifying, this runs WITHOUT a cookie-consent gate — unlike GA4/Meta
 * in Analytics.tsx. Uses navigator.sendBeacon so it never blocks navigation.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

const SID_KEY = 'silkincom-aid';

declare global {
  interface Window {
    silkincomAnalytics?: (
      type: 'product_view' | 'add_to_cart' | 'begin_checkout' | 'purchase' | 'search',
      params?: { product?: string; value?: number },
    ) => void;
  }
}

function sessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id =
        (crypto?.randomUUID?.() ??
          `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

const UTM_KEY = 'silkincom-utm';

// Capture utm_* ONCE at session landing and keep it sticky in sessionStorage,
// so every later event (incl. the purchase, whose URL has no utm) is still
// attributed to the original source/medium/campaign.
function utmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    let stored = sessionStorage.getItem(UTM_KEY);
    if (stored === null) {
      const q = new URLSearchParams(window.location.search);
      const o: Record<string, string> = {};
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
        const v = q.get(k);
        if (v) o[k] = v.slice(0, 120);
      }
      stored = JSON.stringify(o);
      sessionStorage.setItem(UTM_KEY, stored); // capture-once at landing
    }
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ ...utmParams(), ...payload });
    const url = '/api/analytics/track';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    }
  } catch {
    /* analytics must never throw into the app */
  }
}

export function FirstPartyBeacon() {
  const pathname = usePathname();
  const locale = useLocale();
  const lastPath = useRef<string | null>(null);

  // Expose the funnel-event helper once.
  useEffect(() => {
    window.silkincomAnalytics = (type, params) => {
      // Skip internal/admin traffic — the owner working in /admin must not
      // pollute the customer funnel (it inflated sessions + dominated top-paths).
      if (typeof window !== 'undefined' && window.location.pathname.includes('/admin')) return;
      send({
        type,
        sid: sessionId(),
        path: window.location.pathname,
        ref: document.referrer || undefined,
        locale,
        product: params?.product,
        value: params?.value,
      });
    };
  }, [locale]);

  // Pageview on every route change (dedupe identical consecutive paths).
  // When the path is a product detail page, also emit a product_view with the
  // slug so the dashboard's "prodotti più visti" works without touching the
  // server component.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    // Don't track the owner's admin work — keeps the customer funnel clean.
    if (pathname.startsWith('/admin')) return;
    const ref = typeof document !== 'undefined' ? document.referrer || undefined : undefined;
    const sid = sessionId();
    send({ type: 'pageview', sid, path: pathname, ref, locale });

    const m = pathname.match(/^\/prodotto\/([^/?#]+)/);
    if (m) {
      send({ type: 'product_view', sid, path: pathname, ref, locale, product: m[1] });
    }
  }, [pathname, locale]);

  return null;
}
