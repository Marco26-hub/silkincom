import { NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** GET — shipping dashboard data: Packlink shipments, orders awaiting a
 *  shipment, and low-stock reorder alerts. Service client = no RLS filtering. */
export async function GET() {
  const auth = await requireAdminApi(['admin', 'super_admin', 'order_manager']);
  if (!auth.ok) return forbidden(auth.status);

  const supabase = createServiceClient();

  const { data: shipments } = await supabase
    .from('shipments')
    .select(
      'id, order_id, carrier, service_name, packlink_reference, tracking_number, status, price, label_url, created_at, orders(order_number, customer_email)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: paidOrders } = await supabase
    .from('orders')
    .select('id, order_number, customer_email, total_amount, created_at')
    .in('status', ['paid', 'processing'])
    .order('created_at', { ascending: false })
    .limit(100);

  const shippedOrderIds = new Set((shipments ?? []).map((s) => s.order_id));
  const toShip = (paidOrders ?? []).filter((o) => !shippedOrderIds.has(o.id));

  const { data: reorder } = await supabase.from('reorder_alerts').select('*').limit(50);

  return NextResponse.json({
    shipments: shipments ?? [],
    toShip,
    reorder: reorder ?? [],
  });
}
