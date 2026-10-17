'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Lock, Truck, RotateCcw, MessageCircle } from 'lucide-react';
import { useCart } from '@/store/cart';
import { trackViewItem } from '@/lib/analytics';
import { WishlistButton } from './WishlistButton';
import { SizeGuideModal } from './SizeGuideModal';
import type { ProductVariant } from '@/data/catalog-meta';
import { Link } from '@/i18n/navigation';
import { getWinterProduct, WINTER_AVAILABILITY } from '@/data/winter-2026';

type Props = {
  slug: string;
  name: string;
  price: number;
  image: string;
  variants: ProductVariant[];
  previewOnly?: boolean;
  available?: number;
};

// Trust line shown right under the CTA — the purchase-decision moment. Self
// contained 7-locale copy so it needs no message-file changes.
const REASSURE = {
  secure: { it: 'Pagamento sicuro', en: 'Secure checkout', de: 'Sichere Zahlung', fr: 'Paiement sécurisé', es: 'Pago seguro', pt: 'Pagamento seguro', nl: 'Veilig betalen' },
  shipping: { it: 'Spedizione gratuita oltre €200', en: 'Free shipping over €200', de: 'Gratisversand ab €200', fr: 'Livraison gratuite dès €200', es: 'Envío gratis desde €200', pt: 'Portes grátis acima de €200', nl: 'Gratis verzending vanaf €200' },
  returns: { it: 'Recesso 14 gg · difetti a nostro carico', en: '14-day withdrawal · defects covered by us', de: '14 Tage Widerruf · Mängel auf unsere Kosten', fr: 'Rétractation 14 j · défauts à notre charge', es: 'Desistimiento 14 días · defectos a nuestro cargo', pt: 'Livre resolução 14 dias · defeitos a nosso cargo', nl: '14 dagen bedenktijd · gebreken voor onze rekening' },
  whatsapp: { it: 'Domande? Scrivici su WhatsApp', en: 'Questions? Message us on WhatsApp', de: 'Fragen? Schreib uns auf WhatsApp', fr: 'Des questions ? Écrivez-nous sur WhatsApp', es: '¿Dudas? Escríbenos por WhatsApp', pt: 'Dúvidas? Fale connosco no WhatsApp', nl: 'Vragen? App ons op WhatsApp' },
} as const;

// Customer-facing WhatsApp (owner business line) for the "message us" trust link.
const WHATSAPP_URL = 'https://wa.me/393477196603';

function fmtPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function ProductPurchaseSection({ slug, name, price, image, variants, available, previewOnly = false }: Props) {
  const t = useTranslations('product');
  const locale = useLocale();
  const r = (m: Record<string, string>) => m[locale] ?? m.en ?? m.it;
  const { addItem, items } = useCart();
  const winter = getWinterProduct(slug);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => variants.length === 1 && variants[0].size === 'UNI' ? 'UNI' : null);
  const [added, setAdded] = useState(false);
  const [showError, setShowError] = useState(false);

  // Vista prodotto: è il segnale su cui Meta costruisce il retargeting e GA4
  // il tasso di conversione per scheda. Una volta sola per prodotto montato.
  useEffect(() => {
    if (!previewOnly) trackViewItem({ id: slug, name, price });
  }, [slug, name, price, previewOnly]);
  // Mobile sticky add-to-cart: surfaces a fixed price + CTA bar once the inline
  // button scrolls out of view, so the buy action is always one tap away on
  // phones (where the whole audience is).
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hasSizes = variants.length > 0;
  const selectedVariant = hasSizes
    ? variants.find((v) => v.size === selectedSize) ?? null
    : null;
  const unavailable = hasSizes ? variants.every((variant) => variant.available <= 0) : available !== undefined ? available <= 0 : Boolean(winter);
  const alreadyInCart = items.find((item) => item.slug === slug && item.variantId === selectedVariant?.id)?.quantity ?? 0;
  const selectedStock = selectedVariant?.available ?? available;
  const stockLimitReached = selectedStock !== undefined && alreadyInCart >= selectedStock;
  const addDisabled = added || unavailable || stockLimitReached || Boolean(selectedVariant && selectedVariant.available <= 0);

  function handleAdd() {
    if (addDisabled) {
      console.info(`[cart] Add refused for ${slug}: unavailable or stock limit reached.`);
      return;
    }
    if (hasSizes && !selectedVariant) {
      setShowError(true);
      return;
    }
    setShowError(false);
    const effectivePrice = selectedVariant?.priceOverride ?? price;
    addItem({
      slug,
      name,
      price: effectivePrice,
      image,
      variantId: selectedVariant?.id,
      size: selectedVariant?.size,
      maxQuantity: selectedStock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    if (!previewOnly && typeof window !== 'undefined' && window.silkincomTrack) {
      window.silkincomTrack('add_to_cart', {
        currency: 'EUR',
        value: effectivePrice,
        items: [
          {
            item_id: selectedVariant?.sku ?? slug,
            item_name: name,
            item_variant: selectedVariant?.size,
            price: effectivePrice,
            quantity: 1,
          },
        ],
      });
    }
    // First-party beacon (always, aggregate).
    if (!previewOnly) window.silkincomAnalytics?.('add_to_cart', { product: slug, value: effectivePrice });
  }

  return (
    <div className="flex flex-col gap-5">
      {hasSizes ? (
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-soft-black">
              {t('size.label')}
            </p>
            {/* Apparel-specific size guide. Opens the modal directly instead
                of scrolling to an in-page anchor — the previous scroll-to
                approach failed on mobile (no anchor in viewport, and the
                target modal showed scarf formats, not S/M/L/XL/XXL). */}
            {!winter && <SizeGuideModal mode="apparel" />}
          </div>
          <div className={`grid gap-2 ${variants.length === 1 ? 'grid-cols-1' : 'grid-cols-5'}`}>
            {variants.map((v) => {
              const isSelected = v.size === selectedSize;
              const outOfStock = v.available <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => {
                    setSelectedSize(v.size);
                    setShowError(false);
                  }}
                  className={`relative min-h-[48px] text-sm uppercase tracking-[0.2em] border transition-all duration-200 ${
                    isSelected
                      ? 'border-soft-black bg-soft-black text-warm-white'
                      : outOfStock
                        ? 'border-pearl-grey/60 text-soft-grey/50 cursor-not-allowed line-through'
                        : 'border-pearl-grey text-soft-black hover:border-soft-black'
                  }`}
                  aria-label={`${t('size.label')} ${v.size}${outOfStock ? ` — ${winter ? r(WINTER_AVAILABILITY.unavailable) : t('size.outOfStock')}` : ''}`}
                >
                  {v.size === 'UNI' ? r(WINTER_AVAILABILITY.oneSize) : v.size}
                </button>
              );
            })}
          </div>
          {selectedVariant ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              {selectedVariant.available > 0
                ? t('size.availableUnits', { n: selectedVariant.available })
                : t('size.outOfStock')}
            </p>
          ) : null}
          {showError ? (
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-red-700">
              {t('size.selectFirst')}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        ref={ctaRef}
        type="button"
        onClick={handleAdd}
        disabled={addDisabled}
        className={`w-full px-8 py-4 text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 ${
          unavailable || stockLimitReached ? 'cursor-not-allowed bg-pearl-grey text-soft-grey' : added
            ? 'bg-gold-primary text-soft-black'
            : 'bg-soft-black text-warm-white hover:bg-gold-primary hover:text-soft-black'
        }`}
      >
        {unavailable ? r(WINTER_AVAILABILITY.unavailable) : stockLimitReached ? r(WINTER_AVAILABILITY.cartLimit) : added ? (
          <>
            <Check className="w-4 h-4" />
            {t('addedToCart')}
          </>
        ) : (
          t('addToCart')
        )}
      </button>
      {unavailable && winter && (
        <Link href={`/collezioni/inverno?interesse=${winter.key}#anteprima-inverno`} className="text-center text-[11px] uppercase tracking-[0.2em] text-gold-dark underline underline-offset-4">
          {r(WINTER_AVAILABILITY.notify)}
        </Link>
      )}

      {/* Reassurance — the trust signals that unblock the purchase decision,
          placed immediately under the CTA. */}
      <ul className="flex flex-col gap-2 text-[11px] font-light text-soft-black/70">
        <li className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-gold-primary flex-shrink-0" />{r(REASSURE.secure)}</li>
        <li className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-gold-primary flex-shrink-0" />{r(REASSURE.shipping)}</li>
        <li className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5 text-gold-primary flex-shrink-0" />{r(REASSURE.returns)}</li>
        <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gold-dark transition-colors"><MessageCircle className="w-3.5 h-3.5 text-gold-primary flex-shrink-0" />{r(REASSURE.whatsapp)}</a></li>
      </ul>

      <WishlistButton productSlug={slug} />

      {/* Mobile sticky add-to-cart (phones only); appears once inline CTA scrolls away */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-pearl-grey bg-warm-white/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${
          showSticky && !added ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col leading-tight">
          <span className="text-base font-light text-soft-black">{fmtPrice(selectedVariant?.priceOverride ?? price)}</span>
          <span className="text-[9px] uppercase tracking-[0.15em] text-soft-grey">{r(REASSURE.returns)}</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={addDisabled}
          className="ml-auto flex-1 max-w-[60%] bg-soft-black px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-warm-white disabled:cursor-not-allowed disabled:bg-pearl-grey disabled:text-soft-grey"
        >
          {unavailable ? r(WINTER_AVAILABILITY.unavailable) : stockLimitReached ? r(WINTER_AVAILABILITY.cartLimit) : t('addToCart')}
        </button>
      </div>
    </div>
  );
}
