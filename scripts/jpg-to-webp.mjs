/**
 * One-shot: convert every JPG in the product-images bucket to WebP and
 * update product_images.image_url to the new .webp URL.
 *
 * Why: WebP at q82 is ~30% smaller than JPG q78 with comparable visual
 * quality, and storefront pages currently load ~22 MB of JPGs. After
 * this pass the same product pages should serve ~14–15 MB.
 *
 * Behavior:
 *   - For each JPG, download → sharp.webp({ quality: 82, effort: 5 }) → upload
 *     <same path>.webp to the same bucket (cacheControl 1 year, upsert).
 *   - DB image_url rewritten from .jpg?v=N to .webp?v=N+1 (cache buster).
 *   - The original JPG is left in place unless --delete-source is passed.
 *
 * Env:
 *   SUPABASE_URL                — required
 *   SUPABASE_SERVICE_ROLE_KEY   — required
 *
 * Usage:
 *   node scripts/jpg-to-webp.mjs              # convert + DB update, keep JPGs
 *   node scripts/jpg-to-webp.mjs --delete-source  # also remove original JPGs
 *   node scripts/jpg-to-webp.mjs --limit=10   # process only N files (test run)
 *
 * Idempotent: if a .webp already exists it is overwritten; DB rows already
 * pointing at .webp are skipped.
 */
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'product-images';
const QUALITY = 82;
const NEW_VERSION = 4;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}

const args = process.argv.slice(2);
const deleteSource = args.includes('--delete-source');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function kb(n) {
  return `${(n / 1024).toFixed(0)} KB`;
}

async function listAllJpgs() {
  // Storage list is paginated; folders need recursive walking. The bucket
  // layout is product-images/<product_id>/<filename>.jpg
  const out = [];
  const { data: roots, error: rootsErr } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  if (rootsErr) throw rootsErr;
  for (const entry of roots || []) {
    if (entry.id == null) {
      const { data: files } = await supabase.storage.from(BUCKET).list(entry.name, { limit: 1000 });
      for (const f of files || []) {
        if (/\.jpe?g$/i.test(f.name)) {
          out.push({ path: `${entry.name}/${f.name}`, size: f.metadata?.size || 0 });
        }
      }
    } else if (/\.jpe?g$/i.test(entry.name)) {
      out.push({ path: entry.name, size: entry.metadata?.size || 0 });
    }
  }
  return out;
}

async function processOne(file) {
  const webpPath = file.path.replace(/\.jpe?g$/i, '.webp');

  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(file.path);
  if (dlErr || !blob) throw new Error(`download: ${dlErr?.message ?? 'no blob'}`);
  const before = blob.size;
  const buf = Buffer.from(await blob.arrayBuffer());

  const webp = await sharp(buf)
    .rotate()
    .webp({ quality: QUALITY, effort: 5 })
    .toBuffer();

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(webpPath, webp, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  if (deleteSource) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([file.path]);
    if (rmErr) console.warn(`  remove warn: ${rmErr.message}`);
  }

  return { before, after: webp.length, webpPath };
}

async function updateDbUrls(jpgPath, webpPath) {
  // image_url contains the full public URL; rewrite both the extension and
  // the cache buster so CDN edges drop the old JPG response.
  const jpgPattern = `%${jpgPath}%`;
  const { data: rows } = await supabase
    .from('product_images')
    .select('id, image_url')
    .ilike('image_url', jpgPattern);
  let updated = 0;
  for (const r of rows || []) {
    const newUrl = r.image_url
      .replace(jpgPath, webpPath)
      .replace(/\?v=\d+/, `?v=${NEW_VERSION}`);
    const finalUrl = newUrl.includes('?v=') ? newUrl : `${newUrl}?v=${NEW_VERSION}`;
    const { error } = await supabase
      .from('product_images')
      .update({ image_url: finalUrl })
      .eq('id', r.id);
    if (!error) updated++;
  }
  return updated;
}

async function main() {
  console.log(`Listing JPGs in bucket "${BUCKET}"…`);
  const files = (await listAllJpgs()).slice(0, limit);
  console.log(`Found ${files.length} JPG file(s) to convert.`);

  let totalBefore = 0;
  let totalAfter = 0;
  let dbUpdated = 0;
  let failures = 0;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    process.stdout.write(`[${i + 1}/${files.length}] ${f.path}  ${kb(f.size)} → `);
    try {
      const { before, after, webpPath } = await processOne(f);
      totalBefore += before;
      totalAfter += after;
      const updates = await updateDbUrls(f.path, webpPath);
      dbUpdated += updates;
      console.log(`${kb(after)} (-${(((before - after) / before) * 100).toFixed(0)}%)  db rows: ${updates}`);
    } catch (err) {
      failures++;
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Files processed:   ${files.length - failures}`);
  console.log(`Failures:          ${failures}`);
  console.log(`DB rows updated:   ${dbUpdated}`);
  console.log(`Bytes before:      ${kb(totalBefore)}`);
  console.log(`Bytes after:       ${kb(totalAfter)}`);
  if (totalBefore > 0) {
    console.log(`Reduction:         -${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%`);
  }
  if (!deleteSource) {
    console.log('\nOriginal JPGs kept. Re-run with --delete-source once the WebP URLs look right on the site.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
