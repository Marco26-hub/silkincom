import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const allowed = ['product_id', 'color_id', 'material_id', 'variant_sku', 'variant_name', 'price_override'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if ('variant_sku' in updates) updates.variant_sku = String(updates.variant_sku).trim();
  if ('variant_name' in updates) updates.variant_name = updates.variant_name?.trim() || null;
  if ('color_id' in updates) updates.color_id = updates.color_id || null;
  if ('material_id' in updates) updates.material_id = updates.material_id || null;
  if ('price_override' in updates) {
    updates.price_override =
      updates.price_override != null && updates.price_override !== '' ? Number(updates.price_override) : null;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('product_variants').update(updates).eq('id', id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'SKU già esistente' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'update', 'product_variant', id, updates);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete', 'product_variant', id, {});

  return NextResponse.json({ ok: true });
}
