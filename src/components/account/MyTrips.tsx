"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Compass, ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createExperienceTranslator } from "@/lib/experience-i18n";
import { splitQuoteConditions } from "@/lib/experience-payment";
import {
  EXPERIENCE_DRAFT_KEY,
  savedTripSchema,
  type SavedTrip,
} from "@/lib/experience-trips";
import type { ExperienceContent } from "@/data/experience-content";

export function MyTrips({
  locale,
  copy,
  content,
}: {
  locale: string;
  copy: Record<string, string>;
  content: ExperienceContent;
}) {
  const t = useMemo(
    () => createExperienceTranslator(locale, copy),
    [locale, copy],
  );
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/experience/trips", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (
        !Array.isArray(result.trips) ||
        !result.trips.every(
          (trip: SavedTrip) => savedTripSchema.safeParse(trip).success,
        )
      )
        throw new Error("invalid_saved_trip");
      setTrips(result.trips);
    } catch (error) {
      console.error("[my-trips] Load failed:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const { EXPERIENCES, BOAT_PACKAGES, LOGISTICS } = content;
  const labels = new Map<string, string>([
    ...EXPERIENCES.map((item) => [`activity:${item.id}`, item.title] as const),
    ...BOAT_PACKAGES.map(
      (item) => [`boat:${item.id}`, `${t("Barca")} · ${item.title}`] as const,
    ),
    ...LOGISTICS.map((item) => [`service:${item.id}`, item.title] as const),
  ]);
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(value),
    );
  return (
    <div className="space-y-6">
      <p className="text-sm leading-7 text-soft-black/70">
        {t(
          "I programmi salvati nel suo account. Può riaprirli, modificarli e richiedere una proposta. Salvare un viaggio non conferma alcuna prenotazione.",
        )}
      </p>
      <Link
        href="/experience#esperienze"
        onClick={() => {
          try {
            sessionStorage.removeItem(EXPERIENCE_DRAFT_KEY);
          } catch (error) {
            console.warn(
              "[my-trips] New journey could not clear the local selection:",
              error,
            );
          }
        }}
        className="inline-flex min-h-12 items-center gap-3 bg-soft-black px-5 py-3 text-sm text-warm-white hover:bg-[#31382f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-primary"
      >
        {t("Crei un nuovo viaggio")}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
      {loading ? (
        <p role="status" className="py-8 text-sm">
          {t("Caricamento dei viaggi…")}
        </p>
      ) : failed ? (
        <div
          role="alert"
          className="border border-gold-primary/40 bg-ivory p-6"
        >
          <p className="text-sm leading-7">
            {t(
              "Non è stato possibile caricare i viaggi. Riprovi tra qualche istante.",
            )}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
          >
            <RefreshCw size={16} aria-hidden="true" />
            {t("Riprovi")}
          </button>
        </div>
      ) : !trips.length ? (
        <div className="border border-pearl-grey bg-ivory p-8 text-center">
          <Compass
            className="mx-auto mb-4 text-gold-dark"
            size={32}
            aria-hidden="true"
          />
          <h2 className="font-display text-3xl mb-3">
            {t("Il suo prossimo viaggio inizia da qui.")}
          </h2>
          <p className="text-sm leading-7 text-soft-black/70">
            {t(
              "Scelga le esperienze sui laghi e utilizzi Salvi nel suo account per ritrovarle in questa pagina.",
            )}
          </p>
        </div>
      ) : (
        <ul className="grid gap-6">
          {trips.map((trip) => {
            const quote = [...trip.experience_quotes].sort((a, b) =>
              b.published_at.localeCompare(a.published_at),
            )[0];
            const quoteCurrent =
              quote && quote.trip_updated_at === trip.updated_at;
            const expired =
              !!quote?.valid_until &&
              Date.parse(quote.valid_until) < Date.now();
            const terms = splitQuoteConditions(quote?.conditions || "");
            const cardLink =
              quoteCurrent && quote?.valid_until && !expired ? terms.link : "";
            return (
              <li
                key={trip.id}
                className="border border-pearl-grey bg-ivory p-5 sm:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] uppercase tracking-[.16em] text-gold-dark">
                      {t(trip.payload.lake)}
                    </p>
                    <h2 className="break-words font-display text-3xl">
                      {trip.title}
                    </h2>
                  </div>
                  <span className="border border-gold-primary/30 px-3 py-2 text-xs">
                    {quote && quoteCurrent && !expired
                      ? t("Preventivo disponibile")
                      : t("Programma da personalizzare")}
                  </span>
                </div>
                <p className="mt-3 text-xs text-soft-black/60">
                  {t("Aggiornato il {date}", { date: date(trip.updated_at) })}
                </p>
                <ul className="my-5 flex flex-wrap gap-2">
                  {trip.payload.ids.map((id) => (
                    <li
                      key={id}
                      className="rounded-sm border border-pearl-grey px-3 py-2 text-xs leading-5"
                    >
                      {labels.get(id)}
                    </li>
                  ))}
                </ul>
                {quote ? (
                  <div className="my-5 border-y border-gold-primary/30 py-5">
                    <h3 className="text-xs uppercase tracking-[.12em]">
                      {t("Il suo preventivo")}
                    </h3>
                    <p className="mt-2 font-display text-4xl">
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: quote.currency,
                      }).format(quote.total_cents / 100)}
                    </p>
                    {!quoteCurrent && (
                      <p className="mt-3 text-sm text-soft-black/70">
                        {t(
                          "Questo preventivo si riferisce a una versione precedente del viaggio. Richieda una conferma dopo le modifiche.",
                        )}
                      </p>
                    )}
                    {expired && (
                      <p className="mt-3 text-sm text-soft-black/70">
                        {t(
                          "La validità del preventivo è scaduta. Contattateci per una nuova conferma.",
                        )}
                      </p>
                    )}
                    {quote.valid_until && (
                      <p className="mt-2 text-xs">
                        {t("Valido fino al {date}", {
                          date: date(quote.valid_until),
                        })}
                      </p>
                    )}
                    {quote.inclusions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium">
                          {t("Servizi inclusi")}
                        </h4>
                        <ul className="mt-2 list-disc pl-5 text-sm leading-7">
                          {quote.inclusions.map((text, index) => (
                            <li key={index}>{text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {quote.exclusions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium">
                          {t("Extra ed esclusioni")}
                        </h4>
                        <ul className="mt-2 list-disc pl-5 text-sm leading-7">
                          {quote.exclusions.map((text, index) => (
                            <li key={index}>{text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-soft-black/70">
                      {terms.conditions}
                    </p>
                    {terms.payment && (
                      <div className="mt-4 space-y-2 border border-pearl-grey bg-warm-white p-4">
                        <p className="whitespace-pre-line text-sm leading-6">
                          {terms.payment}
                        </p>
                        {cardLink && (
                          <a
                            href={cardLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-12 items-center gap-2 bg-soft-black px-4 text-sm text-white"
                          >
                            Stripe <ArrowRight size={15} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )}
                    <a
                      href={`/api/experience/quotes/${quote.id}/pdf?locale=${encodeURIComponent(locale)}`}
                      className="mt-4 inline-flex min-h-12 items-center border border-soft-black/30 px-4 py-2 text-sm font-medium hover:border-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-dark"
                    >
                      {t("Scarica PDF")}
                    </a>
                  </div>
                ) : (
                  <p className="my-5 text-sm leading-7 text-soft-black/70">
                    {t(
                      "Prezzo su preventivo. Gli importi appariranno qui quando SILKinCOM avrà pubblicato una proposta per questo viaggio.",
                    )}
                  </p>
                )}
                <Link
                  href={`/experience?trip=${trip.id}#richiesta`}
                  className="inline-flex min-h-12 items-center gap-3 border border-soft-black/30 px-5 py-3 text-sm hover:border-gold-dark hover:text-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-dark"
                >
                  {t("Riapra e personalizzi")}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
