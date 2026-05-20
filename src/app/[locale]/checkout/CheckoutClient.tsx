'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useTranslations } from 'next-intl';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { computeShipping } from '@/config/shipping';
import { ArrowLeft, Lock } from 'lucide-react';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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

  const [form, setForm] = useState({
    customer_name: '',
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

  useEffect(() => {
    if (items.length === 0 && !initData) {
      router.replace('/cart');
    }
  }, [items, initData, router]);

  const subtotal = total();
  const shipping = computeShipping(subtotal);
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
          customer_name: form.customer_name,
          shipping_address: form.address,
          ...(coupon ? { coupon_code: coupon.code } : {}),
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
              <form onSubmit={handleInfoSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.name')} *</label>
                    <input
                      required
                      value={form.customer_name}
                      onChange={(e) => setField('customer_name', e.target.value)}
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.email')} *</label>
                    <input
                      required
                      type="email"
                      value={form.customer_email}
                      onChange={(e) => setField('customer_email', e.target.value)}
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                      placeholder="mario@esempio.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.fullName')} *</label>
                  <input
                    required
                    value={form.address.full_name}
                    onChange={(e) => setAddress('full_name', e.target.value)}
                    className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.address')} *</label>
                  <input
                    required
                    value={form.address.street_address}
                    onChange={(e) => setAddress('street_address', e.target.value)}
                    className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                    placeholder="Via Roma 1"
                  />
                </div>

                <div className="grid grid-cols-[1fr_140px_120px] gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.city')} *</label>
                    <input
                      required
                      value={form.address.city}
                      onChange={(e) => setAddress('city', e.target.value)}
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.postalCode')} *</label>
                    <input
                      required
                      value={form.address.postal_code}
                      onChange={(e) => setAddress('postal_code', e.target.value)}
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.country')}</label>
                    <select
                      value={form.address.country}
                      onChange={(e) => setAddress('country', e.target.value)}
                      className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors bg-white"
                    >
                      <option value="IT">{t('countries.IT')}</option>
                      <option value="CH">{t('countries.CH')}</option>
                      <option value="DE">{t('countries.DE')}</option>
                      <option value="FR">{t('countries.FR')}</option>
                      <option value="GB">{t('countries.GB')}</option>
                      <option value="US">{t('countries.US')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">{t('fields.phone')}</label>
                  <input
                    type="tel"
                    value={form.address.phone}
                    onChange={(e) => setAddress('phone', e.target.value)}
                    className="w-full border border-pearl-grey px-4 py-3 text-sm font-light focus:outline-none focus:border-soft-black transition-colors"
                    placeholder="+39 333 000 0000"
                  />
                </div>

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
                  <span>−{formatPrice(coupon.discount_amount)}</span>
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
