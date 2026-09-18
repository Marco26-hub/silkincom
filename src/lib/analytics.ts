/**
 * Eventi e-commerce + attribuzione.
 *
 * Il componente `Analytics` carica GA4 e Meta Pixel e pubblica
 * `window.silkincomTrack()`, ma finora nessuno lo chiamava: il sito non
 * mandava un solo evento di acquisto. Senza `purchase` né Google né Meta
 * possono ottimizzare le campagne, e il fatturato non è attribuibile a
 * nessuna sorgente.
 *
 * Qui stanno i pochi eventi che contano davvero, con i nomi che GA4 e Meta si
 * aspettano (i due sistemi usano nomi diversi per la stessa cosa: `purchase`
 * contro `Purchase`, `add_to_cart` contro `AddToCart`).
 *
 * L'attribuzione è **first-touch**: la prima sorgente che ha portato la
 * persona sul sito viene salvata e riproposta a ogni evento successivo. È la
 * domanda a cui serve rispondere — «da dove arriva chi compra» — e l'ultimo
 * clic la nasconde, perché è quasi sempre una ricerca del nome del brand.
 */

const ATTRIBUTION_KEY = 'silkincom-attribution';
const CONSENT_KEY = 'silkincom-cookie-consent';

/** Durata della finestra di attribuzione. Oltre, la sorgente è troppo vecchia per dire qualcosa. */
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type Attribution = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  landing: string;
  at: number;
};

export type AnalyticsItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  variant?: string;
  category?: string;
};

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accept';
  } catch {
    return false;
  }
}

/**
 * Traduce un referrer in sorgente/mezzo quando mancano gli UTM.
 * Senza questo, tutto il traffico social organico finirebbe in "direct".
 */
function inferFromReferrer(ref: string): { source: string; medium: string } | null {
  if (!ref) return null;
  let host: string;
  try {
    host = new URL(ref).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  if (host.endsWith('silkincom.com')) return null; // navigazione interna

  const social = /instagram|facebook|fb\.|threads|tiktok|pinterest|youtube|linkedin|t\.co|twitter|x\.com/i;
  const search = /google|bing|duckduckgo|ecosia|yahoo|qwant/i;
  if (social.test(host)) return { source: host, medium: 'social' };
  if (search.test(host)) return { source: host, medium: 'organic' };
  return { source: host, medium: 'referral' };
}

/**
 * Salva la prima sorgente conosciuta. Chiamata a ogni caricamento: se
 * un'attribuzione valida esiste già, non la sovrascrive.
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;

  const existing = getAttribution();
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');

  // Un UTM esplicito è l'unica cosa che può riscrivere una first-touch già
  // registrata: significa che la persona è tornata da una campagna nuova.
  if (existing && !utmSource) return existing;

  const inferred = inferFromReferrer(document.referrer);
  const source = utmSource || inferred?.source;
  if (!source && existing) return existing;

  const attribution: Attribution = {
    source: source || 'direct',
    medium: params.get('utm_medium') || inferred?.medium || 'none',
    campaign: params.get('utm_campaign') || undefined,
    content: params.get('utm_content') || undefined,
    term: params.get('utm_term') || undefined,
    landing: window.location.pathname,
    at: Date.now(),
  };

  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    /* modalità privata: l'attribuzione vale solo per questa pagina */
  }
  return attribution;
}

export function getAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (!parsed?.source || Date.now() - parsed.at > ATTRIBUTION_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Campi di attribuzione da allegare a ogni evento, appiattiti per GA4. */
function attributionParams(): Record<string, string> {
  const a = getAttribution();
  if (!a) return {};
  return {
    attr_source: a.source,
    attr_medium: a.medium,
    ...(a.campaign ? { attr_campaign: a.campaign } : {}),
    ...(a.content ? { attr_content: a.content } : {}),
  };
}

function gaItems(items: AnalyticsItem[]) {
  return items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity ?? 1,
    ...(i.variant ? { item_variant: i.variant } : {}),
    ...(i.category ? { item_category: i.category } : {}),
  }));
}

function total(items: AnalyticsItem[]) {
  return Math.round(items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0) * 100) / 100;
}

/**
 * Invia lo stesso evento a GA4 e a Meta con i rispettivi nomi e formati.
 * Silenzioso senza consenso: la decisione è già stata presa dal banner.
 */
function send(
  gaEvent: string,
  metaEvent: string | null,
  gaParams: Record<string, unknown>,
  metaParams: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !hasConsent()) return;
  const attr = attributionParams();
  try {
    window.gtag?.('event', gaEvent, { ...gaParams, ...attr });
  } catch {
    /* un errore di tracciamento non deve mai rompere l'acquisto */
  }
  if (metaEvent) {
    try {
      window.fbq?.('track', metaEvent, metaParams);
    } catch {
      /* idem */
    }
  }
}

export function trackViewItem(item: AnalyticsItem) {
  send(
    'view_item',
    'ViewContent',
    { currency: 'EUR', value: item.price, items: gaItems([item]) },
    { content_ids: [item.id], content_name: item.name, content_type: 'product', currency: 'EUR', value: item.price }
  );
}

export function trackAddToCart(item: AnalyticsItem) {
  const value = item.price * (item.quantity ?? 1);
  send(
    'add_to_cart',
    'AddToCart',
    { currency: 'EUR', value, items: gaItems([item]) },
    { content_ids: [item.id], content_name: item.name, content_type: 'product', currency: 'EUR', value }
  );
}

export function trackBeginCheckout(items: AnalyticsItem[], coupon?: string) {
  const value = total(items);
  send(
    'begin_checkout',
    'InitiateCheckout',
    { currency: 'EUR', value, items: gaItems(items), ...(coupon ? { coupon } : {}) },
    { content_ids: items.map((i) => i.id), content_type: 'product', currency: 'EUR', value, num_items: items.length }
  );
}

/**
 * L'evento che conta. `transactionId` serve a GA4 per scartare i doppioni
 * quando la pagina di conferma viene ricaricata o condivisa.
 */
export function trackPurchase(args: {
  transactionId: string;
  items: AnalyticsItem[];
  value: number;
  shipping?: number;
  coupon?: string;
}) {
  send(
    'purchase',
    'Purchase',
    {
      transaction_id: args.transactionId,
      currency: 'EUR',
      value: args.value,
      ...(args.shipping !== undefined ? { shipping: args.shipping } : {}),
      ...(args.coupon ? { coupon: args.coupon } : {}),
      items: gaItems(args.items),
    },
    {
      content_ids: args.items.map((i) => i.id),
      content_type: 'product',
      currency: 'EUR',
      value: args.value,
      num_items: args.items.length,
    }
  );
}

/** Iscrizione newsletter: è il lead che alimenta il codice di benvenuto. */
export function trackLead(source: string) {
  send('generate_lead', 'Lead', { currency: 'EUR', value: 0, lead_source: source }, { content_name: source });
}
