import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { createServiceClient, createServerClient } from '@/lib/supabase/server';
import { computeShipping } from '@/config/shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paymentIntentSchema = z.object({
  items: z.array(z.object({
    slug: z.string().min(1).max(200),
    name: z.string().min(1).max(500),
    price: z.number().positive().finite(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
  customer_email: z.string().email().max(254),
  customer_name: z.string().min(1).max(200),
  coupon_code: z.string().max(50).optional(),
  shipping_address: z.object({
    full_name: z.string().min(1).max(200),
    street_address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    postal_code: z.string().min(1).max(20),
    country: z.string().length(2),
    phone: z.string().max(30).optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = paymentIntentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { items, customer_email, customer_name, shipping_address, coupon_code } = parsed.data;

    const supabase = createServiceClient();

    // Detect authenticated user (optional — guest checkout allowed)
    let customerId: string | null = null;
    try {
      const authClient = await createServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        customerId = user.id;
      }
    } catch {
      // Guest checkout — continue without customer_id
    }

    // Resolve product_id (UUID) from slug
    const slugs = items.map((i) => i.slug);
    const { data: dbProducts, error: lookupError } = await supabase
      .from('products')
      .select('id, slug, price, name, status')
      .in('slug', slugs);

    if (lookupError) {
      console.error('Product lookup error:', lookupError);
      return NextResponse.json({ error: 'Errore lookup prodotti' }, { status: 500 });
    }

    const productMap = new Map(dbProducts?.map((p) => [p.slug, p]) ?? []);
    const missing = slugs.filter((s) => !productMap.has(s));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Prodotti non trovati: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Recalculate prices server-side — never trust client
    let subtotal = 0;
    const validatedItems = items.map((item) => {
      const dbProduct = productMap.get(item.slug)!;
      if (dbProduct.status !== 'published') {
        throw new Error(`Prodotto non disponibile: ${item.slug}`);
      }
      const lineTotal = Number(dbProduct.price) * item.quantity;
      subtotal += lineTotal;
      return {
        product_id: dbProduct.id,
        product_slug: dbProduct.slug,
        product_name: dbProduct.name,
        quantity: item.quantity,
        price_per_unit: dbProduct.price,
        total_price: lineTotal,
      };
    });

    const shipping_cost = computeShipping(subtotal);

    // Server-side coupon validation (don't trust client-supplied discount)
    let discount_amount = 0;
    let validated_coupon_id: string | null = null;
    if (coupon_code && coupon_code.trim()) {
      const code = coupon_code.trim().toUpperCase();
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id, discount_type, discount_value, valid_from, valid_until, max_uses, max_uses_per_customer, minimum_order_amount, is_active')
        .ilike('code', code)
        .single();
      if (coupon && coupon.is_active) {
        const now = new Date();
        const fromOk = !coupon.valid_from || new Date(coupon.valid_from) <= now;
        const untilOk = !coupon.valid_until || new Date(coupon.valid_until) >= now;
        const minOk = !coupon.minimum_order_amount || subtotal >= Number(coupon.minimum_order_amount);
        if (fromOk && untilOk && minOk) {
          const dv = Number(coupon.discount_value);
          if (coupon.discount_type === 'percentage' || coupon.discount_type === 'percent') {
            discount_amount = Math.round(subtotal * dv) / 100;
          } else if (coupon.discount_type === 'fixed' || coupon.discount_type === 'fixed_amount') {
            discount_amount = dv;
          }
          discount_amount = Math.min(discount_amount, subtotal);
          discount_amount = Math.round(discount_amount * 100) / 100;
          validated_coupon_id = coupon.id;
        }
      }
    }

    const total_amount = Math.max(subtotal + shipping_cost - discount_amount, 0);
    const amountCents = Math.round(total_amount * 100);

    if (amountCents < 50) {
      return NextResponse.json({ error: 'Importo troppo basso' }, { status: 400 });
    }

    // Create pending order with shipping address saved as JSONB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_email: customer_email.trim().toLowerCase(),
        ...(customerId ? { customer_id: customerId } : {}),
        status: 'pending',
        subtotal,
        shipping_cost,
        tax_amount: 0,
        discount_amount,
        total_amount,
        currency: 'EUR',
        payment_status: 'pending',
        shipping_address: {
          full_name: shipping_address.full_name,
          street_address: shipping_address.street_address,
          city: shipping_address.city,
          postal_code: shipping_address.postal_code,
          country: shipping_address.country,
          phone: shipping_address.phone ?? '',
        },
      })
      .select('id, order_number')
      .single();

    if (orderError || !order) {
      console.error('Order creation failed:', orderError);
      return NextResponse.json({ error: 'Errore creazione ordine' }, { status: 500 });
    }

    // Insert order_items with product_slug for display
    const orderItemsInsert = validatedItems.map((item) => ({
      order_id: order.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsInsert);

    if (itemsError) {
      console.error('Order items insert error:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Errore creazione righe ordine' }, { status: 500 });
    }

    // Schedule abandoned-cart email at +24h. Cron will skip if order status changed.
    const abandonAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('email_lifecycle_jobs').insert({
      recipient_email: customer_email.trim().toLowerCase(),
      email_type: 'abandoned_cart',
      scheduled_at: abandonAt,
      status: 'pending',
      payload: {
        order_id: order.id,
        order_number: order.order_number,
        items: orderItemsInsert.map((it) => ({
          name: it.product_name,
          slug: it.product_slug,
          price: it.price_per_unit,
          quantity: it.quantity,
        })),
      },
    });

    // Create Stripe PaymentIntent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        customer_email,
        ...(validated_coupon_id ? { coupon_id: validated_coupon_id } : {}),
      },
      receipt_email: customer_email,
      description: `SILKinCOM — Ordine ${order.order_number}`,
      shipping: {
        name: shipping_address.full_name,
        phone: shipping_address.phone,
        address: {
          line1: shipping_address.street_address,
          city: shipping_address.city,
          postal_code: shipping_address.postal_code,
          country: shipping_address.country,
        },
      },
    });

    await supabase
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order.id);

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      order_id: order.id,
      order_number: order.order_number,
      total_amount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore interno';
    console.error('create-payment-intent error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
