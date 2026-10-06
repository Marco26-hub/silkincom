#!/usr/bin/env node
// Genera un'anteprima HTML (una pagina, tutte le lingue) di uno o piu' articoli gia' in database,
// da mandare a Marco PRIMA di considerare l'articolo chiuso.
//
// Uso:
//   node scripts/blog/anteprima-articolo.mjs <slug> [<slug> ...] [--out file.html]
//
// Per ogni lingua mostra il box anteprima Google (seo_title + seo_description) e il testo completo.

import fs from 'node:fs';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : 'anteprima-blog.html';
const slugs = (outIdx >= 0 ? args.slice(0, outIdx) : args).filter(Boolean);
if (!slugs.length) {
  console.error('Uso: node scripts/blog/anteprima-articolo.mjs <slug> [<slug> ...] [--out file.html]');
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

const select = [
  'slug', 'published_at', 'status', 'title', 'seo_title', 'seo_description', 'content',
  'title_i18n', 'content_i18n', 'seo_title_i18n', 'seo_description_i18n', 'featured_image_url',
].join(',');
const res = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?select=${select}&slug=in.(${slugs.join(',')})&order=published_at`,
  { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
);
const rows = await res.json();
if (!Array.isArray(rows) || !rows.length) {
  console.error('nessun articolo trovato per:', slugs.join(', '), '\nrisposta:', JSON.stringify(rows).slice(0, 300));
  process.exit(1);
}

const NAMES = { it: 'Italiano', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', nl: 'Nederlands', en: 'English' };
const ORDER = ['it', 'en', 'es', 'fr', 'de', 'pt', 'nl'];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Stesso sottoinsieme di markdown che sa rendere il sito: ## , ### , paragrafi, link interni.
const md = (t) => esc(t).split('\n\n').map((p) => {
  p = p.trim();
  if (!p) return '';
  if (p.startsWith('### ')) return `<h3>${p.slice(4)}</h3>`;
  if (p.startsWith('## ')) return `<h2>${p.slice(3)}</h2>`;
  return `<p>${p.replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, '<a href="https://silkincom.com$2">$1</a>')}</p>`;
}).join('\n');

let html = `<!doctype html><meta charset="utf-8"><title>Anteprima blog SILKinCOM</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:0 auto;padding:32px 20px;color:#1a1a1a;line-height:1.7}
h1{font-size:22px;border-bottom:2px solid #b8860b;padding-bottom:8px}h2{font-size:20px;margin-top:32px}h3{font-size:17px}
.art{margin:48px 0;border-top:3px solid #b8860b;padding-top:16px}
.meta{font-family:Arial;font-size:13px;color:#666}
.snip{background:#f6f6f6;border-left:3px solid #b8860b;padding:10px 14px;margin:12px 0;font-family:Arial;font-size:13px}
.snip b{color:#1a0dab;font-weight:400;font-size:15px}.snip span{color:#4d5156}
details{margin:14px 0;border:1px solid #ddd;border-radius:6px;padding:8px 14px}
summary{cursor:pointer;font-family:Arial;font-size:14px;font-weight:bold}
img{max-width:100%;border-radius:6px}a{color:#8a6d1f}</style>
<h1>Anteprima blog SILKinCOM</h1>`;

for (const p of rows) {
  html += `<div class="art"><h1>${esc(p.title)}</h1>`
    + `<p class="meta">${p.status} · uscita ${String(p.published_at).slice(0, 10)} · /trame-di-como/${p.slug}</p>`;
  if (p.featured_image_url) html += `<img src="${p.featured_image_url}">`;
  for (const l of ORDER) {
    const title = l === 'it' ? p.title : p.title_i18n?.[l];
    if (!title) continue;
    const st = l === 'it' ? p.seo_title : p.seo_title_i18n?.[l];
    const sd = l === 'it' ? p.seo_description : p.seo_description_i18n?.[l];
    const txt = l === 'it' ? p.content : p.content_i18n?.[l];
    html += `<details${l === 'it' ? ' open' : ''}><summary>${NAMES[l]}</summary>
      <div class="snip"><b>${esc(st)}</b><br><span>silkincom.com › trame-di-como › ${p.slug}</span><br><span>${esc(sd)}</span></div>
      <h2 style="border:0">${esc(title)}</h2>${md(txt)}</details>`;
  }
  html += '</div>';
}

fs.writeFileSync(out, html);
console.log('anteprima scritta:', out, '|', rows.length, 'articoli');
