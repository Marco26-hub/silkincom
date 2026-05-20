import type { MetadataRoute } from 'next';
import { PRODUCT_SLUGS, CATEGORY_SLUGS } from '@/data/catalog';
import { getPosts } from '@/data/posts';
import { routing } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

// Builds the locale-prefixed URL for a path. The default locale (Italian) is
// served unprefixed; every other locale gets a `/{locale}` prefix.
function localizedUrl(locale: string, path: string): string {
  const suffix = path === '/' ? '' : path;
  return locale === routing.defaultLocale
    ? `${BASE_URL}${suffix || '/'}`
    : `${BASE_URL}/${locale}${suffix}`;
}

// Returns the hreflang alternates map for a path, listing every locale.
function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, localizedUrl(locale, path)])
  );
}

// Produces one sitemap entry per path: the default-locale URL plus the full
// set of per-locale hreflang alternates.
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    entry('/', { changeFrequency: 'daily', priority: 1.0, lastModified: now }),
    entry('/collezioni', { changeFrequency: 'weekly', priority: 0.9, lastModified: now }),
    entry('/materiali', { changeFrequency: 'monthly', priority: 0.8, lastModified: now }),
    entry('/la-nostra-storia', { changeFrequency: 'monthly', priority: 0.7, lastModified: now }),
    entry('/trame-di-como', { changeFrequency: 'weekly', priority: 0.7, lastModified: now }),
    entry('/contatti', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/faq', { changeFrequency: 'monthly', priority: 0.5, lastModified: now }),
    entry('/spedizioni', { changeFrequency: 'yearly', priority: 0.4, lastModified: now }),
    entry('/resi', { changeFrequency: 'yearly', priority: 0.4, lastModified: now }),
    entry('/cura-prodotto', { changeFrequency: 'yearly', priority: 0.4, lastModified: now }),
    entry('/cura-prodotto/seta', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/cashmere', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/lana', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/lino', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/cura-prodotto/cotone', { changeFrequency: 'yearly', priority: 0.5, lastModified: now }),
    entry('/atelier', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/b2b', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/artigiani', { changeFrequency: 'monthly', priority: 0.6, lastModified: now }),
    entry('/recensioni', { changeFrequency: 'weekly', priority: 0.6, lastModified: now }),
    entry('/privacy-policy', { changeFrequency: 'yearly', priority: 0.3, lastModified: now }),
    entry('/cookie-policy', { changeFrequency: 'yearly', priority: 0.3, lastModified: now }),
    entry('/termini', { changeFrequency: 'yearly', priority: 0.3, lastModified: now }),
  ];

  const productRoutes: MetadataRoute.Sitemap = PRODUCT_SLUGS.map((slug) =>
    entry(`/prodotto/${slug}`, {
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  );

  const collectionRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) =>
    entry(`/collezioni/${slug}`, {
      lastModified: now,
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
