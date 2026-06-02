/**
 * Etsy connection status for /admin/etsy. The page can't read the
 * `integrations` row directly from the browser (RLS hides the OAuth tokens,
 * correctly), so it would always show "Non connesso" even right after a
 * successful connect. This endpoint reports the state server-side via the
 * service client WITHOUT ever returning the tokens.
 */
import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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

  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from('integrations')
    .select('connected_at, expires_at, metadata')
    .eq('provider', 'etsy')
    .maybeSingle();

  const { count: mappingCount } = await supabase
    .from('etsy_product_map')
    .select('id', { count: 'exact', head: true });

  const { data: logs } = await supabase
    .from('etsy_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    connected: !!integration,
    connectedAt: integration?.connected_at ?? null,
    shopId: (integration?.metadata as { shop_id?: string } | null)?.shop_id ?? null,
    mappingCount: mappingCount ?? 0,
    logs: logs ?? [],
  });
}
