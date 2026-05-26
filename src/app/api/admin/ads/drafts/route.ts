/**
 * CRUD endpoints for ad_drafts. Drafts are admin-authored campaign blueprints
 * (headlines, descriptions, keywords, budget, target ROAS) — what the AI
 * generator fills out and what the admin can edit. They're separate from
 * `ad_campaigns` (synced from Google) because they exist before anything is
 * pushed to the platform.
 *
 *   GET                       — list drafts
 *   POST   body:{name,...}    — create a draft
 *   PATCH  body:{id, ...}     — partial update
 *   DELETE body:{id}          — remove a draft
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ad_drafts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = await req.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ad_drafts')
    .insert({
      source: body.source ?? 'google_ads',
      name: body.name ?? 'Bozza senza titolo',
      channel_type: body.channel_type ?? 'SEARCH',
      daily_budget: body.daily_budget ?? null,
      target_roas: body.target_roas ?? null,
      target_cpa: body.target_cpa ?? null,
      bidding_strategy: body.bidding_strategy ?? 'MAXIMIZE_CONVERSION_VALUE',
      final_url: body.final_url ?? null,
      headlines: body.headlines ?? [],
      descriptions: body.descriptions ?? [],
      keywords: body.keywords ?? [],
      audience_notes: body.audience_notes ?? null,
      product_slugs: body.product_slugs ?? [],
      created_by: auth.userId,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });
  const allowed = [
    'name', 'channel_type', 'daily_budget', 'target_roas', 'target_cpa',
    'bidding_strategy', 'final_url', 'headlines', 'descriptions', 'keywords',
    'audience_notes', 'product_slugs', 'status',
  ] as const;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (k in body) patch[k] = body[k];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ad_drafts')
    .update(patch)
    .eq('id', body.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from('ad_drafts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
