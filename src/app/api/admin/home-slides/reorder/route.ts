import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { revalidateHomeSlides } from '@/lib/revalidate';
import { logAdminAction } from '@/lib/audit';

export const runtime = 'nodejs';

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

type ReorderItem = { id: string; display_order: number };

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const body = (await req.json()) as { items?: ReorderItem[] };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: 'items vuoto' }, { status: 400 });

  const supabase = createServiceClient();

  for (const it of items) {
    if (!it.id || typeof it.display_order !== 'number') continue;
    await supabase.from('home_slides').update({ display_order: it.display_order }).eq('id', it.id);
  }

  await logAdminAction(auth.userId, 'reorder_home_slides', 'home_slide', 'batch', { count: items.length });
  revalidateHomeSlides();

  return NextResponse.json({ ok: true });
}
