/**
 * POST /api/admin/blog/generate  (admin)
 *
 * Generates an Italian blog draft with the shared content-engine and stores it
 * in blog_posts as status='draft'. The admin then reviews, edits, translates
 * (AI) and publishes from /admin/blog.
 *
 * Body: { topic: string, keywords?: string[], featuredImageUrl?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateBlogDraft } from '@/lib/automation/content-engine';

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

  const body = (await req.json().catch(() => ({}))) as {
    topic?: string; keywords?: string[]; featuredImageUrl?: string;
  };
  const topic = String(body.topic ?? '').trim();
  if (topic.length < 5) return NextResponse.json({ error: 'Argomento troppo corto (min 5 caratteri)' }, { status: 400 });

  try {
    const draft = await generateBlogDraft({
      topic,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      ...(body.featuredImageUrl ? { featuredImageUrl: body.featuredImageUrl } : {}),
    });

    const supabase = createServiceClient();
    // Avoid slug collisions with an existing post.
    let slug = draft.slug;
    const { data: clash } = await supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: draft.title,
        slug,
        excerpt: draft.excerpt,
        content: draft.content,
        seo_title: draft.seoTitle,
        seo_description: draft.seoDescription,
        featured_image_url: body.featuredImageUrl || null,
        status: 'draft',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, id: data.id, title: draft.title });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
