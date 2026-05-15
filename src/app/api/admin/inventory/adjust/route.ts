import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'order_manager'];

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { product_id, variant_id, quantity_change, reason, movement_type, reference_order_id } = body;

  if (!product_id || typeof quantity_change !== 'number' || !reason || !movement_type) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data, error } = await service.rpc('apply_inventory_movement', {
    p_product_id: product_id,
    p_variant_id: variant_id ?? null,
    p_movement_type: movement_type,
    p_quantity_change: quantity_change,
    p_reason: reason,
    p_reference_order_id: reference_order_id ?? null,
    p_performed_by: user.id,
  });

  if (error) {
    console.error('Inventory adjust error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, movement_id: data });
}
