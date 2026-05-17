import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  try {
    const body = await req.json();
    const { supplier_name, po_number, expected_delivery, notes, items } = body;

    if (!supplier_name) {
      return NextResponse.json({ error: 'Nome fornitore richiesto' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Almeno una riga ordine richiesta' }, { status: 400 });
    }

    const normalized = items.map((it: any) => {
      const quantity = Number(it.quantity) || 0;
      const unit_cost = Number(it.unit_cost) || 0;
      return {
        product_id: it.product_id || null,
        product_name: String(it.product_name || '').trim(),
        quantity,
        unit_cost,
        total_cost: quantity * unit_cost,
      };
    });

    if (normalized.some((it) => !it.product_name)) {
      return NextResponse.json({ error: 'Nome prodotto richiesto per ogni riga' }, { status: 400 });
    }

    const total_cost = normalized.reduce((sum, it) => sum + it.total_cost, 0);

    const supabase = createServiceClient();
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: po_number?.trim() || null,
        supplier_name: supplier_name.trim(),
        status: 'draft',
        total_cost,
        notes: notes?.trim() || null,
        expected_delivery: expected_delivery || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (poError) {
      if (poError.code === '23505') return NextResponse.json({ error: 'Numero ordine già esistente' }, { status: 409 });
      return NextResponse.json({ error: poError.message }, { status: 500 });
    }

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(normalized.map((it) => ({ ...it, purchase_order_id: po.id })));

    if (itemsError) {
      await supabase.from('purchase_orders').delete().eq('id', po.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    await logAdminAction(auth.userId, 'create', 'purchase_order', po.id, { ...po, items: normalized });

    return NextResponse.json({ ok: true, purchase_order: po });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Errore' }, { status: 500 });
  }
}
