import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import postsJson from './blog.json';
import { LOCALES, type Locale } from '@/i18n/routing';

/**
 * Blog data access. Source of truth is the `blog_posts` table (admin CMS).
 * If the DB is unseeded or unreachable we fall back to the bundled blog.json
 * (the pre-CMS content) so the public blog — a live SEO/GEO asset — never goes
 * empty. Italian lives in the base columns; the other six locales in *_i18n.
 */

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

// A published post with a future published_at is *scheduled*: it stays off
// the journal, the post page and the sitemap until that moment (ISR picks it
// up within the revalidate window). Evaluated per request, never at import.
function nowIso(): string {
  return new Date().toISOString();
}

function normLocale(locale: string): Locale {
  return (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : 'it';
}

// ---------- DB path ----------

type DbRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  published_at: string | null;
  title_i18n: Record<string, string> | null;
  excerpt_i18n: Record<string, string> | null;
  content_i18n: Record<string, string> | null;
};

const DB_SELECT =
  'slug, title, excerpt, content, featured_image_url, published_at, title_i18n, excerpt_i18n, content_i18n';

function pickDb(base: string, i18n: Record<string, string> | null, locale: Locale): string {
  if (locale === 'it') return base;
  return (i18n && i18n[locale]) || base;
}

function localizeDb(r: DbRow, locale: Locale): Post {
  return {
    slug: r.slug,
    title: pickDb(r.title ?? '', r.title_i18n, locale),
    description: pickDb(r.excerpt ?? '', r.excerpt_i18n, locale),
    image: r.featured_image_url ?? '',
    date: r.published_at ?? '',
    body: pickDb(r.content ?? '', r.content_i18n, locale),
  };
}

// ---------- blog.json fallback ----------

const allRawPosts = postsJson as RawPost[];

// Same scheduling rule for the bundled fallback.
function liveRawPosts(): RawPost[] {
  const now = Date.now();
  return allRawPosts.filter((p) => !p.date || new Date(p.date).getTime() <= now);
}

function pickJson(field: L10n, locale: Locale): string {
  return field[locale] ?? field.en ?? field.it;
}

function localizeJson(p: RawPost, locale: Locale): Post {
  return {
    slug: p.slug,
    title: pickJson(p.title, locale),
    description: pickJson(p.description, locale),
    image: p.image,
    date: p.date,
    body: pickJson(p.body, locale),
  };
}

// ---------- Public API ----------

export async function getPosts(locale: string): Promise<Post[]> {
  const l = normLocale(locale);
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select(DB_SELECT)
      .eq('status', 'published')
      .lte('published_at', nowIso())
      .order('published_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return (data as unknown as DbRow[]).map((r) => localizeDb(r, l));
    }
  } catch {
    // fall through to bundled content
  }
  return liveRawPosts().map((p) => localizeJson(p, l));
}

export async function getPost(slug: string, locale: string): Promise<Post | undefined> {
  const l = normLocale(locale);
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('blog_posts')
      .select(DB_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', nowIso())
      .maybeSingle();
    if (data) return localizeDb(data as unknown as DbRow, l);
  } catch {
    // fall through to bundled content
  }
  const p = liveRawPosts().find((x) => x.slug === slug);
  return p ? localizeJson(p, l) : undefined;
}

export async function getPostSlugs(): Promise<string[]> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .lte('published_at', nowIso());
    if (data && data.length > 0) return (data as Array<{ slug: string }>).map((r) => r.slug);
  } catch {
    // fall through to bundled content
  }
  return liveRawPosts().map((p) => p.slug);
}
