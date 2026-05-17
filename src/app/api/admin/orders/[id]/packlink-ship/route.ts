import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { createServiceClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/audit';
import {
  PACKLINK_SENDER,
  getPacklinkServices,
  createPacklinkShipment,
  getPacklinkShipment,
  getPacklinkLabels,
  splitName,
} from '@/lib/packlink';

export const runtime = 'nodejs';

const SHIP_ROLES = ['admin', 'super_admin', 'order_manager'];

// Default parcel for silk accessories when the order carries no explicit weight.
const DEFAULT_WEIGHT_KG = 0.5;
const DEFAULT_BOX = { length: 35, width: 25, height: 5 };

/** GET — return the current shipment row for the order (DB only, no Packlink call). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(SHIP_ROLES);
  if (!auth.ok) return forbidden(auth.status);
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: shipment } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ shipment: shipment ?? null });
}

/** POST { action: 'create' | 'sync' } — create the Packlink shipment or refresh its status. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(SHIP_ROLES);
  if (!auth.ok) return forbidden(auth.status);
  const { id } = await params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = body.action === 'sync' ? 'sync' : 'create';
  const supabase = createServiceClient();

  try {
    return action === 'sync'
      ? await syncShipment(supabase, id, auth.userId)
      : await createShipment(supabase, id, auth.userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore Packlink';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

async function createShipment(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  userId: string,
) {
  const { data: existing } = await supabase
    .from('shipments')
    .select('id, packlink_reference')
    .eq('order_id', orderId)
    .not('packlink_reference', 'is', null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Spedizione Packlink già creata (rif. ${existing.packlink_reference})` },
      { status: 409 },
    );
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, customer_email, subtotal, total_amount, weight_grams, shipping_address, order_items(product_name, quantity)')
    .eq('id', orderId)
    .single();
  if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });

  const addr = order.shipping_address as Record<string, string> | null;
  if (!addr || !addr.country || !addr.postal_code || !addr.street_address) {
    return NextResponse.json(
      { error: "Indirizzo di spedizione incompleto sull'ordine" },
      { status: 400 },
    );
  }

  const weightKg =
    order.weight_grams && order.weight_grams > 0 ? order.weight_grams / 1000 : DEFAULT_WEIGHT_KG;
  const pkg = { weight: weightKg, ...DEFAULT_BOX };

  // 1. Available carriers (cheapest first)
  const services = await getPacklinkServices({
    from: { country: PACKLINK_SENDER.country, zip: PACKLINK_SENDER.zip_code },
    to: { country: String(addr.country).toUpperCase(), zip: String(addr.postal_code) },
    pkg,
  });
  if (services.length === 0) {
    return NextResponse.json(
      { error: 'Nessun corriere Packlink disponibile per questa destinazione' },
      { status: 422 },
    );
  }
  const svc = services[0];

  // 2. Build + create the shipment
  const { name, surname } = splitName(addr.full_name || order.customer_email);
  const content =
    (order.order_items ?? [])
      .map((it: { product_name: string; quantity: number }) => `${it.quantity}× ${it.product_name}`)
      .join(', ')
      .slice(0, 200) || 'Accessori in seta';

  const shipmentBody = {
    service: svc.name,
    carrier: svc.carrier_name,
    service_id: svc.id,
    content,
    content_second_hand: false,
    contentvalue: Number(order.subtotal) || Number(order.total_amount) || 1,
    contentValue_currency: 'EUR',
    insurance: { insurance_selected: false },
    priority: false,
    from: { ...PACKLINK_SENDER },
    to: {
      name,
      surname,
      company: '',
      street1: String(addr.street_address),
      zip_code: String(addr.postal_code),
      city: String(addr.city || ''),
      state: String(addr.city || ''),
      country: String(addr.country).toUpperCase(),
      phone: String(addr.phone || PACKLINK_SENDER.phone),
      email: order.customer_email,
    },
    packages: [pkg],
  };

  const created = await createPacklinkShipment(shipmentBody);
  const reference = String((created.reference as string) || (created.id as string) || '');
  const carrierName = svc.carrier_name || svc.name;
  const price = svc.price?.total_price ?? null;

  // 3. Persist
  await supabase.from('shipments').insert({
    order_id: orderId,
    carrier: carrierName,
    service_name: svc.name,
    packlink_reference: reference || null,
    price,
    status: 'created',
  });
  await supabase.from('orders').update({ shipping_method: carrierName }).eq('id', orderId);

  await logAdminAction(userId, 'create_shipment', 'order', orderId, {
    packlink_reference: reference,
    carrier: carrierName,
    price,
  });

  return NextResponse.json({
    ok: true,
    reference,
    carrier: carrierName,
    service: svc.name,
    price,
  });
}

async function syncShipment(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  userId: string,
) {
  const { data: ship } = await supabase
    .from('shipments')
    .select('id, packlink_reference')
    .eq('order_id', orderId)
    .not('packlink_reference', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ship?.packlink_reference) {
    return NextResponse.json(
      { error: 'Nessuna spedizione Packlink da sincronizzare' },
      { status: 404 },
    );
  }

  const remote = await getPacklinkShipment(ship.packlink_reference);
  const codes =
    (remote.trackings as string[] | undefined) ||
    (remote.tracking_codes as string[] | undefined) ||
    [];
  const tracking =
    Array.isArray(codes) && codes.length > 0
      ? String(codes[0])
      : typeof remote.tracking === 'string'
        ? remote.tracking
        : null;
  const state = String(remote.state || remote.status || 'created');

  const labels = await getPacklinkLabels(ship.packlink_reference);

  await supabase
    .from('shipments')
    .update({
      tracking_number: tracking,
      status: state,
      label_url: labels[0] ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ship.id);

  if (tracking) {
    await supabase.from('orders').update({ tracking_number: tracking }).eq('id', orderId);
  }

  await logAdminAction(userId, 'sync_shipment', 'order', orderId, { state, tracking });

  return NextResponse.json({ ok: true, tracking, state, label_url: labels[0] ?? null });
}
