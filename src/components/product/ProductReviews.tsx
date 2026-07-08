/**
 * ProductReviews — server component on PDP.
 * Lists approved reviews + renders ReviewForm (client) below.
 */
import { Star, ShieldCheck, RotateCcw, MapPin, BadgeCheck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ReviewForm } from './ReviewForm';

// Trust panel copy — shown while a product has no reviews yet, so the empty
// state builds confidence instead of signalling "nobody bought this". Every
// claim is true (heritage, returns policy, Stripe, registered company).
// Hardcoded per-locale like ProductPurchaseSection's REASSURE, to avoid
// threading 7 message files for a handful of strings.
const TRUST: Record<string, Record<string, string>> = {
  eyebrow: { it: 'La nostra garanzia', en: 'Our guarantee', es: 'Nuestra garantía', fr: 'Notre garantie', de: 'Unsere Garantie', pt: 'A nossa garantia', nl: 'Onze garantie' },
  title: { it: 'Acquista con serenità', en: 'Shop with confidence', es: 'Compra con confianza', fr: 'Achetez en toute confiance', de: 'Kaufen mit Vertrauen', pt: 'Compre com confiança', nl: 'Winkel met vertrouwen' },
  heritage: { it: 'Made in Como, nel distretto tessile dal 1400', en: 'Made in Como, in the textile district since 1400', es: 'Made in Como, en el distrito textil desde 1400', fr: 'Made in Como, dans le district textile depuis 1400', de: 'Made in Como, im Textilbezirk seit 1400', pt: 'Made in Como, no distrito têxtil desde 1400', nl: 'Made in Como, in het textieldistrict sinds 1400' },
  guarantee: { it: 'Recesso 14 giorni · difetti a nostro carico', en: '14-day returns · defects covered by us', es: 'Devoluciones 14 días · defectos a nuestro cargo', fr: 'Retour 14 jours · défauts à notre charge', de: '14 Tage Rückgabe · Mängel auf unsere Kosten', pt: 'Devoluções 14 dias · defeitos a nosso cargo', nl: '14 dagen retour · gebreken voor onze rekening' },
  secure: { it: 'Pagamento sicuro con Stripe', en: 'Secure payment via Stripe', es: 'Pago seguro con Stripe', fr: 'Paiement sécurisé via Stripe', de: 'Sichere Zahlung mit Stripe', pt: 'Pagamento seguro com Stripe', nl: 'Veilig betalen via Stripe' },
  company: { it: 'Azienda reale registrata · atelier a Cermenate (CO)', en: 'A real registered company · atelier in Cermenate (CO)', es: 'Empresa real registrada · atelier en Cermenate (CO)', fr: 'Entreprise réelle enregistrée · atelier à Cermenate (CO)', de: 'Echtes registriertes Unternehmen · Atelier in Cermenate (CO)', pt: 'Empresa real registada · atelier em Cermenate (CO)', nl: 'Een echt geregistreerd bedrijf · atelier in Cermenate (CO)' },
  beFirst: { it: 'Sii la prima voce: racconta la tua esperienza qui sotto.', en: 'Be the first voice: share your experience below.', es: 'Sé la primera voz: comparte tu experiencia abajo.', fr: 'Soyez la première voix : partagez votre expérience ci-dessous.', de: 'Sei die erste Stimme: Teile unten deine Erfahrung.', pt: 'Seja a primeira voz: partilhe a sua experiência abaixo.', nl: 'Wees de eerste stem: deel hieronder je ervaring.' },
};

type Props = {
  productSlug: string;
  isAuthenticated: boolean;
};

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string;
  verified_purchase: boolean;
  created_at: string;
};

export async function ProductReviews({ productSlug, isAuthenticated }: Props) {
  const t = await getTranslations('product');
  const locale = await getLocale();
  const tr = (m: Record<string, string>) => m[locale] ?? m.en ?? m.it;
  let reviews: Review[] = [];
  let stats = { count: 0, average: 0 };

  try {
    const supabase = createServiceClient();
    const [{ data: rows }, { data: statsRows }] = await Promise.all([
      supabase
        .from('reviews_public')
        .select('id, rating, title, body, author_name, verified_purchase, created_at')
        .eq('product_slug', productSlug)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.rpc('product_review_stats', { p_slug: productSlug }),
    ]);
    if (rows) reviews = rows as Review[];
    if (statsRows && Array.isArray(statsRows) && statsRows[0]) {
      stats = {
        count: Number(statsRows[0].count || 0),
        average: Number(statsRows[0].average || 0),
      };
    }
  } catch {
    // Fail gracefully — no reviews shown
  }

  return (
    <div className="space-y-12">
      {stats.count > 0 ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(stats.average)
                    ? 'fill-gold-primary text-gold-primary'
                    : 'text-pearl-grey'
                }`}
                strokeWidth={1.4}
              />
            ))}
          </div>
          <p className="text-sm text-soft-black/70 font-light">
            {t('reviews.summary', { average: stats.average, count: stats.count })}
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 block text-[10px] uppercase tracking-[0.4em] text-gold-primary">
            {tr(TRUST.eyebrow)}
          </span>
          <h3 className="font-display font-light text-2xl md:text-3xl leading-tight mb-8">
            {tr(TRUST.title)}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-left mb-8">
            {[
              { Icon: MapPin, text: tr(TRUST.heritage) },
              { Icon: RotateCcw, text: tr(TRUST.guarantee) },
              { Icon: ShieldCheck, text: tr(TRUST.secure) },
              { Icon: BadgeCheck, text: tr(TRUST.company) },
            ].map(({ Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <Icon className="w-4 h-4 text-gold-primary flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span className="text-sm font-light leading-relaxed text-soft-black/75">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mx-auto h-px w-12 bg-gold-primary/40 mb-5" />
          <p className="font-display italic text-lg text-soft-black/60">
            {tr(TRUST.beFirst)}
          </p>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="border border-pearl-grey/60 p-6 bg-warm-white"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= r.rating
                          ? 'fill-gold-primary text-gold-primary'
                          : 'text-pearl-grey'
                      }`}
                      strokeWidth={1.4}
                    />
                  ))}
                </div>
                {r.verified_purchase && (
                  <span className="text-[9px] uppercase tracking-[0.25em] text-gold-dark">
                    {t('reviews.verified')}
                  </span>
                )}
              </div>
              {r.title && (
                <h3 className="font-display text-lg leading-tight mb-2">
                  {r.title}
                </h3>
              )}
              {r.body && (
                <p className="text-sm font-light leading-relaxed text-soft-black/75 mb-4">
                  {r.body}
                </p>
              )}
              <p className="text-[11px] uppercase tracking-[0.25em] text-soft-black/50 border-t border-pearl-grey/40 pt-3">
                {r.author_name}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="pt-6 border-t border-pearl-grey/40">
        <h3 className="font-display font-light text-2xl mb-6 text-center">
          {t('reviews.leaveReview')}
        </h3>
        <ReviewForm productSlug={productSlug} isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
