import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['admin', 'super_admin', 'order_manager'];

export async function GET() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServiceClient();

  const [
    { count: newReturns },
    { count: lowStock },
    { count: pendingOrders },
    { count: pendingReviews },
  ] = await Promise.all([
    supabase.from('returns').select('id', { count: 'exact', head: true }).eq('status', 'requested'),
    supabase.from('inventory').select('id', { count: 'exact', head: true }).lt('quantity_available', 3),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
  ]);

  return NextResponse.json({
    newReturns: newReturns ?? 0,
    lowStock: lowStock ?? 0,
    pendingOrders: pendingOrders ?? 0,
    pendingReviews: pendingReviews ?? 0,
    total: (newReturns ?? 0) + (lowStock ?? 0) + (pendingOrders ?? 0) + (pendingReviews ?? 0),
  });
}
