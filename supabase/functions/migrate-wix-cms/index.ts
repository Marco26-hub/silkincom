// @ts-nocheck — Deno Edge runtime.
// One-shot migration of every Wix-hosted CMS image (home_sections.images
// JSONB, materials.image_url) to the Supabase Storage bucket `cms-images`.
// Mirrors `migrate-wix-images` (product images) for the CMS surfaces that
// the admin gallery still references. Idempotent: re-running on a clean
// state returns done=true with no rows processed.
//
// The PostgREST .filter('images', 'like', ...) call doesn't support a LIKE
// against JSONB columns, so home_sections rows are fetched whole and the
// filter is done client-side over the JSON string.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'cms-images';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: any) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

async function uploadAndPublic(folder: string, originalUrl: string, marker: string) {
  const resp = await fetch(originalUrl);
  if (!resp.ok) throw new Error(`fetch ${resp.status}`);
  const ct = resp.headers.get('content-type') || 'image/jpeg';
  const ext = ct.includes('png') ? 'png' : 'jpg';
  const bytes = new Uint8Array(await resp.arrayBuffer());
  const path = `${folder}/${marker}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: ct,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: pub.publicUrl, path };
}

async function migrateHomeSections() {
  const out: any[] = [];
  const { data: rows } = await supabase.from('home_sections').select('section_key, images');
  for (const row of rows || []) {
    const images = (row.images as any[]) || [];
    if (!JSON.stringify(images).includes('wixstatic.com')) continue;
    const next: any[] = [];
    let touched = false;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img?.url?.includes('wixstatic.com')) {
        next.push(img);
        continue;
      }
      try {
        const marker = `${row.section_key}-${i}-${Date.now()}`;
        const { url, path } = await uploadAndPublic('home-sections', img.url, marker);
        next.push({ ...img, url, storage_path: path });
        touched = true;
        out.push({ section_key: row.section_key, idx: i, ok: true });
      } catch (e) {
        next.push(img); // keep original on failure so we can retry
        out.push({ section_key: row.section_key, idx: i, ok: false, error: String((e as any).message ?? e) });
      }
    }
    if (touched) {
      await supabase.from('home_sections').update({ images: next }).eq('section_key', row.section_key);
    }
  }
  return out;
}

async function migrateMaterials() {
  const out: any[] = [];
  const { data: rows } = await supabase
    .from('materials')
    .select('slug, image_url')
    .like('image_url', '%wixstatic.com%');
  for (const row of rows || []) {
    try {
      const marker = `${row.slug}-${Date.now()}`;
      const { url, path } = await uploadAndPublic('materials', row.image_url, marker);
      await supabase.from('materials').update({ image_url: url }).eq('slug', row.slug);
      out.push({ slug: row.slug, ok: true, new_url: url, storage_path: path });
    } catch (e) {
      out.push({ slug: row.slug, ok: false, error: String((e as any).message ?? e) });
    }
  }
  return out;
}

Deno.serve(async () => {
  try { await ensureBucket(); } catch (e) { console.warn('bucket setup:', (e as any).message); }
  const hs = await migrateHomeSections();
  const mt = await migrateMaterials();

  const { data: hsAll } = await supabase.from('home_sections').select('section_key, images');
  const hsLeft = (hsAll || []).filter((r: any) => JSON.stringify(r.images || []).includes('wixstatic.com')).length;
  const { count: mtLeft } = await supabase
    .from('materials')
    .select('slug', { count: 'exact', head: true })
    .like('image_url', '%wixstatic.com%');

  return new Response(
    JSON.stringify({
      ok: true,
      home_sections: hs,
      materials: mt,
      remaining: { home_sections: hsLeft, materials: mtLeft ?? 0 },
      done: hsLeft + (mtLeft ?? 0) === 0,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
