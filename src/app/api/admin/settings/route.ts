import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';

const ADMIN_ROLES = ['admin', 'super_admin'];

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const supabase = createServiceClient();
  const { data, error } = await supabase.from('store_settings').select('key, value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  return NextResponse.json(settings);
}

const ALLOWED_KEYS = ['free_shipping_threshold', 'standard_shipping_cost', 'vat_rate', 'store_name', 'store_email', 'recesso_enabled'];

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const body = await req.json();
  const supabase = createServiceClient();

  const updates = Object.entries(body)
    .filter(([k]) => ALLOWED_KEYS.includes(k))
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nessuna chiave valida' }, { status: 400 });
  }

  const { error } = await supabase
    .from('store_settings')
    .upsert(updates, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update_settings', 'store_settings', 'global', body);

  return NextResponse.json({ ok: true });
}
