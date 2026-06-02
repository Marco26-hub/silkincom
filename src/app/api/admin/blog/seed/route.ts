/**
 * POST /api/admin/blog/seed  (admin)
 *
 * One-shot migration of the pre-CMS posts bundled in src/data/blog.json into
 * the blog_posts table, preserving all 7 languages (Italian → base columns,
 * the rest → *_i18n). Idempotent: upserts on slug, so re-running refreshes the
 * legacy posts without creating duplicates. After this the DB is the source of
 * truth and blog.json is only the offline fallback.
 */
import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import postsJson from '@/data/blog.json';

export const runtime = 'nodejs';

type L10n = Record<string, string>;
type RawPost = { slug: string; title: L10n; description: L10n; image: string; date: string; body: L10n };

const OTHER_LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'nl'];

function i18nOf(field: L10n): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of OTHER_LOCALES) if (field?.[l]) out[l] = field[l];
  return out;
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const };
}

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const posts = postsJson as RawPost[];
  const supabase = createServiceClient();

  const rows = posts.map((p) => ({
    slug: p.slug,
    title: p.title.it ?? '',
    title_i18n: i18nOf(p.title),
    excerpt: p.description.it ?? null,
    excerpt_i18n: i18nOf(p.description),
    content: p.body.it ?? '',
    content_i18n: i18nOf(p.body),
    featured_image_url: p.image || null,
    published_at: p.date || null,
    status: 'published',
  }));

  const { error } = await supabase.from('blog_posts').upsert(rows, { onConflict: 'slug' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/trame-di-como');
  return NextResponse.json({ ok: true, seeded: rows.length, slugs: rows.map((r) => r.slug) });
}
