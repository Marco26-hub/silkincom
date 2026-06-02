/**
 * POST /api/admin/content-plan/generate  (admin)
 *
 * Generates an AI editorial calendar (senior SMM strategy) and inserts the
 * posts into `content_plan`. Internal write only (no publishing), so no confirm
 * gate. Body: { startDate: 'YYYY-MM-DD', days: number, channels: string[], goal?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateContentPlan, PLAN_CHANNELS } from '@/lib/content/generate-plan';

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

function addDays(iso: string, n: number): string {
  const base = new Date(iso + 'T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + n);
  return base.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = await req.json().catch(() => ({})) as {
    startDate?: string; days?: number; channels?: string[]; goal?: string;
  };

  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(body.startDate ?? '')
    ? body.startDate! : new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(Number(body.days) || 7, 1), 31);
  const channels = (Array.isArray(body.channels) ? body.channels : [])
    .filter((c) => (PLAN_CHANNELS as readonly string[]).includes(c));
  if (channels.length === 0) {
    return NextResponse.json({ error: 'Seleziona almeno un canale' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Ground the AI on the real catalogue (published products).
  const { data: products } = await supabase
    .from('products')
    .select('slug, name, product_type')
    .eq('status', 'published')
    .limit(60);
  const validSlugs = new Set((products ?? []).map((p) => p.slug));
  const productBrief = (products ?? [])
    .map((p) => `- ${p.name}${p.product_type ? ` (${p.product_type})` : ''} [${p.slug}]`)
    .join('\n');

  let items;
  try {
    items = await generateContentPlan({ days, channels, goal: body.goal, productBrief });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const rows = items
    .filter((it) => channels.includes(it.channel))
    .map((it) => {
      const parts: string[] = [];
      if (it.pillar) parts.push(`[${it.pillar}]`);
      if (it.hook) parts.push(`HOOK · ${it.hook}`);
      if (it.caption) parts.push(it.caption);
      if (it.hashtags?.length) parts.push(it.hashtags.join(' '));
      if (it.cta) parts.push(`CTA · ${it.cta}`);
      return {
        scheduled_date: addDays(startDate, Math.min(it.day, days - 1)),
        channel: it.channel,
        action_type: it.action_type,
        title: it.title,
        notes: parts.join('\n\n') || null,
        product_slug: it.product_slug && validSlugs.has(it.product_slug) ? it.product_slug : null,
        status: 'planned',
      };
    });

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nessun contenuto generato, riprova' }, { status: 502 });
  }

  const { error } = await supabase.from('content_plan').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: rows.length });
}
