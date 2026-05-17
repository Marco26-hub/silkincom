import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const updates: Record<string, any> = {};
  if ('notes' in body) updates.notes = body.notes?.trim() || null;
  if ('expected_delivery' in body) updates.expected_delivery = body.expected_delivery || null;

  if (body.status) {
    const { data: current, error: poError } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (poError || !current) {
      return NextResponse.json({ error: poError?.message || 'Ordine non trovato' }, { status: 404 });
    }

    updates.status = body.status;

    // Receive workflow: restock inventory on first transition to 'received'
    if (body.status === 'received' && current.status !== 'received') {
      updates.received_at = new Date().toISOString();

      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('product_id, quantity')
        .eq('purchase_order_id', id);

      for (const item of items || []) {
        if (!item.product_id) continue;
        try {
          const { data: inv, error: invError } = await supabase
            .from('inventory')
            .select('quantity_total, quantity_available')
            .eq('product_id', item.product_id)
            .single();

          if (invError || !inv) continue; // no inventory row — skip gracefully

          const qtyBefore = inv.quantity_available;
          const newAvailable = inv.quantity_available + item.quantity;
          const newTotal = inv.quantity_total + item.quantity;

          await supabase
            .from('inventory')
            .update({ quantity_available: newAvailable, quantity_total: newTotal })
            .eq('product_id', item.product_id);

          await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            movement_type: 'inbound',
            quantity_change: item.quantity,
            quantity_before: qtyBefore,
            quantity_after: newAvailable,
            reason: 'Ricezione ordine fornitore',
            performed_by: auth.userId,
          });
        } catch {
          // one item failure must not abort the rest
        }
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessuna modifica' }, { status: 400 });
  }

  const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'update', 'purchase_order', id, updates);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const { id } = await params;
  const supabase = createServiceClient();

  await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id);
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.userId, 'delete', 'purchase_order', id, {});

  return NextResponse.json({ ok: true });
}
