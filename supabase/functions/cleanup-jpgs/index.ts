// @ts-nocheck — Deno Edge runtime
// One-shot helper: delete JPGs in product-images for which a sibling .webp
// already exists. Idempotent; pair with jpg-to-webp.
//
//   curl -X POST 'https://<project>.functions.supabase.co/cleanup-jpgs?batch=50'

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'product-images';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAll() {
  const out: string[] = [];
  const { data: roots } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  for (const entry of roots || []) {
    if (entry.id == null) {
      const { data: files } = await supabase.storage.from(BUCKET).list(entry.name, { limit: 1000 });
      for (const f of files || []) out.push(`${entry.name}/${f.name}`);
    } else {
      out.push(entry.name);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const batch = Math.min(Number(url.searchParams.get('batch') || '50'), 200);
  try {
    const all = await listAll();
    const webpSet = new Set(all.filter((p) => /\.webp$/i.test(p)));
    const jpgs = all.filter((p) => /\.jpe?g$/i.test(p));
    const toDelete = jpgs.filter((p) => webpSet.has(p.replace(/\.jpe?g$/i, '.webp'))).slice(0, batch);
    if (toDelete.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, remaining_jpgs: jpgs.length, message: 'nothing to delete' }), { headers: { 'Content-Type': 'application/json' } });
    }
    const { error } = await supabase.storage.from(BUCKET).remove(toDelete);
    if (error) throw error;
    return new Response(JSON.stringify({ deleted: toDelete.length, remaining_jpgs: jpgs.length - toDelete.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
