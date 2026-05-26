// @ts-nocheck — Deno Edge runtime, not Node. tsconfig excludes this folder
// but we keep the pragma as belt-and-braces so Next.js's bundled
// type-check step never has a reason to touch these jsr:/npm: imports.
// Re-compress every product image whose storage object exceeds `minKB`.
// Uses two SQL RPCs (compress_candidates, compress_remaining) defined in
// migration 036 so we don't have to reach into the `storage` schema from
// the JS client.
//
//   curl -X POST <fn-url>?batch=6&minKB=100

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { decode as decodeJpeg, encode as encodeJpeg } from 'npm:@jsquash/jpeg@1.5.0';
import { decode as decodePng } from 'npm:@jsquash/png@3.0.1';
import resize from 'npm:@jsquash/resize@2.1.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';
const MAX_DIM = 1600;
const QUALITY = 78;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Candidate = { object_name: string; size_bytes: number; image_id: string | null; image_url: string | null };

async function compressOne(c: Candidate): Promise<{ ok: boolean; before?: number; after?: number; ratio?: string; error?: string }> {
  try {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(c.object_name);
    if (dlErr || !blob) return { ok: false, error: `download: ${dlErr?.message ?? 'no blob'}` };
    const before = blob.size;

    const buf = new Uint8Array(await blob.arrayBuffer());
    const isPng = c.object_name.toLowerCase().endsWith('.png') || buf[0] === 0x89;
    let imageData;
    try {
      imageData = isPng ? await decodePng(buf) : await decodeJpeg(buf);
    } catch (e) {
      return { ok: false, error: `decode: ${(e as Error).message}` };
    }

    const { width, height } = imageData;
    const longest = Math.max(width, height);
    const scale = longest > MAX_DIM ? MAX_DIM / longest : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));
    const resized = scale < 1 ? await resize(imageData, { width: targetW, height: targetH }) : imageData;
    const jpgBuf = await encodeJpeg(resized, { quality: QUALITY });
    const after = jpgBuf.byteLength;

    if (after >= before * 0.95) {
      // Marginal saving — leave the file alone and let the caller bump the
      // minKB threshold to take this row out of the candidate pool.
      return { ok: true, before, after, ratio: '0%' };
    }

    const targetPath = isPng ? c.object_name.replace(/\.png$/i, '.jpg') : c.object_name;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(targetPath, jpgBuf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (upErr) return { ok: false, error: `upload: ${upErr.message}` };

    if (targetPath !== c.object_name) {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(targetPath);
      if (c.image_id) await supabase.from('product_images').update({ image_url: pub.publicUrl }).eq('id', c.image_id);
      await supabase.storage.from(BUCKET).remove([c.object_name]);
    }

    return { ok: true, before, after, ratio: `${Math.round((1 - after / before) * 100)}%` };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const batch = Math.min(Math.max(parseInt(url.searchParams.get('batch') || '6', 10), 1), 20);
  const minKB = parseInt(url.searchParams.get('minKB') || '100', 10);
  const minBytes = minKB * 1024;

  const { data: candidates, error: candErr } = await supabase.rpc('compress_candidates', {
    min_bytes: minBytes,
    lim: batch,
  });
  if (candErr) {
    return new Response(JSON.stringify({ ok: false, error: candErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ name: string; ok: boolean; before?: number; after?: number; ratio?: string; error?: string }> = [];
  let totalBefore = 0;
  let totalAfter = 0;
  for (const c of (candidates ?? []) as Candidate[]) {
    const r = await compressOne(c);
    results.push({ name: c.object_name, ...r });
    if (r.before) totalBefore += r.before;
    if (r.after) totalAfter += r.after;
  }

  const { data: remaining } = await supabase.rpc('compress_remaining', { min_bytes: minBytes });

  return new Response(
    JSON.stringify({
      ok: true,
      processed: results.length,
      bytesSaved: totalBefore - totalAfter,
      kbSaved: Math.round((totalBefore - totalAfter) / 1024),
      remaining: remaining ?? 0,
      done: (remaining ?? 0) === 0 || results.length === 0,
      results: results.slice(0, 5),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
