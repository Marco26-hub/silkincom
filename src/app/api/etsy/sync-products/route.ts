import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { syncProductsToEtsy } from '@/lib/etsy/sync-products';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // PUSH guard: writing the site catalogue onto Etsy can overwrite/duplicate
  // the existing listings, so it must be an explicit, confirmed action. The
  // client sends { confirm: true } only after the user accepts the modal.
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json(
      { error: 'Conferma richiesta: questa operazione modifica i listing su Etsy.' },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceClient();
    const result = await syncProductsToEtsy(supabase);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
