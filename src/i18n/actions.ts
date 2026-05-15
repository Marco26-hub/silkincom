'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isValidLocale } from './routing';

export async function setLocaleAction(locale: string) {
  if (!isValidLocale(locale)) {
    return { ok: false, error: 'Invalid locale' };
  }
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}
