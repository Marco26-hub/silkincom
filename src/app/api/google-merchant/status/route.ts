/**
 * GET /api/google-merchant/status  (admin)
 *
 * Connection state + mirror counts. "configured" = env present; "connected" =
 * a live Service Account ping to the Merchant Center account succeeds.
 */
import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { isMerchantConfigured, getMerchantAccount, merchantConfig } from '@/lib/google-merchant/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  const configured = isMerchantConfigured();
  let connected = false;
  let accountName: string | null = null;
  let websiteUrl: string | null = null;
  let connectionError: string | null = null;

  if (configured) {
    try {
      const acc = await getMerchantAccount();
      connected = true;
      accountName = acc.name ?? null;
      websiteUrl = acc.websiteUrl ?? null;
    } catch (e) {
      connectionError = (e as Error).message;
    }
  }

  const supabase = createServiceClient();
  const { data: rows } = await supabase.from('google_merchant_products').select('destination_status');
  const counts = { total: rows?.length ?? 0, approved: 0, pending: 0, disapproved: 0 };
  for (const r of rows ?? []) {
    const s = (r.destination_status || '').toLowerCase();
    if (s === 'approved') counts.approved++;
    else if (s === 'disapproved') counts.disapproved++;
    else counts.pending++;
  }

  return NextResponse.json({
    configured,
    connected,
    merchantId: merchantConfig().merchantId || null,
    accountName,
    websiteUrl,
    connectionError,
    counts,
  });
}
