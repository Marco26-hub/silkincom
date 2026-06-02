import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { syncOrdersFromEtsy } from '@/lib/etsy/sync-orders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * LEGACY / dangerous: this writes Etsy orders into the SITE `orders` table
 * and decrements SITE inventory. With Etsy now a separate read-only mirror
 * (see /api/etsy/pull → etsy_orders), this path is no longer used by the UI.
 * Kept only behind an explicit { confirm: true } guard so it can never run by
 * accident and contaminate the site catalogue.
 */
export async function POST(req: NextRequest) {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'Operazione legacy: scrive ordini Etsy nel sito e scala lo stock. Usa invece «Scarica da Etsy» (mirror read-only). Richiede confirm:true.' },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceClient();
    const result = await syncOrdersFromEtsy(supabase);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
