import type { MetadataRoute } from 'next';
import { PRODUCT_SLUGS, CATEGORY_SLUGS } from '@/data/catalog';
import { getPosts } from '@/data/posts';
import { routing } from '@/i18n/routing';
import { createPublicClient } from '@/lib/supabase/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

function localizedUrl(locale: string, path: string): string {
  const suffix = path === '/' ? '' : path;
  return locale === routing.defaultLocale
    ? `${BASE_URL}${suffix || '/'}`
    : `${BASE_URL}/${locale}${suffix}`;
}

function languageAlternates(path: string): Record<string, string> {
  const entries: Array<[string, string]> = routing.locales.map((locale) => [locale, localizedUrl(locale, path)]);
  // x-default points to the default-locale URL (Italian, no prefix) so AI crawlers
  // and Google parsing only the sitemap (not the HTTP Link header) get the full hreflang signal.
  entries.push(['x-default', localizedUrl(routing.defaultLocale, path)]);
  return Object.fromEntries(entries);
}

function entry(
  path: string,
  options: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>
): MetadataRoute.Sitemap[number] {
  return {
    url: localizedUrl(routing.defaultLocale, path),
    alternates: { languages: languageAlternates(path) },
    ...options,
  };
}

/**
 * Build lookup maps of `slug → updated_at` so static SLUG arrays can still
 * drive the sitemap (preserves the existing build-time pipeline) while
 * carrying accurate `lastModified` from the live DB. Falls back to `now`
 * if the DB read fails or the row is missing.
 */
async function getDbLastMod(): Promise<{
  products: Map<string, Date>;
  collections: Map<string, Date>;
  home: Date;
}> {
  const products = new Map<string, Date>();
  const collections = new Map<string, Date>();
  let home = new Date();

  try {
    const supabase = createPublicClient();
    const [{ data: prods }, { data: cols }, { data: slides }] = await Promise.all([
      supabase.from('products').select('slug, updated_at').eq('status', 'published'),
      supabase.from('collections').select('slug, updated_at').eq('is_active', true),
      supabase.from('home_slides').select('updated_at').eq('is_active', true).order('updated_at', { ascending: false }).limit(1),
    ]);
    (prods ?? []).forEach((p: { slug: string; updated_at: string }) => {
      if (p.slug && p.updated_at) products.set(p.slug, new Date(p.updated_at));
    });
    (cols ?? []).forEach((c: { slug: string; updated_at: string }) => {
      if (c.slug && c.updated_at) collections.set(c.slug, new Date(c.updated_at));
    });
    if (slides?.[0]?.updated_at) home = new Date(slides[0].updated_at);
  } catch (e) {
    console.error('sitemap getDbLastMod', e);
  }

  return { products, collections, home };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const lastMod = await getDbLastMod();

  const staticRoutes: MetadataRoute.Sitemap = [
    entry('/', { changeFrequency: 'daily', priority: 1.0, lastModified: lastMod.home }),
    entry('/collezioni', { changeFrequency: 'weekly', priority: 0.9, lastModified: now }),
    entry('/materiali', { changeFrequency: 'monthly', priority: 0.8, lastModified: now }),
    entry('/la-nostra-storia', { changeFrequency: 'monthly', priority: 0.7, lastModified: now }),
    entry('/trame-di-como', { changeFrequency: 'weekly', priority: 0.7, lastModified: now }),
    entry('/contatti', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/faq', { changeFrequency: 'monthly', priority: 0.5, lastModified: now }),
    entry('/spedizioni', { changeFrequency: 'yearly', priority: 0.4, lastModified: now }),
    entry('/resi', { changeFrequency: 'yearly', priority: 0.4, lastModified: now }),
    entry('/cura-prodotto', { changeFrequency: 'yearly', priority: 0.4, lastModified: now }),
    entry('/glossario', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/cura-prodotto/seta', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/cashmere', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/lana', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/lino', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/cotone', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/atelier', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/b2b', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/artigiani', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/maison/marco-dibenedetto', { changeFrequency: 'monthly', priority: 0.7, lastModified: now }),
    entry('/press', { changeFrequency: 'monthly', priority: 0.5, lastModified: now }),
    entry('/recensioni', { changeFrequency: 'weekly', priority: 0.6, lastModified: now }),
    entry('/privacy-policy', { changeFrequency: 'yearly', priority: 0.3, lastModified: now }),
    entry('/cookie-policy', { changeFrequency: 'yearly', priority: 0.3, lastModified: now }),
    entry('/termini', { changeFrequency: 'yearly', priority: 0.3, lastModified: now }),
  ];

  const productRoutes: MetadataRoute.Sitemap = PRODUCT_SLUGS.map((slug) =>
    entry(`/prodotto/${slug}`, {
      lastModified: lastMod.products.get(slug) ?? now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  );

  const collectionRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) =>
    entry(`/collezioni/${slug}`, {
      lastModified: lastMod.collections.get(slug) ?? now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  );

  const journalRoutes: MetadataRoute.Sitemap = getPosts('it').map((post) =>
    entry(`/trame-di-como/${post.slug}`, {
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  );

  return [...staticRoutes, ...productRoutes, ...collectionRoutes, ...journalRoutes];
}
