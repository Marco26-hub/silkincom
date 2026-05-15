/**
 * Export pending/paid orders to Packlink PRO CSV import format.
 *
 * Packlink PRO doesn't expose an official public API, so the standard flow is:
 * 1. Admin clicks Export here → downloads packlink-orders-YYYYMMDD.csv
 * 2. Login pro.packlink.it → Import shipments → upload CSV
 * 3. Packlink generates labels → exports tracking back into our admin
 *
 * Format reference: https://help.packlink.com/hc/en-us/articles/360010024877
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

function csvEscape(v: any): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, order_number, customer_email, total_amount, weight_grams,
      shipping_address,
      order_items(product_name, quantity)
    `)
    .in('status', ['paid', 'processing'])
    .is('tracking_number', null)
    .order('created_at', { ascending: false });

  const rows: string[] = [];
  rows.push([
    'order_id', 'reference', 'recipient_name', 'recipient_email',
    'recipient_phone', 'recipient_street', 'recipient_city', 'recipient_zip',
    'recipient_country', 'package_weight_kg', 'package_length_cm',
    'package_width_cm', 'package_height_cm', 'package_value_eur',
    'contents_description',
  ].map(csvEscape).join(';'));

  for (const o of orders || []) {
    const addr = o.shipping_address || {};
    const items = o.order_items || [];
    const description = items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ');
    const weightKg = (o.weight_grams ? o.weight_grams / 1000 : 0.3).toFixed(2);

    rows.push([
      o.id,
      o.order_number,
      addr.full_name || '',
      o.customer_email,
      addr.phone || '',
      `${addr.street || ''} ${addr.street2 || ''}`.trim(),
      addr.city || '',
      addr.zip || addr.postal_code || '',
      addr.country || 'IT',
      weightKg,
      '30', '25', '5',
      Number(o.total_amount).toFixed(2),
      description,
    ].map(csvEscape).join(';'));
  }

  const csv = '﻿' + rows.join('\n');
  const filename = `packlink-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
