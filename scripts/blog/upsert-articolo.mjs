#!/usr/bin/env node
// Carica (o aggiorna) un articolo del blog su Supabase in tutte le lingue disponibili.
//
// Uso:
//   node scripts/blog/upsert-articolo.mjs <cartella> <prefisso> <status> <published_at>
//
//   cartella     dove stanno <prefisso>-it.md, <prefisso>-en.md, ... e <prefisso>-meta.json
//   prefisso     nome base dei file
//   status       draft | published  (published + data futura = uscita programmata)
//   published_at timestamp naive trattato come UTC, es. 2026-10-29T07:00:00 (= 09:00 Roma)
//
// Il meta.json ha la forma:
//   { "slug": "...", "image": "https://...", "title": {"it": "...", "en": "..."},
//     "description": {...}, "seo_title": {...}, "seo_description": {...} }
// L'italiano finisce nelle colonne base, le altre lingue nei campi *_i18n.
// Vengono incluse solo le lingue che hanno sia il file .md sia il titolo nel meta.

import fs from 'node:fs';
import path from 'node:path';

const [, , dir, prefix, status = 'draft', publishedAt] = process.argv;
if (!dir || !prefix || !publishedAt) {
  console.error('Uso: node scripts/blog/upsert-articolo.mjs <cartella> <prefisso> <status> <published_at>');
  process.exit(1);
}
if (!['draft', 'published'].includes(status)) {
  console.error(`status non valido: ${status} (ammessi: draft, published)`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const meta = JSON.parse(fs.readFileSync(path.join(dir, `${prefix}-meta.json`), 'utf8'));
const file = (loc) => path.join(dir, `${prefix}-${loc}.md`);
const body = (loc) => fs.readFileSync(file(loc), 'utf8').trim();

if (!fs.existsSync(file('it'))) {
  console.error(`manca l'italiano: ${file('it')}`);
  process.exit(1);
}

const LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'nl'];
const others = LOCALES.filter((l) => fs.existsSync(file(l)) && meta.title[l]);
for (const l of LOCALES) {
  if (fs.existsSync(file(l)) && !meta.title[l]) console.warn(`SKIP ${l}: file presente ma titolo assente nel meta`);
  if (!fs.existsSync(file(l)) && meta.title[l]) console.warn(`SKIP ${l}: titolo nel meta ma file ${file(l)} assente`);
}
const i18n = (pick) => Object.fromEntries(others.map((l) => [l, pick(l)]));

const row = {
  slug: meta.slug,
  status,
  published_at: publishedAt,
  title: meta.title.it,
  excerpt: meta.description.it,
  content: body('it'),
  featured_image_url: meta.image,
  seo_title: meta.seo_title.it,
  seo_description: meta.seo_description.it,
  title_i18n: i18n((l) => meta.title[l]),
  excerpt_i18n: i18n((l) => meta.description[l]),
  content_i18n: i18n(body),
  seo_title_i18n: i18n((l) => meta.seo_title[l]),
  seo_description_i18n: i18n((l) => meta.seo_description[l]),
};

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?on_conflict=slug`, {
  method: 'POST',
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  },
  body: JSON.stringify(row),
});
const text = await res.text();
if (!res.ok) {
  console.error('ERRORE', res.status, text.slice(0, 400));
  process.exit(1);
}
const saved = JSON.parse(text)[0];
console.log('OK', saved.slug, '|', saved.status, saved.published_at, '| lingue extra:', others.join(',') || 'nessuna');
