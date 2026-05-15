/**
 * Validate a coupon code against current cart subtotal.
 *
 * POST /api/coupons/validate
 *   body: { code: string, subtotal: number }
 *   response: { valid, discount_type, discount_value, discount_amount, message, code? }
 *
 * - Checks code exists, is_active, within validity window
 * - Checks minimum_order_amount
 * - Checks max_uses (global)
 * - Checks max_uses_per_customer (if authenticated)
 * - Computes discount_amount in EUR (capped at subtotal)
 *
 * Does NOT redeem — redemption happens at order completion.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 20, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const code = (body?.code || '').toString().trim().toUpperCase();
    const subtotal = Number(body?.subtotal);

    if (!code) {
      return NextResponse.json({ valid: false, message: 'Inserisci un codice' }, { status: 400 });
    }
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json({ valid: false, message: 'Subtotale non valido' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, valid_from, valid_until, max_uses, max_uses_per_customer, minimum_order_amount, is_active')
      .ilike('code', code)
      .single();

    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'Codice non valido' });
    }
    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, message: 'Codice non attivo' });
    }
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ valid: false, message: 'Codice non ancora valido' });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ valid: false, message: 'Codice scaduto' });
    }
    if (coupon.minimum_order_amount && subtotal < Number(coupon.minimum_order_amount)) {
      return NextResponse.json({
        valid: false,
        message: `Minimo ordine €${Number(coupon.minimum_order_amount).toFixed(0)} per usare questo codice`,
      });
    }

    // Global usage cap
    if (coupon.max_uses && coupon.max_uses > 0) {
      const { count } = await supabase
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id);
      if ((count || 0) >= coupon.max_uses) {
        return NextResponse.json({ valid: false, message: 'Codice esaurito' });
      }
    }

    // Per-customer usage cap
    if (coupon.max_uses_per_customer && coupon.max_uses_per_customer > 0) {
      const auth = await createServerClient();
      const { data: { user } } = await auth.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('coupon_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_id', user.id);
        if ((count || 0) >= coupon.max_uses_per_customer) {
          return NextResponse.json({
            valid: false,
            message: 'Codice già utilizzato il massimo delle volte',
          });
        }
      }
    }

    const discountValue = Number(coupon.discount_value);
    let discount_amount = 0;
    if (coupon.discount_type === 'percentage' || coupon.discount_type === 'percent') {
      discount_amount = Math.round(subtotal * discountValue) / 100;
    } else if (coupon.discount_type === 'fixed' || coupon.discount_type === 'fixed_amount') {
      discount_amount = discountValue;
    }
    discount_amount = Math.min(discount_amount, subtotal);
    discount_amount = Math.round(discount_amount * 100) / 100;

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: discountValue,
      discount_amount,
      message: `Sconto applicato: −€${discount_amount.toFixed(2)}`,
    });
  } catch (err) {
    console.error('Coupon validate error:', err);
    return NextResponse.json({ valid: false, message: 'Errore validazione' }, { status: 500 });
  }
}
