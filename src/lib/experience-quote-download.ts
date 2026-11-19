import "server-only";
import {
  experienceIssuer,
  splitQuoteConditions,
} from "@/lib/experience-payment";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { renderQuotePdf, type QuotePdfData } from "@/lib/experience-quote-pdf";
import { tripPayloadSchema } from "@/lib/experience-trips";
import { quoteItemSchema } from "@/lib/experience-admin";
import { getExperienceLocale } from "@/data/experience-localized";
import { isValidLocale } from "@/i18n/routing";
import { rateLimit } from "@/lib/rate-limit";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
// Select only the fields destined for the client from each stored line.
const publicQuoteItems = z
  .array(
    quoteItemSchema
      .pick({
        label: true,
        quantity: true,
        price_cents: true,
      })
      .strip(),
  )
  .min(1)
  .max(30);

const documentSchema = z.object({
  total_cents: z.number().int().positive(),
  currency: z.literal("EUR"),
  status: z.enum(["draft", "sent"]),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  conditions: z.string(),
  valid_until: z.string().nullable(),
  trip_updated_at: z.string(),
  published_at: z.string(),
  updated_at: z.string(),
  experience_quote_details: z.object({ items: publicQuoteItems }).nullable(),
  experience_trips: z.object({
    title: z.string(),
    updated_at: z.string(),
    payload: tripPayloadSchema,
  }),
});
export async function downloadExperienceQuote(
  request: NextRequest,
  id: string,
  admin: boolean,
) {
  const limited = rateLimit(request, 30, 60000);
  if (limited) return limited;
  function fail(status: number) {
    console.warn("[experience-quote-pdf] Download rejected:", {
      status,
      admin,
    });
    return NextResponse.json(
      { error: "PDF non disponibile" },
      { status, headers },
    );
  }
  if (!z.string().uuid().safeParse(id).success) return fail(404);
  try {
    let ownerId: string | null = null;
    if (admin) {
      const auth = await requireAdminApi();
      if (!auth.ok) return fail(auth.status);
    } else {
      const client = await createServerClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return fail(401);
      ownerId = user.id;
      const authorized = await client
        .from("experience_quotes")
        .select("id")
        .eq("id", id)
        .eq("status", "sent")
        .maybeSingle();
      if (authorized.error) throw authorized.error;
      if (!authorized.data) return fail(404);
    }
    // The private quote detail and public amount are read in one database snapshot.
    // On the customer path the service query repeats the ownership and status checks.
    const db = createServiceClient();
    let query = db
      .from("experience_quotes")
      .select(
        "total_cents,currency,status,inclusions,exclusions,conditions,valid_until,trip_updated_at,published_at,updated_at,experience_trips!inner(title,updated_at,payload),experience_quote_details(items)",
      )
      .eq("id", id);
    if (ownerId)
      query = query
        .eq("status", "sent")
        .eq("experience_trips.user_id", ownerId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return fail(404);
    const quote = documentSchema.parse(data);
    const items = quote.experience_quote_details?.items;
    if (!items) {
      console.info(
        "[experience-quote-pdf] No saved item breakdown for authorized quote.",
      );
    }
    if (
      items &&
      items.reduce((sum, item) => sum + item.quantity * item.price_cents, 0) !==
        quote.total_cents
    ) {
      throw new Error("Quote line totals do not match the saved amount");
    }
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale =
      !admin && isValidLocale(requestedLocale) ? requestedLocale : "it";
    const { t } = await getExperienceLocale(locale);
    const draft = quote.status === "draft";
    const currency = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: quote.currency,
    });
    const money = (cents: number) => currency.format(cents / 100);
    const day = new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeZone: "Europe/Rome",
    });
    const dateAndTime = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    });
    const validity = quote.valid_until
      ? t("Valido fino al {date}", {
          date: `${dateAndTime.format(new Date(quote.valid_until))} (Europe/Rome)`,
        })
      : "";
    const current = quote.trip_updated_at === quote.experience_trips.updated_at;
    const facts: NonNullable<QuotePdfData["facts"]> = [
      {
        label: draft ? t("Ultimo aggiornamento") : t("Data di emissione"),
        value: day.format(
          new Date(draft ? quote.updated_at : quote.published_at),
        ),
      },
    ];
    if (current) {
      const { lake, details } = quote.experience_trips.payload;
      facts.push({ label: t("Destinazione"), value: t(lake) });
      if (details) {
        facts.push({
          label: t("Numero di ospiti"),
          value: new Intl.NumberFormat(locale).format(details.guests),
        });
        if (details.arrival)
          facts.push({
            label: t("Arrivo indicativo"),
            value: day.format(new Date(details.arrival + "T12:00:00Z")),
          });
        if (details.departure)
          facts.push({
            label: t("Partenza indicativa"),
            value: day.format(new Date(details.departure + "T12:00:00Z")),
          });
      }
    }
    const warnings = [];
    if (!current) {
      warnings.push(
        t(
          "Questo preventivo si riferisce a una versione precedente del viaggio. Richieda una conferma dopo le modifiche.",
        ),
      );
    }
    if (quote.valid_until && Date.parse(quote.valid_until) <= Date.now())
      warnings.push(
        t(
          "La validità del preventivo è scaduta. Contattateci per una nuova conferma.",
        ),
      );
    const terms = splitQuoteConditions(quote.conditions);
    const bytes = await renderQuotePdf({
      title: quote.experience_trips.title,
      totalLabel: t("Totale del preventivo"),
      total: money(quote.total_cents),
      status: draft ? "BOZZA RISERVATA" : t("Il suo preventivo"),
      validity,
      reference: `${t("Riferimento preventivo")} · ${id}`,
      facts,
      breakdown: items
        ? {
            heading: t("Dettaglio dei servizi"),
            columns: [
              t("Servizio"),
              t("Quantità"),
              t("Prezzo unitario"),
              t("Subtotale"),
            ],
            rows: items.map((item) => ({
              service: item.label,
              quantity: new Intl.NumberFormat(locale).format(item.quantity),
              unitPrice: money(item.price_cents),
              subtotal: money(item.quantity * item.price_cents),
            })),
          }
        : undefined,
      warning: warnings.join("\n"),
      sections: [
        {
          heading: t("Servizi inclusi"),
          paragraphs: quote.inclusions.map((item) => `• ${item}`),
        },
        {
          heading: t("Extra ed esclusioni"),
          paragraphs: quote.exclusions.map((item) => `• ${item}`),
        },
        {
          heading: t("Condizioni"),
          paragraphs: [
            terms.conditions,
            ...(terms.payment ? [terms.payment] : []),
          ],
        },
        {
          heading: experienceIssuer.name,
          paragraphs: [
            experienceIssuer.address,
            `VAT · ${experienceIssuer.vat}`,
            experienceIssuer.email,
          ],
        },
      ],
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="silkincom-experience-${draft ? "bozza-" : ""}${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error(
      "[experience-quote-pdf] Generation failed:",
      error instanceof Error ? error.name : (error as { code?: string })?.code,
    );
    return fail(503);
  }
}
