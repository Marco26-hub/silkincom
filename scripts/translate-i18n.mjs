/**
 * Auto-translation pipeline — Italian is the source of truth.
 *
 * Detects Italian strings that are new or changed since the last run and
 * (re)translates them into en/es/fr/de/pt/nl via the Anthropic API.
 *
 * Covers:
 *   - messages/{locale}.json    UI strings
 *   - src/data/products.json    product name / description / composition
 *   - src/data/blog.json        post title / description / body
 *   - src/data/catalog-i18n.json category / collection / material metadata
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npm run translate          apply translations
 *   npm run translate:check                             dry run, report gaps only
 *
 * A fingerprint cache (scripts/.i18n-cache.json) records the hash of every
 * Italian source string. On the next run, only changed sources are
 * retranslated; missing target locales are always filled.
 *
 * Override the model with TRANSLATE_MODEL (default: claude-3-5-haiku-latest).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['en', 'es', 'fr', 'de', 'pt', 'nl'];
const LANG = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'European Portuguese', nl: 'Dutch' };
const CACHE_FILE = path.join(ROOT, 'scripts/.i18n-cache.json');
const MODEL = process.env.TRANSLATE_MODEL || 'claude-3-5-haiku-latest';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const CHECK = process.argv.includes('--check');
const BATCH = 40;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');

// ---- flatten helpers (for messages) -------------------------------------
function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
function setNested(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/**
 * A "unit" is one translatable Italian string with per-locale getters/setters.
 * Datasets below each produce an array of units plus a save() callback.
 */

function messagesDataset() {
  const files = {};
  for (const loc of ['it', ...TARGETS]) {
    files[loc] = readJson(path.join(ROOT, `messages/${loc}.json`));
  }
  const itFlat = flatten(files.it);
  const targetFlat = {};
  for (const loc of TARGETS) targetFlat[loc] = flatten(files[loc]);

  const units = Object.keys(itFlat)
    .filter((k) => typeof itFlat[k] === 'string')
    .map((k) => ({
      id: `messages:${k}`,
      it: itFlat[k],
      get: (loc) => targetFlat[loc][k],
      set: (loc, v) => { targetFlat[loc][k] = v; },
    }));

  function save() {
    for (const loc of TARGETS) {
      const out = {};
      for (const [k, v] of Object.entries(targetFlat[loc])) setNested(out, k, v);
      writeJson(path.join(ROOT, `messages/${loc}.json`), out);
    }
  }
  return { name: 'messages', units, save };
}

function objectListDataset(name, file, fields) {
  // products.json / blog.json — array of items; each `field` is a {it,en,...} object
  const p = path.join(ROOT, file);
  const data = readJson(p);
  const units = [];
  for (const item of data) {
    for (const f of fields) {
      const obj = item[f];
      if (!obj || typeof obj !== 'object' || typeof obj.it !== 'string') continue;
      units.push({
        id: `${name}:${item.slug}.${f}`,
        it: obj.it,
        get: (loc) => obj[loc],
        set: (loc, v) => { obj[loc] = v; },
      });
    }
  }
  return { name, units, save: () => writeJson(p, data) };
}

function catalogI18nDataset() {
  const p = path.join(ROOT, 'src/data/catalog-i18n.json');
  const data = readJson(p);
  const units = [];
  for (const [field, entries] of Object.entries(data)) {
    for (const [key, obj] of Object.entries(entries)) {
      if (typeof obj?.it !== 'string') continue;
      units.push({
        id: `catalog:${field}.${key}`,
        it: obj.it,
        get: (loc) => obj[loc],
        set: (loc, v) => { obj[loc] = v; },
      });
    }
  }
  return { name: 'catalog', units, save: () => writeJson(p, data) };
}

