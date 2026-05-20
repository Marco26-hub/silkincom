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
    .from('collections')
    .select(`id, slug, name, description, image_url, storage_path, display_order, is_active,
             name_i18n, tagline_i18n, short_name_i18n, accent_i18n, description_i18n`)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: data || [] });
}
