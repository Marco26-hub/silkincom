/**
 * Validate a coupon code against current cart subtotal.
 *
 * POST /api/coupons/validate
 *   body: { code: string, subtotal: number, email?: string, locale?: string }
 *   response: { valid, discount_type, discount_value, discount_amount, message, code? }
 *
 * - Checks code exists, is_active, within validity window
 * - Checks minimum_order_amount
 * - Checks max_uses (global)
 * - Checks max_uses_per_customer against authenticated user_id AND/or email
 * - Computes discount_amount in EUR (capped at subtotal)
 *
 * Messages are translated server-side using `locale` from body (default 'it').
 *
 * Does NOT redeem — redemption happens at order completion.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MsgKey =
  | 'empty'
  | 'subtotalInvalid'
  | 'invalid'
  | 'inactive'
  | 'notYet'
  | 'expired'
  | 'minOrder'
  | 'exhausted'
  | 'maxUses'
  | 'applied'
  | 'validateError';

const MSG: Record<string, Record<MsgKey, string>> = {
  it: {
    empty: 'Inserisci un codice',
    subtotalInvalid: 'Subtotale non valido',
    invalid: 'Codice non valido',
    inactive: 'Codice non attivo',
    notYet: 'Codice non ancora valido',
    expired: 'Codice scaduto',
    minOrder: 'Minimo ordine €{amount} per usare questo codice',
    exhausted: 'Codice esaurito',
    maxUses: 'Codice già utilizzato il massimo delle volte',
    applied: 'Sconto applicato: −€{amount}',
    validateError: 'Errore validazione',
  },
  en: {
    empty: 'Enter a code',
    subtotalInvalid: 'Invalid subtotal',
    invalid: 'Invalid code',
    inactive: 'Code not active',
    notYet: 'Code not yet valid',
    expired: 'Code expired',
    minOrder: 'Minimum order €{amount} to use this code',
    exhausted: 'Code exhausted',
    maxUses: 'Code already used the maximum number of times',
    applied: 'Discount applied: −€{amount}',
    validateError: 'Validation error',
  },
  es: {
    empty: 'Introduce un código',
    subtotalInvalid: 'Subtotal no válido',
    invalid: 'Código no válido',
    inactive: 'Código no activo',
    notYet: 'Código aún no válido',
    expired: 'Código caducado',
    minOrder: 'Pedido mínimo €{amount} para usar este código',
    exhausted: 'Código agotado',
    maxUses: 'Código ya utilizado el máximo de veces',
    applied: 'Descuento aplicado: −€{amount}',
    validateError: 'Error de validación',
  },
  fr: {
    empty: 'Saisissez un code',
    subtotalInvalid: 'Sous-total invalide',
    invalid: 'Code invalide',
    inactive: 'Code inactif',
    notYet: 'Code pas encore valable',
    expired: 'Code expiré',
    minOrder: 'Commande minimum €{amount} pour utiliser ce code',
    exhausted: 'Code épuisé',
    maxUses: 'Code déjà utilisé le maximum de fois',
    applied: 'Remise appliquée : −€{amount}',
    validateError: 'Erreur de validation',
  },
  de: {
    empty: 'Code eingeben',
    subtotalInvalid: 'Ungültige Zwischensumme',
    invalid: 'Ungültiger Code',
    inactive: 'Code nicht aktiv',
    notYet: 'Code noch nicht gültig',
    expired: 'Code abgelaufen',
    minOrder: 'Mindestbestellwert €{amount} für diesen Code',
    exhausted: 'Code aufgebraucht',
    maxUses: 'Code bereits maximal verwendet',
    applied: 'Rabatt angewendet: −€{amount}',
    validateError: 'Validierungsfehler',
  },
  pt: {
    empty: 'Insira um código',
    subtotalInvalid: 'Subtotal inválido',
    invalid: 'Código inválido',
    inactive: 'Código inativo',
    notYet: 'Código ainda não válido',
    expired: 'Código expirado',
    minOrder: 'Pedido mínimo €{amount} para usar este código',
    exhausted: 'Código esgotado',
    maxUses: 'Código já utilizado o máximo de vezes',
    applied: 'Desconto aplicado: −€{amount}',
    validateError: 'Erro de validação',
  },
  nl: {
    empty: 'Voer een code in',
    subtotalInvalid: 'Ongeldig subtotaal',
    invalid: 'Ongeldige code',
    inactive: 'Code niet actief',
    notYet: 'Code nog niet geldig',
    expired: 'Code verlopen',
    minOrder: 'Minimumbestelling €{amount} om deze code te gebruiken',
    exhausted: 'Code uitgeput',
    maxUses: 'Code is al maximaal gebruikt',
    applied: 'Korting toegepast: −€{amount}',
    validateError: 'Validatiefout',
  },
};

function tr(locale: string, key: MsgKey, params: Record<string, string | number> = {}): string {
  const dict = MSG[locale] || MSG.it;
  let s = dict[key];
  for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 20, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const locale = (body?.locale || 'it').toString().slice(0, 2).toLowerCase();

  try {
    const code = (body?.code || '').toString().trim().toUpperCase();
    const subtotal = Number(body?.subtotal);
    const emailRaw = (body?.email || '').toString().trim().toLowerCase();
    const email = emailRaw && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw) ? emailRaw : null;

    if (!code) {
      return NextResponse.json({ valid: false, message: tr(locale, 'empty') }, { status: 400 });
    }
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json({ valid: false, message: tr(locale, 'subtotalInvalid') }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, valid_from, valid_until, max_uses, max_uses_per_customer, minimum_order_amount, is_active')
      .ilike('code', code)
      .single();

    if (!coupon) {
      return NextResponse.json({ valid: false, message: tr(locale, 'invalid') });
    }
    if (!coupon.is_active) {
      return NextResponse.json({ valid: false, message: tr(locale, 'inactive') });
    }
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ valid: false, message: tr(locale, 'notYet') });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ valid: false, message: tr(locale, 'expired') });
    }
    if (coupon.minimum_order_amount && subtotal < Number(coupon.minimum_order_amount)) {
      return NextResponse.json({
        valid: false,
        message: tr(locale, 'minOrder', { amount: Number(coupon.minimum_order_amount).toFixed(0) }),
      });
    }

    if (coupon.max_uses && coupon.max_uses > 0) {
      const { count } = await supabase
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id);
      if ((count || 0) >= coupon.max_uses) {
        return NextResponse.json({ valid: false, message: tr(locale, 'exhausted') });
      }
    }

    if (coupon.max_uses_per_customer && coupon.max_uses_per_customer > 0) {
      const auth = await createServerClient();
      const { data: { user } } = await auth.auth.getUser();
      const cap = coupon.max_uses_per_customer;
      const checkEmail = email || user?.email?.toLowerCase() || null;

      if (user) {
        const { count } = await supabase
          .from('coupon_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_id', user.id);
        if ((count || 0) >= cap) {
          return NextResponse.json({ valid: false, message: tr(locale, 'maxUses') });
        }
      }

      if (checkEmail) {
        const { count } = await supabase
          .from('coupon_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_email', checkEmail);
        if ((count || 0) >= cap) {
          return NextResponse.json({ valid: false, message: tr(locale, 'maxUses') });
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
      message: tr(locale, 'applied', { amount: discount_amount.toFixed(2) }),
    });
  } catch (err) {
    console.error('Coupon validate error:', err);
    return NextResponse.json({ valid: false, message: tr(locale, 'validateError') }, { status: 500 });
  }
}
