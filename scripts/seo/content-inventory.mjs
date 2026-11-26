/** Read-only inventory of published Journal metadata and translation coverage. */
import { createClient } from '@supabase/supabase-js';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data, error } = await s.from('blog_posts').select('slug,title,title_i18n,excerpt,excerpt_i18n,content,content_i18n,seo_title,seo_title_i18n,seo_description,seo_description_i18n,updated_at,published_at').eq('status', 'published').lte('published_at', new Date().toISOString());
if (error) throw new Error(error.message);
const curated = JSON.parse(await readFile('src/data/blog-translations/t-shirt-bianca-lario-sera-lago-di-como.json', 'utf8'));
const locales = ['en', 'es', 'fr', 'de', 'pt', 'nl'];
const articles = data.map(row => ({
  slug: row.slug, title: row.title, updatedAt: row.updated_at,
  titleContainsHtml: /<[^>]+>/.test(row.title),
  bodyContainsHtml: /<\/?(?:p|div|h[1-6]|a|strong)\b/.test(row.content),
  commercialFlags: [...row.content.matchAll(/.{0,90}(?:85\s*[×x]\s*5|3[–-]5\s+giorni).{0,90}/g)].map(match => match[0]),
  bundledTranslations: row.slug === 't-shirt-bianca-lario-sera-lago-di-como' ? Object.keys(curated.translations) : [],
  missingTranslations: locales.flatMap(locale => ['title', 'excerpt', 'content', 'seo_title', 'seo_description'].filter(field => !row[`${field}_i18n`]?.[locale]?.trim()).map(field => `${locale}:${field}`)),
}));
const report = { checkedAt: new Date().toISOString(), source: 'Public published blog_posts only', count: articles.length, missingTranslations: articles.reduce((sum, row) => sum + row.missingTranslations.length, 0), effectiveMissingEditorialTranslations: articles.flatMap(row => row.missingTranslations.filter(value => ['title', 'excerpt', 'content'].includes(value.split(':')[1]) && !row.bundledTranslations.includes(value.split(':')[0]))).length, articles };
await mkdir('docs/aeo-2026-11-26', { recursive: true });
await writeFile('docs/aeo-2026-11-26/content-inventory.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ count: report.count, missingTranslations: report.missingTranslations, titlesWithHtml: articles.filter(a => a.titleContainsHtml).length, bodiesWithHtml: articles.filter(a => a.bodyContainsHtml).length }));
