import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const results = [];
async function load(file, outcome, env = { NEXT_PUBLIC_SUPABASE_URL: 'https://catalog.example.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-fixture' }) {
  const logs = []; let queries = 0;
  const resolve = () => { queries++; return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome); };
  const query = { select: () => ({ then: (yes, no) => resolve().then(yes, no), eq: () => ({ order: resolve }) }) };
  const client = { from: () => query };
  const fallback = ['inverno','iconica','primavera'].map(slug => ({ slug, name: slug, shortName: slug, image: '/fixture.webp', tagline: '', description: '', accent: '' }));
  const require = name => {
    if (name === 'next/cache') return { unstable_cache: fn => fn };
    if (name === '@/lib/supabase/server') return { createPublicClient: () => client };
    if (name === '@supabase/supabase-js') return { createClient: () => client };
    if (name === './catalog-meta') return { getCollections: () => fallback };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const mod = { exports: {} };
  const code = ts.transpileModule(await fs.readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require, process: { env }, console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) }, Date, Set });
  return { api: mod.exports, logs, queries: () => queries };
}
for (const outcome of [{ data: null, error: { code: 'UNAVAILABLE' } }, new Error('Offline')]) {
  const fixture = await load('src/data/collections-db.ts', outcome);
  const collections = await fixture.api.getFeaturedCollections('it');
  assert.equal(collections.length, 3);
  assert.ok(collections.every(item => item.id.startsWith('fallback-')));
  assert.equal((await fixture.api.getFeaturedCollection('inverno', 'it')).slug, 'inverno');
  assert.equal(await fixture.api.getFeaturedCollection('not-a-collection', 'it'), null);
  assert.ok(fixture.logs.length > 0, 'Fallback must be logged');
  results.push({ case: outcome instanceof Error ? 'CMS throws' : 'CMS query error', navigationPreserved: true, logged: true });
}
const empty = await load('src/data/collections-db.ts', { data: [], error: null });
assert.equal((await empty.api.getFeaturedCollections('it')).length, 0, 'An intentionally empty CMS must remain empty');
results.push({ case: 'CMS intentionally empty', respected: true });
for (const [name,outcome,env] of [
  ['missing configuration',{data:[],error:null},{}],
  ['catalog error',{data:null,error:{code:'UNAVAILABLE'}}],
  ['empty catalog',{data:[],error:null}],
  ['network exception',new Error('Offline')],
]) {
  const fixture = await load('src/lib/product-slugs.ts',outcome,env);
  assert.equal(await fixture.api.getValidProductSlugs(), null);
  assert.ok(fixture.logs.length > 0, name);
  results.push({ case:name, avoidsFalse404:true, logged:true });
}
const valid = await load('src/lib/product-slugs.ts',{data:[{slug:'published-product'}],error:null});
assert.ok((await valid.api.getValidProductSlugs()).has('published-product'));
await valid.api.getValidProductSlugs();
assert.equal(valid.queries(),1);
results.push({case:'valid catalog cache',passes:true});
await fs.writeFile('consegna_finale/restyling-2026-10-15/qa/fallbacks.json', JSON.stringify({mode:'isolated mocks; no production mutations',results},null,2)+'\n');
console.log(`PASS: ${results.length} isolated fallback/cache scenarios`);
