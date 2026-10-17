import winterProducts from './winter-2026-products.json';
import type { Locale } from '@/i18n/routing';

export const WINTER_PRODUCTS = winterProducts;
export const WINTER_SLUGS = WINTER_PRODUCTS.map((product) => product.slug);

export function getWinterProduct(slug: string) {
  return WINTER_PRODUCTS.find((product) => product.slug === slug);
}

export function getWinterContent(slug: string, locale: Locale) {
  return getWinterProduct(slug)?.content[locale];
}

// Care guidance defers to the garment's actual label; no unconfirmed wash
// temperature or treatment is presented as a manufacturer's instruction.
export const WINTER_CARE = {
  it: 'Seguire le indicazioni sull’etichetta interna. Arieggiare dopo l’uso e conservare il capo piegato, in un luogo asciutto.',
  en: 'Follow the instructions on the inner label. Air after wear and store folded in a dry place.',
  es: 'Siga las indicaciones de la etiqueta interior. Airee la prenda después del uso y guárdela doblada en un lugar seco.',
  fr: 'Suivez les indications de l’étiquette intérieure. Aérez après utilisation et conservez la pièce pliée dans un endroit sec.',
  de: 'Beachten Sie die Hinweise auf dem Innenetikett. Nach dem Tragen lüften und gefaltet an einem trockenen Ort aufbewahren.',
  pt: 'Siga as indicações da etiqueta interior. Areje após a utilização e guarde a peça dobrada num local seco.',
  nl: 'Volg de aanwijzingen op het binnenlabel. Laat na het dragen luchten en bewaar opgevouwen op een droge plaats.',
};

export const WINTER_AVAILABILITY = {
  cartLimit: { it: 'Quantità massima nel carrello', en: 'Maximum quantity in cart', es: 'Cantidad máxima en el carrito', fr: 'Quantité maximale dans le panier', de: 'Maximale Menge im Warenkorb', pt: 'Quantidade máxima no carrinho', nl: 'Maximale hoeveelheid in winkelmand' },
  unavailable: { it: 'Non disponibile', en: 'Unavailable', es: 'No disponible', fr: 'Indisponible', de: 'Nicht verfügbar', pt: 'Indisponível', nl: 'Niet beschikbaar' },
  notify: { it: 'Avvisami quando disponibile', en: 'Notify me when available', es: 'Avíseme cuando esté disponible', fr: 'Me prévenir de la disponibilité', de: 'Bei Verfügbarkeit benachrichtigen', pt: 'Avise-me quando estiver disponível', nl: 'Laat mij weten wanneer beschikbaar' },
  oneSize: { it: 'Taglia unica', en: 'One size', es: 'Talla única', fr: 'Taille unique', de: 'Einheitsgröße', pt: 'Tamanho único', nl: 'Eén maat' },
};
