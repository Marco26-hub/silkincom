'use client';

/**
 * Analytics — loads GA4 + Meta Pixel only after cookie consent is granted.
 *
 * Listens to:
 *  - localStorage 'silkincom-cookie-consent' on mount (initial state)
 *  - 'silkincom:consent-changed' window event (subsequent toggles)
 *
 * Configures via env vars:
 *  - NEXT_PUBLIC_GA4_ID (e.g. G-XXXXXXXXXX)
 *  - NEXT_PUBLIC_META_PIXEL_ID (e.g. 1234567890123456)
 *
 * On route change, fires page_view automatically.
 *
 * Helper trackEvent() exposed via window.silkincomTrack for ad-hoc events.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const CONSENT_KEY = 'silkincom-cookie-consent';
const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    silkincomTrack?: (
      event: string,
      params?: Record<string, unknown>,
      providers?: ('ga' | 'meta')[]
    ) => void;
  }
}

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Define a unified track helper for use across the app
    window.silkincomTrack = (event, params, providers = ['ga', 'meta']) => {
      const consent = typeof window !== 'undefined' ? localStorage.getItem(CONSENT_KEY) : null;
      if (consent !== 'accept') return;

      if (providers.includes('ga') && window.gtag) {
        window.gtag('event', event, params || {});
      }
      if (providers.includes('meta') && window.fbq) {
        window.fbq('track', event, params || {});
      }
    };
  }, []);

  // Track page_view on route changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent !== 'accept') return;

    if (window.gtag && GA_ID) {
      window.gtag('config', GA_ID, { page_path: pathname });
    }
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  // Listen for consent changes — clear data on reject (best-effort)
  useEffect(() => {
    function handleChange(e: Event) {
      const value = (e as CustomEvent<string>).detail;
      if (value === 'reject' && window.gtag && GA_ID) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        });
      }
      if (value === 'accept' && window.gtag && GA_ID) {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted',
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        });
        window.gtag('config', GA_ID, { page_path: window.location.pathname });
      }
    }
    window.addEventListener('silkincom:consent-changed', handleChange as EventListener);
    return () => window.removeEventListener('silkincom:consent-changed', handleChange as EventListener);
  }, []);

  if (!GA_ID && !META_PIXEL_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                // Default consent denied until user accepts via cookie banner
                gtag('consent', 'default', {
                  analytics_storage: 'denied',
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  wait_for_update: 500
                });
                gtag('config', '${GA_ID}', { send_page_view: false });
                // If user already accepted, grant immediately
                try {
                  if (localStorage.getItem('${CONSENT_KEY}') === 'accept') {
                    gtag('consent', 'update', {
                      analytics_storage: 'granted',
                      ad_storage: 'granted',
                      ad_user_data: 'granted',
                      ad_personalization: 'granted'
                    });
                    gtag('config', '${GA_ID}', { page_path: window.location.pathname });
                  }
                } catch (e) {}
              `,
            }}
          />
        </>
      )}

      {META_PIXEL_ID && (
        <Script
          id="meta-pixel-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('${CONSENT_KEY}') === 'accept') {
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${META_PIXEL_ID}');
                  fbq('track', 'PageView');
                }
              } catch(e) {}
            `,
          }}
        />
      )}
    </>
  );
}
