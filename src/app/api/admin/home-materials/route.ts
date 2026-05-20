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
    .from('materials')
    .select(`id, slug, code, href, image_url, storage_path, display_order, is_active,
             name_i18n, description_i18n,
             origin_title_i18n, origin_body_i18n,
             characteristics_title_i18n, characteristics_body_i18n,
             benefit_title_i18n, benefit_body_i18n`)
    .not('slug', 'is', null)
    .order('display_order', { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ materials: data || [] });
}
