import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { sendOrderConfirmationEmail, sendOwnerOrderNotificationEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.order_id;

      if (!orderId) {
        console.error('Missing order_id in metadata', { paymentIntentId: paymentIntent.id });
        return NextResponse.json({ error: 'Missing order_id in metadata' }, { status: 400 });
      }

      // Idempotency check
      const { data: order } = await supabase
        .from('orders')
        .select('id, status, customer_email, order_number, total_amount, order_items(product_id, variant_id, quantity)')
        .eq('id', orderId)
        .single();

      if (!order) {
        console.error(`Order ${orderId} not found`);
        return NextResponse.json({ error: 'Order not found' }, { status: 400 });
      }

      if (order.status !== 'pending') {
        console.log(`Order ${orderId} already processed (status=${order.status})`);
        return NextResponse.json({ received: true });
      }

      // Update order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'succeeded',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Order update error:', updateError);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }

      // Create payment record
      await supabase.from('payments').insert({
        order_id: orderId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: 'succeeded',
        payment_method: paymentIntent.payment_method_types[0],
      });

      // Decrement inventory (with FOR UPDATE lock via RPC function).
      // Variant-aware: call apply_inventory_movement directly so size-bound
      // inventory rows decrement, not the product-level row.
      // We never block payment confirmation on inventory drift — capture the
      // failures so admin can reconcile manually instead of silent loss.
      // Accumulates non-fatal problems (inventory drift, email failures) to
      // write onto the order in a single update — surfaced in admin Ordini.
      const adminNotes: string[] = [];
      const inventoryFailures: { product_id: string; variant_id: string | null; quantity: number; error: string }[] = [];
      for (const item of order.order_items || []) {
        const { error: invErr } = await supabase.rpc('apply_inventory_movement', {
          p_product_id: item.product_id,
          p_variant_id: item.variant_id ?? null,
          p_movement_type: 'sale',
          p_quantity_change: -item.quantity,
          p_reason: 'Vendita automatica post-pagamento',
          p_reference_order_id: orderId,
          p_performed_by: null,
        });
        if (invErr) {
          inventoryFailures.push({
            product_id: item.product_id,
            variant_id: item.variant_id ?? null,
            quantity: item.quantity,
            error: invErr.message,
          });
          console.error('[INVENTORY_DRIFT_ALERT] decrement failed', {
            orderId,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            error: invErr.message,
          });
        }
      }
      if (inventoryFailures.length > 0) {
        adminNotes.push(
          `[INVENTORY_DRIFT] ${inventoryFailures.length} riga/e non scalata/e: ${JSON.stringify(inventoryFailures)}`,
        );
      }

      // Record coupon redemption if applied at checkout
      const couponId = paymentIntent.metadata.coupon_id;
      if (couponId) {
        try {
          await supabase.from('coupon_redemptions').insert({
            coupon_id: couponId,
            order_id: orderId,
            customer_id: (order as { customer_id?: string }).customer_id || null,
          });
        } catch (couponErr) {
          console.error('Coupon redemption insert failed:', couponErr);
        }
      }

      // Confirmation emails (non-blocking). Two recipients: the customer and
      // the shop. Each is tried independently so one failure never blocks the
      // other, and failures are surfaced on the order for the admin.
      try {
        await sendOrderConfirmationEmail(
          order.customer_email,
          order.order_number,
          Number(order.total_amount)
        );
      } catch (emailError) {
        adminNotes.push(`[EMAIL_FAIL] conferma cliente: ${(emailError as Error).message}`);
        console.error('Customer confirmation email failed:', emailError);
      }
      try {
        await sendOwnerOrderNotificationEmail(
          order.order_number,
          Number(order.total_amount),
          order.customer_email
        );
      } catch (emailError) {
        adminNotes.push(`[EMAIL_FAIL] notifica negozio: ${(emailError as Error).message}`);
        console.error('Owner order notification email failed:', emailError);
      }

      // Single write for every non-fatal note collected above.
      if (adminNotes.length > 0) {
        await supabase
          .from('orders')
          .update({ admin_notes: adminNotes.join('\n') })
          .eq('id', orderId);
      }

      return NextResponse.json({ received: true });
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.order_id;

      if (orderId) {
        await supabase
          .from('orders')
          .update({
            status: 'failed',
            payment_status: 'failed',
          })
          .eq('id', orderId);
      }

      return NextResponse.json({ received: true });
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntentId) return NextResponse.json({ received: true });

      const { data: order } = await supabase
        .from('orders')
        .select('id, status, total_amount, customer_email, order_number')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (!order) {
        console.error(`Refund: order not found for PI ${paymentIntentId}`);
        return NextResponse.json({ received: true });
      }

      const refundedAmount = charge.amount_refunded / 100;
      const fullRefund = charge.amount === charge.amount_refunded;

      await supabase
        .from('orders')
        .update({
          status: fullRefund ? 'refunded' : order.status,
          payment_status: fullRefund ? 'refunded' : 'partially_refunded',
        })
        .eq('id', order.id);

      await supabase.from('payments').insert({
        order_id: order.id,
        stripe_payment_intent_id: paymentIntentId,
        amount: -refundedAmount,
        currency: charge.currency.toUpperCase(),
        status: 'refunded',
        payment_method: 'card',
        metadata: { stripe_charge_id: charge.id, refund_id: charge.refunds?.data[0]?.id },
      });

      return NextResponse.json({ received: true });
    }

    default:
      return NextResponse.json({ received: true, type: event.type });
  }
}
