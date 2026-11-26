import 'server-only';
import { createHash } from 'node:crypto';
import larioTranslations from './blog-translations/t-shirt-bianca-lario-sera-lago-di-como.json';
import { editorialMarkdown, editorialPlainText } from '@/lib/editorial-text';
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
  updatedAt: string;
  /** Admin SEO title/description for this locale; '' when not set. */
  seoTitle: string;
  seoDescription: string;
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
  updated_at: string | null;
  title_i18n: Record<string, string> | null;
  excerpt_i18n: Record<string, string> | null;
  content_i18n: Record<string, string> | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_title_i18n: Record<string, string> | null;
  seo_description_i18n: Record<string, string> | null;
};

const DB_SELECT =
  'slug, title, excerpt, content, featured_image_url, published_at, updated_at, title_i18n, excerpt_i18n, content_i18n, ' +
  'seo_title, seo_description, seo_title_i18n, seo_description_i18n';

function pickDb(base: string, i18n: Record<string, string> | null, locale: Locale, curated?: string): string {
  if (locale === 'it') return base;
  if (i18n?.[locale]) return i18n[locale];
  if (curated) {
    console.info(`[journal] Missing CMS ${locale} field; using reviewed bundled translation.`);
    return curated;
  }
  console.warn(`[journal] Missing ${locale} translation; using Italian source.`);
  return base;
}

// SEO strings must not fall back to Italian on a foreign page: an empty value
// lets the page derive them from the (already localized) title and excerpt.
function pickSeo(base: string | null, i18n: Record<string, string> | null, locale: Locale): string {
  if (locale === 'it') return base ?? '';
  return (i18n && i18n[locale]) || '';
}

function localizeDb(r: DbRow, locale: Locale): Post {
  const isLario = r.slug === 't-shirt-bianca-lario-sera-lago-di-como';
  const matchesSource = isLario && createHash('sha256').update(r.content ?? '').digest('hex') === larioTranslations.sourceContentSha256;
  if (isLario && !matchesSource) console.warn('[journal] Lario source changed; bundled translations skipped pending review.');
  const curated = matchesSource && locale !== 'it' ? larioTranslations.translations[locale] : undefined;
  return {
    slug: r.slug,
    title: editorialPlainText(pickDb(r.title ?? '', r.title_i18n, locale, curated?.title)),
    description: editorialPlainText(pickDb(r.excerpt ?? '', r.excerpt_i18n, locale, curated?.excerpt)),
    image: r.featured_image_url ?? '',
    date: r.published_at ?? '',
    updatedAt: r.updated_at ?? r.published_at ?? '',
    body: editorialMarkdown(pickDb(r.content ?? '', r.content_i18n, locale, curated?.content)),
    seoTitle: editorialPlainText(pickSeo(r.seo_title, r.seo_title_i18n, locale)),
    seoDescription: editorialPlainText(pickSeo(r.seo_description, r.seo_description_i18n, locale)),
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
  if (field[locale]) return field[locale]!;
  console.warn(`[journal] Missing bundled ${locale} translation; using English or Italian source.`);
  return field.en ?? field.it;
}

function localizeJson(p: RawPost, locale: Locale): Post {
  return {
    slug: p.slug,
    title: editorialPlainText(pickJson(p.title, locale)),
    description: editorialPlainText(pickJson(p.description, locale)),
    image: p.image,
    date: p.date,
    updatedAt: p.date,
    body: editorialMarkdown(pickJson(p.body, locale)),
    seoTitle: '',
    seoDescription: '',
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
    if (!error && data) {
      return (data as unknown as DbRow[]).map((r) => localizeDb(r, l));
    }
    console.error('[journal] List unavailable; using bundled content:', error?.message ?? 'CMS returned no published posts');
  } catch (error) {
    console.error('[journal] List failed; using bundled content:', error);
  }
  return liveRawPosts().map((p) => localizeJson(p, l));
}

export async function getPost(slug: string, locale: string): Promise<Post | undefined> {
  const l = normLocale(locale);
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select(DB_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', nowIso())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? localizeDb(data as unknown as DbRow, l) : undefined;
  } catch (error) {
    console.error(`[journal] ${slug} read failed; using bundled content:`, error);
  }
  const p = liveRawPosts().find((x) => x.slug === slug);
  return p ? localizeJson(p, l) : undefined;
}

export async function getPostSlugs(): Promise<string[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .lte('published_at', nowIso());
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { slug: string }) => r.slug);
  } catch (error) {
    console.error('[journal] Slug list failed; using bundled content:', error);
  }
  return liveRawPosts().map((p) => p.slug);
}
