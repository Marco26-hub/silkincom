/**
 * Public read-only feed of recent paid/delivered orders for social proof popup.
 * Returns anonymized: first name initial + city + first product name + timestamp.
 *
 * GET /api/recent-sales?limit=20
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 60; // cache 1 min

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') || 20), 50);

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('orders')
      .select('id, status, paid_at, created_at, shipping_address, order_items(product_name, product_slug)')
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    const items = (data || []).map((o: any) => {
      const fullName = o.shipping_address?.full_name || '';
      const parts = fullName.trim().split(/\s+/);
      const first = parts[0] || 'Cliente';
      const lastInit = parts[1]?.[0] ? `${parts[1][0]}.` : '';
      const initials = `${first} ${lastInit}`.trim();
      const city = o.shipping_address?.city || 'Italia';
      const product = o.order_items?.[0]?.product_name || 'un capo SILKinCOM';
      const slug = o.order_items?.[0]?.product_slug || null;
      const when = o.paid_at || o.created_at;
      return { initials, city, product, slug, when };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error('recent-sales error:', err);
    return NextResponse.json({ items: [] });
  }
}
