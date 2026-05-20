import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';

export const runtime = 'nodejs';

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];

export async function GET() {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .order('page_key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data || [] });
}
