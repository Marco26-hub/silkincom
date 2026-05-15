import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale, type Locale } from './routing';

function pickLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const tags = header.split(',').map((tag) => tag.split(';')[0].trim().toLowerCase());
  for (const tag of tags) {
    const primary = tag.split('-')[0];
    if (isValidLocale(primary)) return primary as Locale;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (isValidLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    const detected = pickLocaleFromAcceptLanguage(headerStore.get('accept-language'));
    if (detected) locale = detected;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
