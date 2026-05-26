// @ts-nocheck — Deno Edge runtime, not Node.
// One-shot migration: downloads any product image still hosted on Wix CDN,
// re-uploads it to the project's Supabase Storage bucket, and rewrites the
// product_images.image_url row. Run repeatedly in batches via
//   curl -X POST <function-url>?batch=20
// until the function reports done=true.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Row = { id: string; product_id: string; image_url: string };

async function migrateOne(row: Row): Promise<{ ok: boolean; newUrl?: string; error?: string }> {
  try {
    const resp = await fetch(row.image_url);
    if (!resp.ok) return { ok: false, error: `fetch ${resp.status}` };
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.byteLength === 0) return { ok: false, error: 'empty body' };

    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `${row.product_id}/wix-${row.id}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (upErr) return { ok: false, error: `upload: ${upErr.message}` };

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const newUrl = pub.publicUrl;

    const { error: updErr } = await supabase
      .from('product_images')
      .update({ image_url: newUrl })
      .eq('id', row.id);
    if (updErr) return { ok: false, error: `update: ${updErr.message}` };

    return { ok: true, newUrl };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const batch = Math.min(Math.max(parseInt(url.searchParams.get('batch') || '20', 10), 1), 50);

  const { data: rows, error } = await supabase
    .from('product_images')
    .select('id, product_id, image_url')
    .like('image_url', '%wixstatic.com%')
    .order('created_at', { ascending: true })
    .limit(batch);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ id: string; ok: boolean; newUrl?: string; error?: string }> = [];
  for (const row of (rows ?? []) as Row[]) {
    const res = await migrateOne(row);
    results.push({ id: row.id, ...res });
  }

  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .like('image_url', '%wixstatic.com%');

  return new Response(
    JSON.stringify({
      ok: true,
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      remaining: count ?? 0,
      done: (count ?? 0) === 0,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
