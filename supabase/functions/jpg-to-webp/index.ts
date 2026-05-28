// @ts-nocheck — Deno Edge runtime
// Convert every JPG in the product-images bucket to WebP. Streams in
// batches so a single invocation finishes inside the Supabase Edge timeout.
//
//   curl -X POST 'https://<project>.functions.supabase.co/jpg-to-webp?batch=20' \
//     -H "Authorization: Bearer <SUPABASE_ANON_KEY>"
//
// Query params:
//   batch  – max files to process this call (default 10)
//   delete – '1' to remove the original .jpg after WebP upload (default keep)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { decode as decodeJpeg } from 'npm:@jsquash/jpeg@1.5.0';
import { encode as encodeWebp } from 'npm:@jsquash/webp@1.4.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';
const QUALITY = 82;
const NEW_VERSION = 4;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Item = { path: string; size: number };

async function listJpgs(): Promise<Item[]> {
  const out: Item[] = [];
  const { data: roots } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
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

async function alreadyConverted(jpgPath: string): Promise<boolean> {
  const webpPath = jpgPath.replace(/\.jpe?g$/i, '.webp');
  const dir = webpPath.includes('/') ? webpPath.slice(0, webpPath.lastIndexOf('/')) : '';
  const file = webpPath.slice(webpPath.lastIndexOf('/') + 1);
  const { data } = await supabase.storage.from(BUCKET).list(dir, { search: file, limit: 1 });
  return !!data?.length;
}

async function convertOne(item: Item, removeSource: boolean) {
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(item.path);
  if (dlErr || !blob) throw new Error(`download: ${dlErr?.message ?? 'no blob'}`);
  const before = blob.size;
  const buf = new Uint8Array(await blob.arrayBuffer());

  const imageData = await decodeJpeg(buf);
  const webpBuf = await encodeWebp(imageData, { quality: QUALITY });
  const webpPath = item.path.replace(/\.jpe?g$/i, '.webp');

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(webpPath, webpBuf, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: true,
  });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  // Update DB rows pointing at the JPG path
  const { data: rows } = await supabase
    .from('product_images')
    .select('id, image_url')
    .ilike('image_url', `%${item.path}%`);
  let dbUpdated = 0;
  for (const r of rows || []) {
    const newUrl = r.image_url
      .replace(item.path, webpPath)
      .replace(/\?v=\d+/, `?v=${NEW_VERSION}`);
    const finalUrl = newUrl.includes('?v=') ? newUrl : `${newUrl}?v=${NEW_VERSION}`;
    const { error } = await supabase.from('product_images').update({ image_url: finalUrl }).eq('id', r.id);
    if (!error) dbUpdated++;
  }

  if (removeSource) await supabase.storage.from(BUCKET).remove([item.path]);

  return { path: item.path, before, after: webpBuf.byteLength, dbUpdated };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const batch = Math.min(Number(url.searchParams.get('batch') || '10'), 50);
  const removeSource = url.searchParams.get('delete') === '1';

  try {
    const all = await listJpgs();
    const queue: Item[] = [];
    for (const item of all) {
      if (queue.length >= batch) break;
      if (await alreadyConverted(item.path)) continue;
      queue.push(item);
    }

    const results = [];
    let totalBefore = 0;
    let totalAfter = 0;
    let failures = 0;
    for (const item of queue) {
      try {
        const r = await convertOne(item, removeSource);
        totalBefore += r.before;
        totalAfter += r.after;
        results.push({ ...r, ratio: r.before ? Math.round((1 - r.after / r.before) * 100) : 0 });
      } catch (err) {
        failures++;
        results.push({ path: item.path, error: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        scanned: all.length,
        processed: queue.length,
        failures,
        bytesBefore: totalBefore,
        bytesAfter: totalAfter,
        savedPercent: totalBefore ? Math.round((1 - totalAfter / totalBefore) * 100) : 0,
        results,
      }, null, 2),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
