#!/usr/bin/env node
/** Read-only HTTP audit. No browser scripts, cookies, forms or analytics. */
import { parseDocument } from 'htmlparser2';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
if (args.includes('--help')) {
  console.log('node scripts/seo/check-aeo.mjs --base http://localhost:3010 --out docs/aeo-2026-11-26/local-check.json [--full] [--development] [--only /path,/en/path]\nChecks server HTML, seven locales, metadata, JSON-LD, robots, sitemap and feed. --full also visits every sitemap URL. No overall AEO score is inferred.');
  process.exit(0);
}
const base = option('--base', 'http://localhost:3010').replace(/\/$/, '');
const output = option('--out', 'tmp/aeo-check.json');
const canonicalOrigin = 'https://www.silkincom.com';
const locales = ['it', 'en', 'es', 'fr', 'de', 'pt', 'nl'];
const checks = [];
const record = (name, pass, detail) => checks.push({ name, status: pass ? 'pass' : 'fail', ...(detail ? { detail } : {}) });
const walk = (node) => [node, ...(node.children ?? []).flatMap(walk)];
const nodes = (source, xmlMode = false) => walk(parseDocument(source, { xmlMode, decodeEntities: true }));
const content = (node) => node?.type === 'text' ? node.data : (node?.children ?? []).map(content).join('');
async function fetchText(path, userAgent) {
  const res = await fetch(`${base}${path}`, { headers: { 'User-Agent': userAgent ?? 'SILKinCOM-AEO-ReadOnly-Audit/1.0' }, signal: AbortSignal.timeout(90000) });
  return { status: res.status, text: await res.text(), url: res.url, headers: Object.fromEntries(res.headers) };
}
let sitemapPaths = [];
let feedProducts = [];
try {
  const robots = await fetchText('/robots.txt');
  record('robots HTTP 200', robots.status === 200);
  const groups = robots.text.split(/\n\s*\n/).map(group => group.toLowerCase());
  for (const bot of ['oai-searchbot', 'gptbot', 'googlebot', 'bingbot', 'perplexitybot']) {
    const group = groups.find(g => g.includes(`user-agent: ${bot}\n`)) ?? '';
    record(`robots ${bot}: public pages allowed`, /allow: \/(?:\r?\n|$)/.test(group));
    record(`robots ${bot}: localized private routes excluded`, group.includes('disallow: /en/admin') && group.includes('disallow: /checkout'));
    record(`robots ${bot}: Merchant feed allowed`, group.includes('allow: /api/google-merchant/feed.xml'));
  }
  const sitemap = await fetchText('/sitemap.xml');
  record('sitemap HTTP 200', sitemap.status === 200);
  const xml = nodes(sitemap.text, true);
  const urls = xml.filter(n => n.name === 'url');
  const locs = urls.map(n => content(n.children.find(c => c.name === 'loc')));
  record('sitemap nonempty and unique', urls.length > 0 && new Set(locs).size === locs.length, `${urls.length} URLs`);
  record('sitemap uses canonical host', locs.every(url => url.startsWith(`${canonicalOrigin}/`)));
  record('sitemap excludes private paths', locs.every(url => !/\/(admin|account|checkout|login|registrati|carrello|cart)(\/|$)/.test(url)));
  for (const locale of locales) record(`sitemap has ${locale} homepage`, locs.includes(`${canonicalOrigin}${locale === 'it' ? '/' : `/${locale}`}`));
  for (const row of urls) {
    const loc = content(row.children.find(n => n.name === 'loc'));
    const alternates = row.children.filter(n => n.name === 'xhtml:link');
    if (alternates.length !== 8 || !alternates.some(n => n.attribs.href === loc)) record('sitemap reciprocal alternates', false, loc);
    for (const alt of alternates) if (alt.attribs.hreflang !== 'x-default' && !locs.includes(alt.attribs.href)) record('alternate has own sitemap record', false, alt.attribs.href);
  }
  sitemapPaths = locs.map(url => new URL(url).pathname);
  const feed = await fetchText('/api/google-merchant/feed.xml');
  record('Merchant feed HTTP 200', feed.status === 200);
  feedProducts = nodes(feed.text, true).filter(n => n.name === 'item').map(item => {
    const field = name => content(item.children.find(n => n.name === `g:${name}`));
    return { sku: field('id'), url: field('link'), price: Number((field('sale_price') || field('price')).split(' ')[0]), availability: field('availability') };
  });
  record('Merchant feed nonempty', feedProducts.length > 0, `${feedProducts.length} products`);
  record('Merchant feed URLs in sitemap', feedProducts.every(p => locs.includes(p.url)));
} catch (error) { record('discovery endpoints', false, error.message); }

