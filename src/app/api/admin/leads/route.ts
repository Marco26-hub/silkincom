import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import { leadCreateSchema } from '@/lib/validations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('lead_accounts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const body = await req.json();
  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const input = parsed.data;
  const { data, error } = await supabase
    .from('lead_accounts')
    .upsert(
      {
        company_name: input.company_name,
        website_url: input.website_url,
        industry: input.industry || 'hospitality',
        city: input.city || null,
        country: input.country || 'IT',
        contact_name: input.contact_name || null,
        contact_role: input.contact_role || null,
        contact_email: input.contact_email || null,
        contact_phone: input.contact_phone || null,
        source_url: input.source_url || input.website_url,
        public_contact_page: input.public_contact_page || null,
        notes: input.notes || '',
        status: 'new',
        score: input.contact_email ? 60 : 25,
        last_scanned_at: new Date().toISOString(),
      },
      { onConflict: 'website_url' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead: data });
}
