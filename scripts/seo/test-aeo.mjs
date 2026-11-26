import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
// Compile only pure production helpers, avoiding Next's server-only runtime.
mkdirSync(resolve('tmp'), { recursive: true });
const directory = mkdtempSync(resolve('tmp', 'aeo-tests-'));
function load(path) {
  const file = resolve(directory, path.split('/').at(-1).replace('.ts', '.cjs'));
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  writeFileSync(file, compiled.outputText);
  return require(file);
}
const text = load('src/lib/editorial-text.ts');
const traffic = load('src/lib/traffic-source.ts');
const shipping = load('src/config/shipping.ts');
process.on('exit', () => rmSync(directory, { recursive: true, force: true }));

test('legacy HTML yields real heading and paragraph boundaries without joined words', () => {
  assert.equal(text.editorialMarkdown('<h2>Seta &amp; Como</h2><p>Prima parte.</p><p>Seconda&nbsp;parte.</p>'), '## Seta & Como\n\nPrima parte.\n\nSeconda parte.');
  assert.equal(text.editorialPlainText('<p>Seta</p><p>Como</p>'), 'Seta Como');
});
test('CMS links preserve text while rejecting executable or protocol-relative URLs', () => {
  assert.equal(text.editorialMarkdown('<p>Vai a <a href="/materiali">materiali</a>.</p>'), 'Vai a [materiali](/materiali).');
  assert.equal(text.editorialMarkdown('<a href="javascript:alert(1)">Sicuro</a><script>alert(1)</script>'), 'Sicuro');
  for (const url of ['javascript:alert(1)', '//evil.com', '/\\evil.com', 'data:text/html,bad']) assert.equal(text.editorialHref(url), null);
});
test('malformed and multilingual legacy HTML decodes entities without showing tags', () => {
  assert.equal(text.editorialPlainText('<em>Écharpe</em> &#224; C&#244;me'), 'Écharpe à Côme');
  assert.equal(text.editorialPlainText('<p>Uno<p>Due'), 'Uno Due');
});
test('JSON-LD cannot be closed by a CMS value', () => {
  const value = { name: '</script><script>alert(1)</script>' };
  const serialized = text.jsonLd(value);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), value);
});
test('AI referrals use exact hosts; search and direct visits stay distinguishable', () => {
  assert.deepEqual(traffic.referralSource('https://chatgpt.com/c/example'), { source: 'chatgpt.com', medium: 'ai_assistant' });
  assert.deepEqual(traffic.referralSource('https://www.perplexity.ai/search/example'), { source: 'perplexity.ai', medium: 'ai_assistant' });
  assert.equal(traffic.referralSource('https://gemini.google.com/app/123').medium, 'ai_assistant');
  assert.equal(traffic.referralSource('https://google.com/search?q=seta').medium, 'organic');
  assert.equal(traffic.referralSource('https://fakechatgpt.com').medium, 'referral');
  assert.equal(traffic.referralSource('https://silkincom.com/faq'), null);
  assert.equal(traffic.referralSource(''), null);
  assert.equal(traffic.isAiSource('chatgpt'), true);
});
test('shipping threshold and schema delivery cover the published 2–4-day estimate', () => {
  assert.equal(shipping.computeShipping(199.99), 9);
  assert.equal(shipping.computeShipping(200), 0);
  const d = shipping.ITALY_DELIVERY;
  assert.equal(d.handlingMin + d.transitMin, 2);
  assert.equal(d.handlingMax + d.transitMax, 4);
});

test('six bundled Lario translations retain all sections and working internal links', () => {
  const bundle = JSON.parse(readFileSync('src/data/blog-translations/t-shirt-bianca-lario-sera-lago-di-como.json', 'utf8'));
  assert.deepEqual(Object.keys(bundle.translations).sort(), ['de', 'en', 'es', 'fr', 'nl', 'pt']);
  for (const translation of Object.values(bundle.translations)) {
    assert.equal((translation.content.match(/^## /gm) ?? []).length, 4);
    assert.deepEqual([...translation.content.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]), ['/prodotto/lario', '/camicie-lino', '/materiali#lino-cotone']);
    assert.ok(translation.title && translation.excerpt && translation.content.length > 1800);
  }
});

test('checkout shipping matches the published destination tariffs and thresholds', () => {
  assert.equal(shipping.computeShipping(199.99, 'IT'), 9);
  assert.equal(shipping.computeShipping(200, 'IT'), 0);
  for (const country of ['FR', 'DE', 'ES', 'NL', 'PT', 'BE', 'AT', 'IE']) {
    assert.equal(shipping.computeShipping(200, country), 18);
    assert.equal(shipping.computeShipping(349.99, country), 18);
    assert.equal(shipping.computeShipping(350, country), 0);
  }
  for (const country of ['GB', 'CH', 'NO']) assert.equal(shipping.computeShipping(500, country), 25);
  assert.equal(shipping.computeShipping(500, 'US'), 35);
  assert.equal(shipping.computeShipping(100, 'fr'), 18);
  assert.throws(() => shipping.computeShipping(100, 'invalid'));
});
