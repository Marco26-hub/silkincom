import { NextRequest, NextResponse } from 'next/server';
import { generateBlogDraft, generateSocialPosts } from '@/lib/automation/content-engine';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAutomationKey } from '@/lib/automation/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = requireAutomationKey(req);
  if (authError) return authError;

  const warnings: string[] = [];
  const results: Record<string, unknown> = {};

  try {
    const socialPosts = await generateSocialPosts({
      campaign: 'Drop settimanale SILKinCOM',
      platforms: ['instagram', 'facebook', 'pinterest'],
      notes: 'Tono editoriale premium, Made in Como, focus su materie prime.',
      publishWindowHours: 72,
    });
    results.socialDrafts = socialPosts.length;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();
      const socialRows = socialPosts.map((post) => ({
        platform: post.platform,
        caption: post.caption,
        hashtags: post.hashtags,
        cta: post.cta,
        media_prompt: post.mediaPrompt,
        scheduled_for: post.scheduledFor,
        status: 'draft',
        payload: post,
      }));
      const { error } = await supabase.from('social_posts_queue').insert(socialRows);
      if (error) warnings.push(`Social queue write skipped: ${error.message}`);
    }

    const blogDraft = await generateBlogDraft({
      topic: 'Come scegliere tra seta e cashmere per ogni stagione',
      keywords: ['seta di como', 'cashmere premium', 'made in como'],
      categorySlug: 'materiali',
      minWords: 900,
    });
    results.blogTitle = blogDraft.title;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();
      const { data: category } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', 'materiali')
        .maybeSingle();

      const { error } = await supabase.from('blog_posts').insert({
        title: blogDraft.title,
        slug: blogDraft.slug,
        excerpt: blogDraft.excerpt,
        content: blogDraft.content,
        category_id: category?.id || null,
        status: 'draft',
        seo_title: blogDraft.seoTitle,
        seo_description: blogDraft.seoDescription,
      });
      if (error) warnings.push(`Blog draft write skipped: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      message: 'Automation run completed',
      results,
      warnings,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message, warnings }, { status: 500 });
  }
}
