/**
 * Valid product-slug set, for the middleware 404 guard on /prodotto/<slug>.
 *
 * notFound() inside a [locale] page renders with HTTP 200 in this app
 * (next-intl + Next 15 soft-404 bug), so unknown product slugs can't be 404'd
 * from the page. The middleware enforces a real 404 instead — it needs the list
 * of valid slugs, read here with the anon key (public catalog) and cached in
 * memory. FAIL-OPEN: any read error returns null so the middleware lets the
 * request through (the page renders) rather than 404-ing valid products.
 */
import { createClient } from '@supabase/supabase-js';

let _cache: { slugs: Set<string>; at: number } | null = null;
const TTL_MS = 60_000;

export async function getValidProductSlugs(): Promise<Set<string> | null> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.slugs;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from('products').select('slug');
    if (error || !data) return null;
    const slugs = new Set<string>(
      data.map((r) => (r as { slug: string }).slug).filter(Boolean),
    );
    if (slugs.size === 0) return null; // never 404 everything on an empty read
    _cache = { slugs, at: Date.now() };
    return slugs;
  } catch {
    return null;
  }
}
