/**
 * POST /api/admin/blog/translate  (admin)
 *
 * AI-translates one blog post's Italian master into one target locale and
 * merges the result into the post's *_i18n jsonb columns. One locale per call
 * (body.lang) — the client loops over the six locales so no request risks the
 * serverless timeout on long articles.
 *
 * Body: { id: string, lang: 'en'|'es'|'fr'|'de'|'pt'|'nl' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { translateBlog, BLOG_LANGS } from '@/lib/blog/translate';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as { id?: string; lang?: string };
  const lang = (body.lang || '').toLowerCase();
  if (!body.id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });
  if (!BLOG_LANGS[lang]) return NextResponse.json({ error: `Lingua non supportata: ${lang}` }, { status: 400 });

  const supabase = createServiceClient();
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, content, seo_title, seo_description, title_i18n, excerpt_i18n, content_i18n, seo_title_i18n, seo_description_i18n')
    .eq('id', body.id)
    .single();
  if (!post) return NextResponse.json({ error: 'Post non trovato' }, { status: 404 });

  try {
    const tr = await translateBlog(
      {
        title: post.title ?? '',
        excerpt: post.excerpt ?? '',
        content: post.content ?? '',
        seo_title: post.seo_title ?? '',
        seo_description: post.seo_description ?? '',
      },
      lang,
    );

    const merge = (col: Record<string, string> | null, value: string) => ({ ...(col ?? {}), [lang]: value });

    const { error } = await supabase
      .from('blog_posts')
      .update({
        title_i18n: merge(post.title_i18n as Record<string, string> | null, tr.title),
        excerpt_i18n: merge(post.excerpt_i18n as Record<string, string> | null, tr.excerpt),
        content_i18n: merge(post.content_i18n as Record<string, string> | null, tr.content),
        seo_title_i18n: merge(post.seo_title_i18n as Record<string, string> | null, tr.seo_title),
        seo_description_i18n: merge(post.seo_description_i18n as Record<string, string> | null, tr.seo_description),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id);
    if (error) throw new Error(error.message);

    revalidatePath('/trame-di-como');
    return NextResponse.json({ ok: true, lang, title: tr.title });
  } catch (e) {
    return NextResponse.json({ ok: false, lang, error: (e as Error).message }, { status: 502 });
  }
}
