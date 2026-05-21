import { defineRouting } from 'next-intl/routing';

export const LOCALES = ['it', 'en', 'es', 'fr', 'de', 'pt', 'nl'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'it';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const routing = defineRouting({
  locales: LOCALES as unknown as string[],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  // Detection off: the bare `/` must stay the Italian home deterministically.
  // With detection on, `/` (the logo / home link target) got redirected to a
  // prefixed locale from the cookie/Accept-Language — clicking the logo on an
  // IT page sent English-browser users to /en. Also keeps Googlebot on `/`.
  localeDetection: false,
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365 },
});

export const LOCALE_LABELS: Record<Locale, { name: string; flag: string; nativeName: string }> = {
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
};

export function isValidLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * Build locale-aware `alternates` metadata (self-referencing canonical + hreflang).
 * `path` is the locale-agnostic path, e.g. '' for the homepage or
 * '/prodotto/bellagio'. The default locale (it) has no prefix; the others
 * are served under /{locale}. Resolved against `metadataBase`.
 */
export function localizedAlternates(locale: string, path: string) {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const url = (loc: string) => {
    const base = loc === DEFAULT_LOCALE ? `/${clean}` : `/${loc}/${clean}`;
    return base.replace(/\/+$/, '') || '/';
  };
  const languages: Record<string, string> = { 'x-default': url(DEFAULT_LOCALE) };
  for (const loc of LOCALES) languages[loc] = url(loc);
  return { canonical: url(locale), languages };
}