// ---- Anthropic translation ----------------------------------------------
async function translateBatch(targetLang, items) {
  const system =
    `You translate content for SILKinCOM, a luxury silk and cashmere accessories brand, Made in Como, Italy. ` +
    `Translate from Italian into ${targetLang}. Use a premium, editorial tone. ` +
    `Rules: keep brand names (SILKinCOM, Como) unchanged; render "Lago di Como" with the natural local name for Lake Como. ` +
    `Preserve EXACTLY any ICU placeholders such as {count}, {name}, {amount} and any ICU plural/select syntax, ` +
    `and any HTML-like tags such as <em>...</em>. Do not translate text inside placeholders. ` +
    `Return ONLY a JSON object mapping each input id to its translated string — no prose, no code fence.`;
  const user =
    `Translate these Italian strings to ${targetLang}. Return a JSON object {id: translation}.\n\n` +
    JSON.stringify(items.map((i) => ({ id: i.id, it: i.it })));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  let text = (json.content?.[0]?.text || '').trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(text);
}

// ---- main ---------------------------------------------------------------
async function main() {
  const cache = fs.existsSync(CACHE_FILE) ? readJson(CACHE_FILE) : {};
  const datasets = [
    messagesDataset(),
    objectListDataset('products', 'src/data/products.json', ['name', 'description', 'composition']),
    objectListDataset('blog', 'src/data/blog.json', ['title', 'description', 'body']),
    catalogI18nDataset(),
  ];

  // Decide what each unit needs.
  const work = {}; // locale -> [{unit, id, it}]
  for (const loc of TARGETS) work[loc] = [];
  let changed = 0;
  let missing = 0;

  for (const ds of datasets) {
    for (const unit of ds.units) {
      const h = sha(unit.it);
      const prior = cache[unit.id];
      const itChanged = prior !== undefined && prior !== h;
      if (itChanged) changed++;
      for (const loc of TARGETS) {
        const cur = unit.get(loc);
        const empty = cur === undefined || cur === null || cur === '';
        if (empty) missing++;
        if (empty || itChanged) {
          work[loc].push({ unit, id: unit.id, it: unit.it });
        }
      }
    }
  }

  const totalJobs = TARGETS.reduce((n, l) => n + work[l].length, 0);
  console.log(`Source units: ${datasets.reduce((n, d) => n + d.units.length, 0)}`);
  console.log(`Changed Italian sources: ${changed} | missing target values: ${missing}`);
  console.log(`Translation jobs: ${totalJobs}` + (totalJobs ? ` (${TARGETS.map((l) => `${l}:${work[l].length}`).join(' ')})` : ''));

  if (CHECK) {
    console.log('\n[--check] dry run — nothing written.');
    return;
  }
  if (totalJobs === 0) {
    console.log('Everything up to date.');
    return;
  }
  if (!API_KEY) {
    console.error('\nERROR: ANTHROPIC_API_KEY not set. Export it and re-run, or use npm run translate:check.');
    process.exit(1);
  }

  // Translate per locale, in batches.
  for (const loc of TARGETS) {
    const jobs = work[loc];
    for (let i = 0; i < jobs.length; i += BATCH) {
      const slice = jobs.slice(i, i + BATCH);
      process.stdout.write(`  ${loc}: ${i + slice.length}/${jobs.length}\r`);
      const out = await translateBatch(LANG[loc], slice);
      for (const job of slice) {
        const v = out[job.id];
        if (typeof v === 'string' && v.trim()) job.unit.set(loc, v);
        else console.warn(`\n  WARN: no translation for ${job.id} (${loc})`);
      }
    }
    if (jobs.length) console.log(`  ${loc}: ${jobs.length}/${jobs.length} done`);
  }

  // Persist files + refresh cache fingerprints.
  for (const ds of datasets) ds.save();
  for (const ds of datasets) {
    for (const unit of ds.units) cache[unit.id] = sha(unit.it);
  }
  writeJson(CACHE_FILE, cache);
  console.log('\nDone. Files updated, fingerprint cache refreshed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
