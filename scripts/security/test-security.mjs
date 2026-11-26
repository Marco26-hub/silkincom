import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
mkdirSync(resolve('tmp'), { recursive: true });
const dir = mkdtempSync(resolve('tmp', 'security-tests-'));
function load(path) {
  const destination = resolve(dir, path.split('/').at(-1).replace('.ts', '.cjs'));
  writeFileSync(destination, ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText);
  return require(destination);
}
const guard = load('src/lib/security/guards.ts');
const checkout = load('src/lib/checkout-validation.ts');
load('src/lib/lead-segments.ts');
writeFileSync(resolve(dir, 'lead-segments.js'), "module.exports = require('./lead-segments.cjs');");
const validations = load('src/lib/validations.ts');
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

test('a forged x-vercel-cron header cannot authorize maintenance', () => {
  assert.equal(guard.cronAuthorized(new Headers({ 'x-vercel-cron': '1' }), 'test-cron-secret'), false);
  assert.equal(guard.cronAuthorized(new Headers({ authorization: 'Bearer wrong' }), 'test-cron-secret'), false);
  assert.equal(guard.cronAuthorized(new Headers({ authorization: 'Bearer test-cron-secret' }), 'test-cron-secret'), true);
  assert.equal(guard.cronAuthorized(new Headers({ authorization: 'Bearer anything' }), ''), false);
});
test('auth redirects stay on the site even with backslashes or control characters', () => {
  for (const value of ['//evil.example', '/\\evil.example', 'https://evil.example', '/\nevil', '/\tevil']) assert.equal(guard.safeInternalPath(value), null);
  assert.equal(guard.safeInternalPath('/account?tab=orders'), '/account?tab=orders');
  assert.equal(guard.safeInternalPath('/en/admin'), '/en/admin');
});
test('image proxy rejects hostname suffix tricks, credentials and internal destinations', () => {
  for (const url of ['https://evilsilkincom.com/image.jpg', 'http://static.wixstatic.com/a.jpg', 'https://127.0.0.1/a.jpg', 'https://169.254.169.254/latest/meta-data', 'https://user:password@www.silkincom.com/a.jpg', 'https://www.silkincom.com:8080/a.jpg']) assert.equal(guard.trustedImageUrl(url), null);
  for (const url of ['https://www.silkincom.com/a.jpg', 'https://static.wixstatic.com/a.jpg', 'https://example.supabase.co/storage/v1/object/public/a.jpg']) assert.ok(guard.trustedImageUrl(url));
});
test('updated Zod rejects invalid checkout identity before any payment or order exists', () => {
  const address = { full_name: 'Test Customer', street_address: 'Via Test 1', city: 'Como', postal_code: '22100', country: 'it', phone: '12345678' };
  assert.equal(checkout.shippingAddressSchema.parse(address).country, 'IT');
  assert.equal(checkout.shippingAddressSchema.safeParse({ ...address, street_address: '   ' }).success, false);
  assert.equal(checkout.shippingAddressSchema.safeParse({ ...address, country: 'ITALY' }).success, false);
  assert.equal(checkout.checkoutContactSchema.safeParse({ first_name: 'Test', last_name: 'Customer', customer_email: 'invalid' }).success, false);
});
test('oversized constrained collections are rejected before item validation', () => {
  const { z } = require('zod');
  let validated = 0;
  const schema = z.array(z.string().superRefine(() => { validated++; })).max(50);
  assert.equal(schema.safeParse(Array(10000).fill('oversized')).success, false);
  assert.equal(validated, 0);
});

test('Zod upgrade preserves admin product coercion and requires outreach preview approval', () => {
  const product = validations.productSchema.safeParse({ name: 'Synthetic product', slug: 'synthetic-product', sku: 'SYN-001', price: '79', status: 'draft' });
  assert.equal(product.success, true);
  assert.equal(product.data.price, 79);
  const outreach = { leadIds: ['11111111-1111-4111-8111-111111111111'], previewConfirmed: false };
  const rejected = validations.leadOutreachSchema.safeParse(outreach);
  assert.equal(rejected.success, false);
  assert.ok(rejected.error.issues.some(issue => issue.message.includes('anteprima')));
  assert.equal(validations.leadOutreachSchema.safeParse({ ...outreach, previewConfirmed: true }).success, true);
});
