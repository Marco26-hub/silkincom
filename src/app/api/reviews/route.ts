/**
 * Review submission API.
 *
 * POST /api/reviews
 * Body: { product_slug, rating (1-5), title?, comment? }
 *
 * - Requires authenticated session
 * - Looks up customer_id and product_id
 * - Sets verified_purchase = true if user has a completed order with that product
 * - Inserts review with is_approved = false (admin moderates)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const body = await req.json();
    const productSlug = (body?.product_slug || '').toString().trim();
    const rating = Number(body?.rating);
    const title = body?.title
      ? String(body.title).replace(/<[^>]*>/g, '').trim().slice(0, 120)
      : null;
    const comment = body?.comment
      ? String(body.comment).replace(/<[^>]*>/g, '').trim().slice(0, 2000)
      : null;

    if (!productSlug) {
      return NextResponse.json({ error: 'product_slug required' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating must be integer 1-5' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Resolve product
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', productSlug)
      .single();
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verified purchase check: any non-cancelled order with this product for this user
    let verified = false;
    let orderId: string | null = null;
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id, orders!inner(id, status, customer_id)')
      .eq('product_id', product.id)
      .eq('orders.customer_id', user.id)
      .in('orders.status', ['completed', 'shipped', 'delivered', 'paid'])
      .limit(1);
    if (orderItems && orderItems.length > 0) {
      verified = true;
      orderId = orderItems[0].order_id;
    }

    // Prevent duplicate review by same user for same product
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', product.id)
      .eq('customer_id', user.id)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Recensione già inviata per questo prodotto' },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from('reviews').insert({
      product_id: product.id,
      customer_id: user.id,
      order_id: orderId,
      rating,
      title,
      comment,
      is_verified_purchase: verified,
      is_approved: false,
    });

    if (insertError) {
      console.error('Review insert error:', insertError);
      return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: 'Recensione inviata, sarà visibile dopo moderazione.' },
      { status: 201 }
    );
  } catch (err) {
    console.error('Review API error:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
