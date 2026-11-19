export const experienceIssuer = {
  name: "SILKinCOM",
  vat: "IT03786790133",
  address: "Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia",
  email: "info@silkincom.com",
};

export const quotePaymentMethods = {
  bank: "Bonifico bancario",
  card: "Link di pagamento con carta",
  either: "Bonifico bancario o link di pagamento con carta",
} as const;

export type QuotePaymentMethod = keyof typeof quotePaymentMethods;
const paymentPrefix = "Pagamento — Acconto del 50%";
const cardPrefix = "Link Stripe: ";

export function stripeQuoteUrl(value: string) {
  const url = value.trim();
  return /^https:\/\/buy\.stripe\.com\/(?:test_)?[a-zA-Z0-9]{8,128}$/.test(url)
    ? url
    : "";
}

export function quotePaymentTerms(
  amount: number,
  method: QuotePaymentMethod,
  locale = "it",
) {
  const advance = Math.round(amount / 2);
  const euro = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  });
  return [
    `${paymentPrefix}: ${euro.format(advance / 100)}. Saldo: ${euro.format((amount - advance) / 100)}.`,
    `Modalità: ${quotePaymentMethods[method]}.`,
    ...(method !== "card"
      ? [
          "Per il bonifico, richieda a SILKinCOM le coordinate e la causale prima di procedere.",
        ]
      : []),
    "L’acconto non sostituisce la conferma della disponibilità e della prenotazione da parte di SILKinCOM.",
  ].join("\n");
}

export function splitQuoteConditions(value: string) {
  const marker = value.lastIndexOf("\n\n" + paymentPrefix + ":");
  if (marker < 0)
    return { conditions: value, payment: "", method: null, link: "" };
  const conditions = value.slice(0, marker);
  const [payment, rawLink] = value.slice(marker + 2).split("\n" + cardPrefix);
  const methodLine = payment.split("\n")[1];
  const method = (
    Object.keys(quotePaymentMethods) as QuotePaymentMethod[]
  ).find((key) => methodLine === `Modalità: ${quotePaymentMethods[key]}.`);
  if (!method)
    return { conditions: value, payment: "", method: null, link: "" };
  return {
    conditions,
    payment,
    method,
    link: method !== "bank" ? stripeQuoteUrl(rawLink ?? "") : "",
  };
}

export function combineQuoteConditions(
  conditions: string,
  terms: string,
  link: string,
) {
  if (!terms) return conditions.trim();
  return (
    [conditions.trim(), terms].join("\n\n") +
    (link ? "\n" + cardPrefix + link : "")
  );
}
