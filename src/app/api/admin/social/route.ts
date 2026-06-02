/**
 * GET /api/admin/social
 *
 * Admin-only. Pulls the social PUBLISHING activity from Blotato (connected
 * accounts + scheduled / published / failed posts) for the admin dashboard.
 * Read-only. Degrades to { configured: false } when BLOTATO_API_KEY is unset,
 * so the page can show setup instructions instead of an error.
 *
 * NOTE: Blotato does not expose engagement metrics (followers, reach, likes),
 * so this returns publishing state only — not analytics.
 */
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  isBlotatoConfigured,
  listBlotatoAccounts,
  listBlotatoPosts,
  type BlotatoPost,
} from '@/lib/blotato/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  if (!isBlotatoConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const [accounts, posts] = await Promise.all([
      listBlotatoAccounts(),
      listBlotatoPosts({ limit: 250, maxPages: 3 }),
    ]);

    const bucket = (t: BlotatoPost['state']['type']) =>
      posts.filter((p) => p.state?.type === t);

    const scheduled = bucket('scheduled').sort((a, b) => a.postTime.localeCompare(b.postTime));
    const published = bucket('published').sort((a, b) => b.postTime.localeCompare(a.postTime));
    const failed = bucket('failed').sort((a, b) => b.postTime.localeCompare(a.postTime));

    // Per-platform tallies for the at-a-glance grid.
    const byPlatform: Record<string, { scheduled: number; published: number; failed: number }> = {};
    for (const p of posts) {
      const k = p.platform;
      byPlatform[k] ??= { scheduled: 0, published: 0, failed: 0 };
      const t = p.state?.type;
      if (t === 'scheduled' || t === 'published' || t === 'failed') byPlatform[k][t]++;
    }

    return NextResponse.json({
      configured: true,
      accounts,
      counts: {
        scheduled: scheduled.length,
        published: published.length,
        failed: failed.length,
        byPlatform,
      },
      scheduled,
      published,
      failed,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: (e as Error).message }, { status: 502 });
  }
}
