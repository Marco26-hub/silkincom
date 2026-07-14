import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import { leadPatchSchema } from '@/lib/validations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const parsed = leadPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const updates = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('lead_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (/priority_high/i.test(error.message)) {
      return NextResponse.json(
        {
          error:
            'Priorità alta non ancora disponibile sul database live. Applica la migrazione 052_lead_priority.sql e riprova.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'update_lead', 'lead_account', id, updates);

  return NextResponse.json({ ok: true, lead: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('lead_accounts').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'delete_lead', 'lead_account', id, {});
  return NextResponse.json({ ok: true });
}
