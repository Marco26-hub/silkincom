import postsJson from './blog.json';
import { LOCALES, type Locale } from '@/i18n/routing';

type L10n = { it: string } & Partial<Record<Exclude<Locale, 'it'>, string>>;

type RawPost = {
  slug: string;
  title: L10n;
  description: L10n;
  image: string;
  date: string;
  body: L10n;
};

export type Post = {
  slug: string;
  title: string;
  description: string;
  image: string;
  date: string;
  body: string;
};

function pick(field: L10n, locale: string): string {
  return field[locale as Locale] ?? field.en ?? field.it;
}

function normLocale(locale: string): Locale {
  return (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : 'it';
}

const rawPosts = postsJson as RawPost[];

function localizePost(p: RawPost, locale: Locale): Post {
  return {
    slug: p.slug,
    title: pick(p.title, locale),
    description: pick(p.description, locale),
    image: p.image,
    date: p.date,
    body: pick(p.body, locale),
  };
}

// Post slugs — locale-agnostic, for generateStaticParams / sitemap
export const POST_SLUGS: string[] = rawPosts.map((p) => p.slug);

export function getPosts(locale: string): Post[] {
  const l = normLocale(locale);
  return rawPosts.map((p) => localizePost(p, l));
}

export function getPost(slug: string, locale: string): Post | undefined {
  const p = rawPosts.find((x) => x.slug === slug);
  return p ? localizePost(p, normLocale(locale)) : undefined;
}