async function auditPage(path) {
  try {
    const res = await fetchText(path);
    record(`${path} HTTP 200`, res.status === 200, res.status !== 200 ? `${res.status}` : undefined);
    if (res.status !== 200) return;
    const all = nodes(res.text);
    const tags = name => all.filter(n => n.name === name);
    const locale = locales.includes(path.split('/')[1]) ? path.split('/')[1] : 'it';
    record(`${path} HTML language`, tags('html')[0]?.attribs.lang === locale);
    record(`${path} single H1`, tags('h1').length === 1 && content(tags('h1')[0]).trim().length > 0, tags('h1').length !== 1 ? `${tags('h1').length} H1 elements` : undefined);
    record(`${path} title contains no raw markup`, !/<\/?\w[^>]*>/.test(content(tags('title')[0])));
    const links = tags('link');
    const canonical = links.find(n => n.attribs.rel === 'canonical')?.attribs.href;
    record(`${path} self canonical`, canonical && new URL(canonical).href === new URL(`${canonicalOrigin}${path}`).href);
    record(`${path} seven hreflang plus default`, new Set(links.filter(n => n.attribs.hreflang).map(n => n.attribs.hreflang)).size === 8);
    const noindex = tags('meta').some(n => /robots/i.test(n.attribs.name ?? '') && /noindex/.test(n.attribs.content ?? '')) || /noindex/i.test(res.headers['x-robots-tag'] ?? '');
    const developmentNoindex = args.includes('--development') && /\/experience$/.test(path);
    record(`${path} ${developmentNoindex ? 'intentional development noindex' : 'indexable'}`, developmentNoindex ? noindex : !noindex);
    const schemas = tags('script').filter(n => n.attribs.type === 'application/ld+json').map(n => JSON.parse(content(n)));
    const structured = schemas.flatMap(s => walkJson(s));
    record(`${path} Organization`, structured.some(s => [].concat(s['@type']).includes('Organization') && s['@id'] === `${canonicalOrigin}/#organization`));
    if (path.endsWith('/faq')) {
      const faq = structured.find(s => s['@type'] === 'FAQPage');
      record(`${path} FAQ matches visible questions`, faq?.mainEntity?.length === tags('h2').length && faq?.mainEntity?.every(q => tags('h2').some(h => content(h) === q.name)));
      record(`${path} Como dimensions distinguished`, tags('p').some(n => /120 × 7[,.]5/.test(content(n))));
      const internalLinks = tags('a').map(n => n.attribs.href ?? '').filter(href => /^\/(spedizioni|resi|cura-prodotto)(\/|$)/.test(href));
      record(`${path} assistance links localized`, locale === 'it' || internalLinks.length === 0);
    }
    if (/\/trame-di-como\//.test(path)) {
      const article = structured.find(s => s['@type'] === 'Article');
      record(`${path} Article URL matches locale`, article?.mainEntityOfPage?.['@id'] === `${canonicalOrigin}${path}`);
      record(`${path} Article author linked`, article?.author?.url === `${canonicalOrigin}${locale === 'it' ? '' : `/${locale}`}/maison/marco-dibenedetto`);
      record(`${path} journal body is readable HTML`, tags('article').some(n => content(n).trim().length > 200 && !/<\/?(?:p|h[1-6]|div|em|strong)\b[^>]*>/.test(content(n))));
      record(`${path} no invisible HowTo`, !structured.some(s => s['@type'] === 'HowTo'));
    }
    if (path.includes('/prodotto/')) {
      const product = structured.find(s => ['Product', 'ProductGroup'].includes(s['@type']) && (s.offers || s.hasVariant));
      record(`${path} Product or ProductGroup`, Boolean(product));
      const products = product?.hasVariant ?? (product ? [product] : []);
      for (const p of products) {
        const offer = p.offers;
        record(`${path} ${p.sku}: valid Offer`, !!offer && Number(offer.price) > 0 && offer.priceCurrency === 'EUR' && /\/(InStock|OutOfStock)$/.test(offer.availability));
        const t = offer?.shippingDetails?.deliveryTime;
        record(`${path} ${p.sku}: delivery 2–4 days`, t?.handlingTime?.minValue + t?.transitTime?.minValue === 2 && t?.handlingTime?.maxValue + t?.transitTime?.maxValue === 4);
      }
      if (locale === 'it') {
        const feed = feedProducts.find(p => new URL(p.url).pathname === path);
        if (feed && product) record(`${path} schema agrees with feed`, products.some(p => Number(p.offers.price) === feed.price) && (products.some(p => /\/InStock$/.test(p.offers.availability)) ? 'in_stock' : 'out_of_stock') === feed.availability);
      }
    }
  } catch (error) { record(`${path} audit completed`, false, error.message); }
}
function walkJson(value) {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(walkJson)];
}
const core = ['/', '/faq', '/materiali', '/press', '/artigiani', '/maison/marco-dibenedetto', '/trame-di-como', '/trame-di-como/come-annodare-un-twilly'];
const paths = new Set(locales.flatMap(locale => core.map(path => locale === 'it' ? path : `/${locale}${path === '/' ? '' : path}`)));
const sampleProducts = [...new Set([...feedProducts.slice(0, 2), ...feedProducts.filter(p => p.availability === 'out_of_stock').slice(0, 1), ...feedProducts.filter(p => /riva|lario|brunate|menaggio/.test(p.url)).slice(0, 4)].map(p => new URL(p.url).pathname))];
for (const path of sampleProducts) for (const locale of locales) paths.add(locale === 'it' ? path : `/${locale}${path}`);
if (args.includes('--full')) sitemapPaths.forEach(path => paths.add(path));
if (args.includes('--only')) { paths.clear(); option('--only', '').split(',').filter(Boolean).forEach(path => paths.add(path)); }
const queue = [...paths];
await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await auditPage(queue.shift()); }));
for (const bot of ['OAI-SearchBot', 'GPTBot', 'PerplexityBot', 'Googlebot']) {
  try { const res = await fetchText('/', bot); record(`${bot} homepage accessible`, res.status === 200 && res.text.includes('SILKinCOM')); }
  catch (error) { record(`${bot} homepage accessible`, false, error.message); }
}
for (const path of ['/llms.txt', '/llms-full.txt']) {
  try { const res = await fetchText(path); record(`${path} plain-text corpus available`, res.status === 200 && /text\/plain/.test(res.headers['content-type']) && res.text.includes('SILKinCOM')); }
  catch (error) { record(path, false, error.message); }
}
const failed = checks.filter(c => c.status === 'fail');
const report = { checkedAt: new Date().toISOString(), base, pages: paths.size, total: checks.length, passed: checks.length - failed.length, failed: failed.length, limits: ['HTTP validation is not a Rich Results Test or Search Console inspection.', 'No overall AEO score, indexing, rankings, independent reputation or AI visibility is inferred.', 'Sampled product and journal pages; use --full to crawl every sitemap URL.'], checks };
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pages: report.pages, passed: report.passed, failed: failed.length, output, failures: failed }, null, 2));
process.exitCode = failed.length ? 1 : 0;
