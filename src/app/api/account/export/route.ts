/**
 * GDPR Article 20 — Right to data portability.
 * GET /api/account/export → JSON file with all user data.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 3, 60_000);
  if (limited) return limited;

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const supabase = createServiceClient();

  const [profile, customer, addresses, orders, orderItems, wishlist, reviews, returns, newsletter] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('customers').select('*').eq('id', user.id).single(),
    supabase.from('customer_addresses').select('*').eq('customer_id', user.id),
    supabase.from('orders').select('*').eq('customer_id', user.id),
    supabase.from('order_items').select('*, orders!inner(customer_id)').eq('orders.customer_id', user.id),
    supabase.from('wishlist').select('*, products(name, slug)').eq('customer_id', user.id),
    supabase.from('reviews').select('*, products(name, slug)').eq('customer_id', user.id),
    supabase.from('returns').select('*').eq('customer_id', user.id),
    supabase.from('newsletter_subscribers').select('*').eq('email', user.email || ''),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile.data,
    customer: customer.data,
    addresses: addresses.data || [],
    orders: orders.data || [],
    order_items: orderItems.data || [],
    wishlist: wishlist.data || [],
    reviews: reviews.data || [],
    returns: returns.data || [],
    newsletter: newsletter.data || [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="silkincom-export-${user.id.slice(0, 8)}-${Date.now()}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
