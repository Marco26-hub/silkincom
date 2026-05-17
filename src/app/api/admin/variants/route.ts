import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { product_id, color_id, material_id, variant_sku, variant_name, price_override } = body;

    if (!product_id || !variant_sku) {
      return NextResponse.json({ error: 'Prodotto e SKU richiesti' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        product_id,
        color_id: color_id || null,
        material_id: material_id || null,
        variant_sku: variant_sku.trim(),
        variant_name: variant_name?.trim() || null,
        price_override: price_override != null && price_override !== '' ? Number(price_override) : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'SKU già esistente' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create', 'product_variant', data.id, data);

    return NextResponse.json({ ok: true, variant: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
