/**
 * /api/admin/content-plan — CRUD for the editorial/content calendar. Admin only.
 *   GET                      → all rows, soonest first
 *   POST   { ...fields }     → create
 *   PATCH  { id, ...fields } → update (status toggle, edits)
 *   DELETE ?id=              → remove
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

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

const FIELDS = ['scheduled_date', 'channel', 'action_type', 'title', 'notes', 'product_slug', 'status'] as const;

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of FIELDS) if (k in body && body[k] !== undefined) out[k] = body[k];
  return out;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('content_plan')
    .select('*')
    .order('scheduled_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const row = pick(body);
  if (!row.scheduled_date || !row.channel || !row.action_type || !row.title) {
    return NextResponse.json({ error: 'Data, canale, azione e titolo richiesti' }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('content_plan').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const body = await req.json().catch(() => ({})) as { id?: string };
  if (!body.id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('content_plan')
    .update({ ...pick(body as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from('content_plan').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
