import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

async function checkAdmin(requiredRoles = ['admin', 'super_admin']) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !requiredRoles.includes(profile.role)) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { code, discount_type, discount_value, valid_from, valid_until, max_uses, max_uses_per_customer, minimum_order_amount, is_active } = body;

    if (!code || !discount_type || discount_value == null) {
      return NextResponse.json({ error: 'Codice, tipo e valore richiesti' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: code.toUpperCase().trim(),
        discount_type,
        discount_value: Number(discount_value),
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        max_uses: max_uses ? Number(max_uses) : null,
        max_uses_per_customer: max_uses_per_customer ? Number(max_uses_per_customer) : null,
        minimum_order_amount: minimum_order_amount ? Number(minimum_order_amount) : null,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Codice già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, coupon: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
