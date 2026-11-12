"use client";
import { useId, useState } from "react";
import { ArrowUpRight, MapPin, Plus, X } from "lucide-react";
import { googleMapsRoute, googleMapsSearch } from "@/lib/experience-maps";
import styles from "./experience.module.css";
import type { ExperienceTranslator } from "@/lib/experience-i18n";
export function JourneyMapFields({
  destination,
  onPlacesChange,
  t,
}: {
  destination: string;
  onPlacesChange: () => void;
  t: ExperienceTranslator;
}) {
  const id = useId();
  const [arrivalPoint, setArrivalPoint] = useState("");
  const [hotel, setHotel] = useState("");
  const [stops, setStops] = useState<
    {
      id: number;
      value: string;
    }[]
  >([]);
  const [nextId, setNextId] = useState(0);
  const route = googleMapsRoute([
    arrivalPoint,
    hotel,
    ...stops.map((stop) => stop.value),
  ]);
  const points = [
    arrivalPoint,
    hotel,
    ...stops.map((stop) => stop.value),
  ].filter((point) => point.trim());
  function placeLink(query: string, label: string) {
    return query.trim() ? (
      <a
        href={googleMapsSearch(query)}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mapSearch}
        aria-label={t("Cerchi {value0} su Google Maps, in una nuova scheda", {
          value0: label,
        })}
      >
        {t("Verifichi su Google Maps ")}
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
    ) : null;
  }
  return (
    <details className={styles.mapPlanner}>
      <summary>
        <span>
          <MapPin size={18} aria-hidden="true" />
          {t("Arrivo, hotel e tappe su Google Maps")}
        </span>
        <Plus size={16} aria-hidden="true" />
      </summary>
      <div className={styles.mapPlannerContent}>
        <p>
          {t(
            "Indichi aeroporto o stazione, hotel e tappe desiderate. Pu\u00F2 verificarli su Google Maps prima di inviare la richiesta.",
          )}
        </p>
        <div>
          <label htmlFor={`${id}-arrival`}>
            {t("Aeroporto o stazione di arrivo (facoltativo)")}
          </label>
          <input
            id={`${id}-arrival`}
            name="arrivalPoint"
            value={arrivalPoint}
            maxLength={160}
            placeholder={t("Nome dell\u2019aeroporto o della stazione")}
            onChange={(event) => setArrivalPoint(event.target.value)}
          />
          {placeLink(arrivalPoint, t("il luogo di arrivo"))}
        </div>
        <div>
          <label htmlFor={`${id}-hotel`}>
            {t("Hotel o luogo del soggiorno (facoltativo)")}
          </label>
          <input
            id={`${id}-hotel`}
            name="hotel"
            value={hotel}
            maxLength={160}
            placeholder={t("Nome, localit\u00E0 o indirizzo dell\u2019hotel")}
            onChange={(event) => setHotel(event.target.value)}
          />
          {placeLink(hotel, t("il luogo del soggiorno"))}
        </div>
        {stops.map((stop, index) => (
          <div key={stop.id} className={styles.mapStop}>
            <label htmlFor={`${id}-stop-${stop.id}`}>
              {t("Tappa desiderata ")}
              {index + 1}
            </label>
            <div>
              <input
                id={`${id}-stop-${stop.id}`}
                name={`extraStop${index}`}
                value={stop.value}
                maxLength={160}
                placeholder={t("Villa, ristorante, circolo o altro luogo")}
                onChange={(event) =>
                  setStops((current) =>
                    current.map((item) =>
                      item.id === stop.id
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() => {
                  setStops((current) =>
                    current.filter((item) => item.id !== stop.id),
                  );
                  onPlacesChange();
                }}
                aria-label={t("Rimuova la tappa {value0}", {
                  value0: index + 1,
                })}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            {placeLink(
              stop.value,
              t("la tappa {number}", { number: index + 1 }),
            )}
          </div>
        ))}
        {stops.length < 3 && (
          <button
            type="button"
            className={styles.addMapStop}
            onClick={() => {
              setStops((current) => [...current, { id: nextId, value: "" }]);
              setNextId((current) => current + 1);
              onPlacesChange();
            }}
          >
            <Plus size={15} aria-hidden="true" />
            {t("Aggiunga una tappa")}
          </button>
        )}
        <div className={styles.mapPreview}>
          <MapPin size={28} strokeWidth={1} aria-hidden="true" />
          <div>
            <strong>{t("I luoghi del suo viaggio")}</strong>
            <p>
              {points.length
                ? t(
                    "{value0} luoghi indicati. Le tappe iniziano a dare forma al viaggio.",
                    { value0: points.length },
                  )
                : t(
                    "Indichi almeno due luoghi per vedere il percorso, oppure esplori la destinazione.",
                  )}
            </p>
          </div>
          <a
            href={
              route.url ||
              googleMapsSearch(
                points[0] ||
                  (destination === "Da scegliere insieme" ||
                  destination === "Entrambi i laghi"
                    ? "Lago di Como e Lago Maggiore"
                    : destination),
              )
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {route.url
              ? t("Apra il percorso su Google Maps")
              : t("Apra Google Maps")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        {route.error && (
          <p role="alert" className={styles.mapError}>
            {t(route.error)}
          </p>
        )}
        <p className={styles.small}>
          {t(
            "Le mappe si aprono in una nuova scheda. Il percorso stradale \u00E8 indicativo: navigazione sul lago, approdi e tempi delle visite vengono organizzati separatamente.",
          )}
        </p>
      </div>
    </details>
  );
}
