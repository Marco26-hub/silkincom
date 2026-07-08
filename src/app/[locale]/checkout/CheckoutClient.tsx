'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useTranslations, useLocale } from 'next-intl';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { computeShipping } from '@/config/shipping';
import { ArrowLeft, Lock, MessageCircle } from 'lucide-react';
import { useAntibot } from '@/components/antibot/useAntibot';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Customer-facing WhatsApp help link at the payment step (reduces checkout
// abandonment by giving a human a tap away). 7-locale label, self-contained.
const CHECKOUT_WHATSAPP = 'https://wa.me/393477196603';
const HELP_LABEL: Record<string, string> = {
  it: 'Serve aiuto? Scrivici su WhatsApp',
  en: 'Need help? Message us on WhatsApp',
  de: 'Brauchst du Hilfe? Schreib uns auf WhatsApp',
  fr: "Besoin d'aide ? Écrivez-nous sur WhatsApp",
  es: '¿Necesitas ayuda? Escríbenos por WhatsApp',
  pt: 'Precisa de ajuda? Fale connosco no WhatsApp',
  nl: 'Hulp nodig? App ons op WhatsApp',
};

type ShippingAddress = {
  full_name: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
};

type InitData = {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  customerEmail: string;
};

function PaymentForm({ orderId, orderNumber, customerEmail }: { orderId: string; orderNumber: string; customerEmail: string }) {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { clearCart } = useCart();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order_id=${orderId}&order_number=${orderNumber}`,
        payment_method_data: {
          billing_details: { email: customerEmail },
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? t('errors.paymentFailed'));
      setPaying(false);
    } else {
      clearCart();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { email: 'never' } },
          defaultValues: { billingDetails: { email: customerEmail } },
        }}
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        <Lock className="w-3.5 h-3.5" />
        {paying ? t('actions.processing') : t('actions.confirmPayment')}
      </button>
      <p className="text-center text-xs text-soft-grey">
        {t('security.stripe')} · {t('security.ssl')}
      </p>
      <p className="text-center text-xs text-soft-grey">
        <a
          href={CHECKOUT_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-gold-dark transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {HELP_LABEL[locale] ?? HELP_LABEL.en}
        </a>
      </p>
    </form>
  );
}

export function CheckoutClient() {
  const t = useTranslations('checkout');
  const tcart = useTranslations('cart');
  const { items, total, coupon } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [initData, setInitData] = useState<InitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'hand_delivery'>('standard');
  const { fields: antibotFields, Honeypot } = useAntibot();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    customer_email: '',
    address: {
      full_name: '',
      street_address: '',
      city: '',
      postal_code: '',
      country: 'IT',
      phone: '',
    } as ShippingAddress,
  });

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  // Funnel: fire begin_checkout once when the checkout page loads with items.
  // (add_to_cart fires from the product buttons, purchase server-side from the
  // Stripe webhook — this closes the missing middle step in /admin/analytics.)
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (!beganCheckout.current && items.length > 0) {
      beganCheckout.current = true;
      window.silkincomAnalytics?.('begin_checkout', { value: total() });
    }
  }, [items]);

  useEffect(() => {
    if (items.length === 0 && !initData) {
      router.replace('/cart');
    }
  }, [items, initData, router]);

  const subtotal = total();
  // Shipping is waived for hand delivery (in-person) or a free_shipping coupon;
  // otherwise the subtotal threshold decides (computeShipping).
  const freeShipping = deliveryMethod === 'hand_delivery' || coupon?.discount_type === 'free_shipping';
  const shipping = freeShipping ? 0 : computeShipping(subtotal);
  const discountAmount = coupon?.discount_amount ?? 0;
  const grandTotal = Math.max(subtotal - discountAmount, 0) + shipping;

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setAddress(key: keyof ShippingAddress, value: string) {
    setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));
  }

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiError(null);

    const customerName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
    const shippingAddress: ShippingAddress = {
      ...form.address,
      full_name: customerName,
    };

    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.slug,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            ...(i.variantId ? { variant_id: i.variantId } : {}),
            ...(i.size ? { size: i.size } : {}),
          })),
          customer_email: form.customer_email,
          customer_name: customerName,
          shipping_address: shippingAddress,
          delivery_method: deliveryMethod,
          ...(coupon ? { coupon_code: coupon.code } : {}),
          ...antibotFields(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? t('errors.paymentFailed'));
        return;
      }

      setInitData({
        clientSecret: data.client_secret,
        orderId: data.order_id,
        orderNumber: data.order_number,
        totalAmount: data.total_amount,
        customerEmail: form.customer_email,
      });
      setStep('payment');
    } catch {
      setApiError(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }

  if (!stripePromise) {
    return (
      <section className="pt-40 pb-24 bg-warm-white min-h-[70vh]">
        <div className="max-w-[600px] mx-auto px-6 text-center">
          <p className="text-soft-grey font-light mb-6">
            Il checkout non è ancora attivo. Per ordini scrivici a{' '}
            <a href="mailto:info@silkincom.com" className="text-gold-primary underline">
              info@silkincom.com
            </a>
          </p>
          <Link href="/cart" className="text-sm text-soft-black underline">
            {t('actions.backToCart')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-40 pb-24 bg-warm-white min-h-[70vh]">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('actions.backToCart')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
          {/* Left: form */}
          <div>
            <h1 className="font-display font-light text-4xl mb-8">
              {step === 'info' ? t('steps.info') : t('steps.payment')}
            </h1>

            {step === 'info' && (
              <form onSubmit={handleInfoSubmit} className="space-y-8">
                <Honeypot />
                <section className="space-y-5">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-pearl-grey/60 pb-2">
                    {t('sections.contact')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.firstName')} *</label>
                      <input
                        required
                        autoComplete="given-name"
                        value={form.first_name}
                        onChange={(e) => setField('first_name', e.target.value)}
                        className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                        placeholder="Mario"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.lastName')} *</label>
                      <input
                        required
                        autoComplete="family-name"
                        value={form.last_name}
                        onChange={(e) => setField('last_name', e.target.value)}
                        className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                        placeholder="Rossi"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.email')} *</label>
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={form.customer_email}
                        onChange={(e) => setField('customer_email', e.target.value)}
                        className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                        placeholder="mario@esempio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.phone')}</label>
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={form.address.phone}
                        onChange={(e) => setAddress('phone', e.target.value)}
                        className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                        placeholder="+39 333 000 0000"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-pearl-grey/60 pb-2">
                    {t('delivery.title')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['standard', 'hand_delivery'] as const).map((m) => {
                      const active = deliveryMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDeliveryMethod(m)}
                          className={`text-left border px-4 py-3 transition-colors ${active ? 'border-soft-black bg-ivory' : 'border-pearl-grey hover:border-soft-black/50'}`}
                        >
                          <span className="flex items-center gap-2 text-sm font-light">
                            <span className={`inline-block w-3.5 h-3.5 rounded-full border ${active ? 'border-soft-black' : 'border-pearl-grey'} flex items-center justify-center`}>
                              {active && <span className="w-1.5 h-1.5 rounded-full bg-soft-black" />}
                            </span>
                            {m === 'standard' ? t('delivery.standard') : t('delivery.handDelivery')}
                          </span>
                          {m === 'hand_delivery' && (
                            <span className="block mt-1 ml-[22px] text-[11px] text-soft-grey">{t('delivery.handDeliveryNote')}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-pearl-grey/60 pb-2 pt-2">
                    {t('sections.shipping')}
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.address')} *</label>
                    <input
                      required
                      autoComplete="street-address"
                      value={form.address.street_address}
                      onChange={(e) => setAddress('street_address', e.target.value)}
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                      placeholder="Via Roma 1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.city')} *</label>
                      <input
                        required
                        autoComplete="address-level2"
                        value={form.address.city}
                        onChange={(e) => setAddress('city', e.target.value)}
                        className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                        placeholder="Como"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.postalCode')} *</label>
                      <input
                        required
                        autoComplete="postal-code"
                        value={form.address.postal_code}
                        onChange={(e) => setAddress('postal_code', e.target.value)}
                        className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                        placeholder="22100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.country')} *</label>
                    <select
                      value={form.address.country}
                      onChange={(e) => setAddress('country', e.target.value)}
                      autoComplete="country"
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors bg-white"
                    >
                      <option value="IT">{t('countries.IT')}</option>
                      <option value="CH">{t('countries.CH')}</option>
                      <option value="DE">{t('countries.DE')}</option>
                      <option value="FR">{t('countries.FR')}</option>
                      <option value="ES">{t('countries.ES')}</option>
                      <option value="NL">{t('countries.NL')}</option>
                      <option value="PT">{t('countries.PT')}</option>
                      <option value="BE">{t('countries.BE')}</option>
                      <option value="AT">{t('countries.AT')}</option>
                      <option value="GB">{t('countries.GB')}</option>
                      <option value="US">{t('countries.US')}</option>
                    </select>
                  </div>
                </section>

                {apiError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
                    {apiError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? t('actions.processing') : t('actions.continueToPayment')}
                </button>
              </form>
            )}

            {step === 'payment' && initData && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: initData.clientSecret,
                  appearance: {
                    theme: 'flat',
                    variables: {
                      colorPrimary: '#D4AF37',
                      fontFamily: 'system-ui, sans-serif',
                      borderRadius: '0px',
                    },
                  },
                }}
              >
                <PaymentForm orderId={initData.orderId} orderNumber={initData.orderNumber} customerEmail={initData.customerEmail} />
              </Elements>
            )}
          </div>

          {/* Right: order summary */}
          <aside className="h-fit border border-pearl-grey/70 p-6 space-y-5 lg:sticky lg:top-32">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-soft-grey">{tcart('summary')}</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.slug}::${item.variantId ?? ''}`} className="flex justify-between text-sm">
                  <span className="text-soft-black/80 truncate max-w-[60%]">
                    {item.name}
                    {item.size ? (
                      <span className="ml-1.5 text-[10px] uppercase tracking-[0.15em] text-gold-dark">
                        Taglia {item.size}
                      </span>
                    ) : null}
                    <span className="text-soft-grey"> ×{item.quantity}</span>
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-pearl-grey pt-4 space-y-2">
              {coupon && (
                <div className="flex justify-between text-sm text-gold-dark">
                  <span>Coupon {coupon.code}</span>
                  <span>{coupon.discount_type === 'free_shipping' ? tcart('shippingFree') : `−${formatPrice(coupon.discount_amount)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-soft-grey">
                <span>{tcart('shipping')}</span>
                <span>{shipping === 0 ? tcart('shippingFree') : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between font-medium text-base">
                <span>{tcart('total')}</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
            <p className="text-xs text-soft-grey leading-relaxed">
              {tcart('shippingThreshold', { amount: '€200' })}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
