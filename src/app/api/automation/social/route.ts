import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { generateSocialPosts, socialAutomationInputSchema } from '@/lib/automation/content-engine';
import { requireAutomationKey } from '@/lib/automation/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = socialAutomationInputSchema.extend({
  persist: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const authError = requireAutomationKey(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const input = requestSchema.parse(body);

    const posts = await generateSocialPosts(input);

    const warnings: string[] = [];
    let queued = 0;

    if (input.persist && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createServiceClient();
      const payload = posts.map((post) => ({
        platform: post.platform,
        caption: post.caption,
        hashtags: post.hashtags,
        cta: post.cta,
        media_prompt: post.mediaPrompt,
        scheduled_for: post.scheduledFor,
        status: 'draft',
        payload: post,
      }));

      const { error } = await supabase.from('social_posts_queue').insert(payload);
      if (error) {
        warnings.push(`Queue DB insert skipped: ${error.message}`);
      } else {
        queued = payload.length;
      }
    }

    return NextResponse.json({
      ok: true,
      queued,
      posts,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
