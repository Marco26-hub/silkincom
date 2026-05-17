import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';

function parseCountries(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const allowed = ['name', 'countries', 'base_cost', 'free_shipping_threshold', 'estimated_days'];
  const updates: Record<string, any> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if ('name' in updates) updates.name = String(updates.name).trim();
  if ('countries' in updates) updates.countries = parseCountries(updates.countries);
  if ('base_cost' in updates) updates.base_cost = Number(updates.base_cost);
  if ('free_shipping_threshold' in updates) updates.free_shipping_threshold = updates.free_shipping_threshold ? Number(updates.free_shipping_threshold) : null;
  if ('estimated_days' in updates) updates.estimated_days = updates.estimated_days ? Number(updates.estimated_days) : null;

  const supabase = createServiceClient();
  const { error } = await supabase.from('shipment_zones').update(updates).eq('id', id);
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Nome zona già esistente' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, 'update_shipment_zone', 'shipment_zone', id, updates);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from('shipment_zones').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete_shipment_zone', 'shipment_zone', id, {});

  return NextResponse.json({ ok: true });
}
