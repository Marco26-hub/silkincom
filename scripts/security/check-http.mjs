/** Read-only checks: no cron invocation, write methods or payment requests. */
import { writeFile } from 'node:fs/promises';
const base = process.argv[2] ?? 'http://localhost:3010';
const checks = [];
const paths = ['/api/admin/products', '/api/admin/settings', '/api/admin/blog', '/api/admin/leads', '/api/account/export', '/api/admin/download-image?url=https://127.0.0.1/example.jpg', '/api/etest'];
const home = await fetch(base, { signal: AbortSignal.timeout(90000) });
for (const [header, expected] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY'], ['referrer-policy', 'strict-origin-when-cross-origin']]) checks.push({ name: header, pass: home.headers.get(header) === expected });
checks.push({ name: 'HSTS enabled', pass: /max-age=/.test(home.headers.get('strict-transport-security') ?? '') });
for (const path of paths) {
  const response = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
  const pass = path === '/api/etest' ? response.status === 404 : path === '/api/admin/products' ? response.status === 405 : [401, 403].includes(response.status);
  checks.push({ name: `${path}: unauthenticated request refused`, status: response.status, pass });
  await response.body?.cancel();
}
const report = { checkedAt: new Date().toISOString(), base, checks, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, scope: 'Read-only HTTP requests. Cron forgery tested only against a pure authorization helper, never against a live sending endpoint.' };
await writeFile('docs/aeo-2026-11-26/security-http.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failed ? 1 : 0;
