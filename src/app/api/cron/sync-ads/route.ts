import { cronAuthorized } from '@/lib/security/guards';
/**
 * Daily cron: refresh Google Ads campaigns + metrics. Triggered by Vercel
 * Cron at 03:30 Europe/Rome (just after the financial sync). Authenticated
 * via CRON_SECRET Bearer authorization.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { syncGoogleAds } from '@/lib/ads/sync-google-ads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;


export async function GET(req: NextRequest) {
  if (!cronAuthorized(req.headers)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServiceClient();
  try {
    const res = await syncGoogleAds(supabase);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const POST = GET;
