import type { MetadataRoute } from 'next';
import { PRODUCT_SLUGS, CATEGORY_SLUGS } from '@/data/catalog';
import { getPosts } from '@/data/posts';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'daily', priority: 1.0, lastModified: now },
    { url: `${BASE_URL}/collezioni`, changeFrequency: 'weekly', priority: 0.9, lastModified: now },
    { url: `${BASE_URL}/materiali`, changeFrequency: 'monthly', priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/la-nostra-storia`, changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/trame-di-como`, changeFrequency: 'weekly', priority: 0.7, lastModified: now },
    { url: `${BASE_URL}/contatti`, changeFrequency: 'yearly', priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/spedizioni`, changeFrequency: 'yearly', priority: 0.4, lastModified: now },
    { url: `${BASE_URL}/resi`, changeFrequency: 'yearly', priority: 0.4, lastModified: now },
    { url: `${BASE_URL}/cura-prodotto`, changeFrequency: 'yearly', priority: 0.4, lastModified: now },
    { url: `${BASE_URL}/atelier`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${BASE_URL}/b2b`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${BASE_URL}/artigiani`, changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${BASE_URL}/recensioni`, changeFrequency: 'weekly', priority: 0.6, lastModified: now },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    { url: `${BASE_URL}/cookie-policy`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
    { url: `${BASE_URL}/termini`, changeFrequency: 'yearly', priority: 0.3, lastModified: now },
  ];

  const productRoutes: MetadataRoute.Sitemap = PRODUCT_SLUGS.map((slug) => ({
    url: `${BASE_URL}/prodotto/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/collezioni/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const journalRoutes: MetadataRoute.Sitemap = getPosts('it').map((post) => ({
    url: `${BASE_URL}/trame-di-como/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...collectionRoutes, ...journalRoutes];
}
