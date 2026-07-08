import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { createServiceClient, createServerClient } from '@/lib/supabase/server';
import { computeShipping } from '@/config/shipping';
import { rateLimit } from '@/lib/rate-limit';
import { antibotGate } from '@/lib/antibot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const paymentIntentSchema = z.object({
  items: z.array(z.object({
    slug: z.string().min(1).max(200),
    name: z.string().min(1).max(500),
    price: z.number().positive().finite(),
    quantity: z.number().int().positive().max(100),
    variant_id: z.string().uuid().optional(),
    size: z.string().min(1).max(10).optional(),
  })).min(1).max(50),
  customer_email: z.string().email().max(254),
  customer_name: z.string().min(1).max(200),
  coupon_code: z.string().max(50).optional(),
  delivery_method: z.enum(['standard', 'hand_delivery']).optional().default('standard'),
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

    // Anti-bot gate — bots were POSTing here directly and creating junk
    // "pending" orders before any payment. Rate limit + honeypot + signed
    // timing token (minted on checkout page load). See src/lib/antibot.ts.
    const limited = rateLimit(req, 5, 60_000);
    if (limited) return limited;
    const gate = antibotGate(rawBody);
    if (gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const parsed = paymentIntentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { items, customer_email, customer_name, shipping_address, coupon_code, delivery_method } = parsed.data;

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

    // Resolve variants (size + price_override) for the items that carry one.
    const variantIds = Array.from(
      new Set(items.map((i) => i.variant_id).filter((v): v is string => !!v))
    );
    type VariantRow = { id: string; product_id: string; size: string | null; price_override: number | null; variant_sku: string };
    let variantMap = new Map<string, VariantRow>();
    if (variantIds.length > 0) {
      const { data: variants, error: variantErr } = await supabase
        .from('product_variants')
        .select('id, product_id, size, price_override, variant_sku')
        .in('id', variantIds);
      if (variantErr) {
        console.error('Variant lookup error:', variantErr);
        return NextResponse.json({ error: 'Errore lookup varianti' }, { status: 500 });
      }
      variantMap = new Map((variants ?? []).map((v) => [v.id, v as VariantRow]));
      const missingV = variantIds.filter((id) => !variantMap.has(id));
      if (missingV.length > 0) {
        return NextResponse.json(
          { error: `Varianti non trovate: ${missingV.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Recalculate prices server-side — never trust client
    let subtotal = 0;
    const validatedItems = items.map((item) => {
      const dbProduct = productMap.get(item.slug)!;
      if (dbProduct.status !== 'published') {
        throw new Error(`Prodotto non disponibile: ${item.slug}`);
      }
      let unitPrice = Number(dbProduct.price);
      let variantId: string | null = null;
      let displayName = dbProduct.name;
      if (item.variant_id) {
        const v = variantMap.get(item.variant_id);
        if (!v || v.product_id !== dbProduct.id) {
          throw new Error(`Variante non valida per ${item.slug}`);
        }
        variantId = v.id;
        if (v.price_override != null) unitPrice = Number(v.price_override);
        if (v.size) displayName = `${dbProduct.name} (Taglia ${v.size})`;
      }
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        product_id: dbProduct.id,
        variant_id: variantId,
        product_slug: dbProduct.slug,
        product_name: displayName,
        quantity: item.quantity,
        price_per_unit: unitPrice,
        total_price: lineTotal,
      };
    });

    // Base shipping from subtotal threshold. Hand delivery is always free
    // (in-person, no carrier). A valid free_shipping coupon also zeroes it
    // (handled in the coupon block below).
    let shipping_cost = delivery_method === 'hand_delivery' ? 0 : computeShipping(subtotal);

    // Server-side coupon validation (don't trust client-supplied discount)
    const normalizedEmail = customer_email.trim().toLowerCase();
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

        let perCustomerOk = true;
        if (coupon.max_uses_per_customer && coupon.max_uses_per_customer > 0) {
          const cap = Number(coupon.max_uses_per_customer);
          if (customerId) {
            const { count } = await supabase
              .from('coupon_redemptions')
              .select('id', { count: 'exact', head: true })
              .eq('coupon_id', coupon.id)
              .eq('customer_id', customerId);
            if ((count || 0) >= cap) perCustomerOk = false;
          }
          if (perCustomerOk) {
            const { count } = await supabase
              .from('coupon_redemptions')
              .select('id', { count: 'exact', head: true })
              .eq('coupon_id', coupon.id)
              .eq('customer_email', normalizedEmail);
            if ((count || 0) >= cap) perCustomerOk = false;
          }
        }

        let globalOk = true;
        if (coupon.max_uses && coupon.max_uses > 0) {
          const { count } = await supabase
            .from('coupon_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id);
          if ((count || 0) >= coupon.max_uses) globalOk = false;
        }

        if (fromOk && untilOk && minOk && perCustomerOk && globalOk) {
          const dv = Number(coupon.discount_value);
          if (coupon.discount_type === 'percentage' || coupon.discount_type === 'percent') {
            discount_amount = Math.round(subtotal * dv) / 100;
          } else if (coupon.discount_type === 'fixed' || coupon.discount_type === 'fixed_amount') {
            discount_amount = dv;
          } else if (coupon.discount_type === 'free_shipping') {
            shipping_cost = 0;
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
        customer_email: normalizedEmail,
        ...(customerId ? { customer_id: customerId } : {}),
        status: 'pending',
        subtotal,
        shipping_cost,
        tax_amount: 0,
        discount_amount,
        total_amount,
        currency: 'EUR',
        delivery_method,
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
      recipient_email: normalizedEmail,
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
          ...(it.variant_id ? { variant_id: it.variant_id } : {}),
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
