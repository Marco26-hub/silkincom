import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { blogAutomationInputSchema, generateBlogDraft } from '@/lib/automation/content-engine';
import { requireAutomationKey } from '@/lib/automation/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = blogAutomationInputSchema.extend({
  persist: z.boolean().default(true),
  publish: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const authError = requireAutomationKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const input = requestSchema.parse(body);
    const draft = await generateBlogDraft(input);

    let postId: string | null = null;
    const warnings: string[] = [];

    if (input.persist && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();

      let categoryId: string | null = null;
      const { data: category } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', input.categorySlug)
        .maybeSingle();

      if (category?.id) {
        categoryId = category.id;
      } else {
        warnings.push(`Category "${input.categorySlug}" not found. Post created without category.`);
      }

      const status = input.publish ? 'published' : 'draft';
      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          content: draft.content,
          featured_image_url: input.featuredImageUrl || null,
          category_id: categoryId,
          status,
          published_at: input.publish ? new Date().toISOString() : null,
          seo_title: draft.seoTitle,
          seo_description: draft.seoDescription,
        })
        .select('id')
        .single();

      if (error) {
        warnings.push(`Blog DB insert skipped: ${error.message}`);
      } else {
        postId = data.id;
      }
    }

    return NextResponse.json({
      ok: true,
      postId,
      draft,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
