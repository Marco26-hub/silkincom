/**
 * Import tracking numbers from a Packlink-exported CSV.
 *
 * Expected CSV columns: order_id (or reference/order_number), tracking_number, carrier
 * Updates orders + sends shipping email (handled by existing PATCH endpoint chain).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'super_admin', 'order_manager'].includes(profile.role)) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'CSV richiesto' }, { status: 400 });

  const text = await file.text();
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: 'CSV vuoto' }, { status: 400 });

  const header = lines[0].split(/[;,]/).map((h) => h.trim().toLowerCase());
  const idxOrder = header.findIndex((h) => /order_id|order_number|reference/.test(h));
  const idxTracking = header.findIndex((h) => /tracking/.test(h));
  const idxCarrier = header.findIndex((h) => /carrier|courier/.test(h));

  if (idxOrder === -1 || idxTracking === -1) {
    return NextResponse.json({ error: 'Colonne richieste: order_id/reference + tracking_number' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let updated = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    const orderRef = cells[idxOrder];
    const trackingNumber = cells[idxTracking];
    const carrier = idxCarrier >= 0 ? cells[idxCarrier] : 'BRT';

    if (!orderRef || !trackingNumber) continue;

    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .or(`id.eq.${orderRef},order_number.eq.${orderRef}`)
      .maybeSingle();

    if (!order) {
      errors.push(`${orderRef}: non trovato`);
      continue;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        carrier,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (error) {
      errors.push(`${orderRef}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({ updated, errors });
}
