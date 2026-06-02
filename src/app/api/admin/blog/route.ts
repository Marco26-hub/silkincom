/**
 * Admin blog CRUD — manages the `blog_posts` table (the CMS source of truth for
 * the public /trame-di-como journal). Italian lives in the base columns; the
 * other six locales in *_i18n (filled by /api/admin/blog/translate).
 *
 *   GET    /api/admin/blog            → list every post (drafts included)
 *   POST   /api/admin/blog            → create (Italian master)
 *   PATCH  /api/admin/blog            → update by { id, ...fields }
 *   DELETE /api/admin/blog?id=…       → delete
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function revalidateBlog() {
  // The public journal reads blog_posts live; nudge the ISR cache too.
  revalidatePath('/trame-di-como');
  revalidatePath('/[locale]/trame-di-como', 'page');
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, status, featured_image_url, published_at, updated_at, title_i18n, content_i18n')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Surface i18n coverage so the admin sees at a glance which posts are translated.
  const LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'nl'];
  const rows = (data ?? []).map((p) => {
    const t = (p.title_i18n ?? {}) as Record<string, string>;
    const c = (p.content_i18n ?? {}) as Record<string, string>;
    const translated = LOCALES.filter((l) => t[l] && c[l]);
    return {
      id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt,
      status: p.status, featured_image_url: p.featured_image_url,
      published_at: p.published_at, updated_at: p.updated_at,
      translatedLocales: translated,
    };
  });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Titolo richiesto' }, { status: 400 });

  const slug = (String(body.slug ?? '').trim() || slugify(title));
  const status = body.status === 'published' ? 'published' : 'draft';

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title,
      slug,
      excerpt: String(body.excerpt ?? '') || null,
      content: String(body.content ?? ''),
      featured_image_url: String(body.featured_image_url ?? '') || null,
      seo_title: String(body.seo_title ?? '') || null,
      seo_description: String(body.seo_description ?? '') || null,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateBlog();
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.slug !== undefined) update.slug = slugify(String(body.slug));
  if (body.excerpt !== undefined) update.excerpt = String(body.excerpt) || null;
  if (body.content !== undefined) update.content = String(body.content);
  if (body.featured_image_url !== undefined) update.featured_image_url = String(body.featured_image_url) || null;
  if (body.seo_title !== undefined) update.seo_title = String(body.seo_title) || null;
  if (body.seo_description !== undefined) update.seo_description = String(body.seo_description) || null;
  if (body.status !== undefined) {
    const status = body.status === 'published' ? 'published' : 'draft';
    update.status = status;
    // Stamp publish date the first time it goes live.
    if (status === 'published') update.published_at = body.published_at || new Date().toISOString();
  }
  update.updated_at = new Date().toISOString();

  const supabase = createServiceClient();
  const { error } = await supabase.from('blog_posts').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateBlog();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateBlog();
  return NextResponse.json({ ok: true });
}
