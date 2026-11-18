"use client";
import { ExperienceImage } from "./ExperienceImage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Bike,
  Check,
  ChefHat,
  ChevronDown,
  Compass,
  Factory,
  Flag,
  Landmark,
  Mountain,
  Palette,
  Pause,
  Play,
  Plus,
  Ship,
  ShoppingBag,
  Sparkles,
  Utensils,
  Waves,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAntibot } from "@/components/antibot/useAntibot";
import type {
  ExperienceCategory,
  ExperienceContent,
} from "@/data/experience-content";
import { createExperienceTranslator } from "@/lib/experience-i18n";
import { trackExperienceStep, trackLead } from "@/lib/analytics";
import styles from "./experience.module.css";
import photoCredits from "../../../public/experience/cards/credits.json";
import { JourneyMapFields } from "./JourneyMapFields";
import { SaveTripAccount } from "./SaveTripAccount";
import { useExperienceDraft } from "./useExperienceDraft";
import {
  tripPayloadSchema,
  savedTripSchema,
  type TripPayload,
  type SavedTripDraft,
} from "@/lib/experience-trips";
const SHARED_IMAGE_IDS = new Set([
  "boat",
  "villages",
  "gourmet",
  "tasting",
  "cooking",
  "outdoor",
  "paddle",
  "wellness",
  "go-kart",
  "jungle-park",
  "milano",
]);
function cardImage(id: string, lake: "como" | "maggiore") {
  if (id === "jet-ski") return "/experience/cards/jet-ski-user.webp";
  if (id === "golf") return "/experience/cards/golf-inland.webp";
  if (id === "silk") return "/artisans/tessitore-tessitura-como.webp";
  if (id === "golf-maggiore") return "/experience/cards/golf-maggiore.webp";
  return `/experience/cards/${id}${lake === "maggiore" && SHARED_IMAGE_IDS.has(id) ? "-maggiore" : ""}.webp`;
}
const ICONS: Record<string, LucideIcon> = {
  ship: Ship,
  landmark: Landmark,
  mountain: Mountain,
  compass: Compass,
  utensils: Utensils,
  wine: Wine,
  chef: ChefHat,
  factory: Factory,
  palette: Palette,
  bag: ShoppingBag,
  flag: Flag,
  bike: Bike,
  waves: Waves,
  sparkles: Sparkles,
};
function displayDate(value: string, fallback: string, locale: string) {
  return value
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Rome",
      }).format(new Date(`${value}T12:00:00Z`))
    : fallback;
}
const EXPERIENCE_SOURCES: Record<
  string,
  {
    label: string;
    url: string;
  }
> = {
  islands: {
    label: "Aperture e informazioni di Terre Borromeo",
    url: "https://terreborromeo.it/",
  },
  caterina: {
    label: "Informazioni dell’Eremo di Santa Caterina del Sasso",
    url: "https://www.eremosantacaterina.it/useful-info.html",
  },
  "golf-maggiore": {
    label: "Informazioni del Golf Des Iles Borromées",
    url: "https://www.golfdesilesborromees.it/",
  },
  golf: {
    label: "Requisiti del Menaggio & Cadenabbia Golf Club",
    url: "https://www.golfclubmenaggio.com/it/giocare-a-golf",
  },
  villas: {
    label: "Informazioni di visita del FAI per Balbianello",
    url: "https://fondoambiente.it/luoghi/villa-del-balbianello/visita?lang=ita",
  },
  silk: {
    label: "Informazioni del Museo della Seta di Como",
    url: "https://www.museosetacomo.com/faq",
  },
};
type Brief = {
  savedTrip: { id: string; title: string; updated_at: string } | null;
  name: string;
  email: string;
  phone: string;
  arrivalPoint: string;
  hotel: string;
  stops: string[];
  lake: string;
  arrival: string;
  departure: string;
  guests: string;
  budget: string;
  experienceStyle: string;
  interests: string[];
  notes: string;
};
export function LakeExperience({
  preview,
  locale,
  content,
  copy,
}: {
  preview: boolean;
  locale: string;
  content: ExperienceContent;
  copy: Record<string, string>;
}) {
  const { EXPERIENCES, BOAT_PACKAGES, EXPERIENCE_CATEGORIES, LOGISTICS, FAQ } =
    content;
  const t = useMemo(
    () => createExperienceTranslator(locale, copy),
    [locale, copy],
  );
  const displayInterest = (value: string) =>
    value.startsWith("Barca · ")
      ? `${t("Barca")} · ${value.slice("Barca · ".length)}`
      : value;
  const selectionOptions = useMemo(
    () => [
      ...EXPERIENCES.map((item) => ({
        id: `activity:${item.id}`,
        value: item.title,
      })),
      ...BOAT_PACKAGES.map((item) => ({
        id: `boat:${item.id}`,
        value: `Barca · ${item.title}`,
      })),
      ...LOGISTICS.map((item) => ({
        id: `service:${item.id}`,
        value: item.title,
      })),
    ],
    [EXPERIENCES, BOAT_PACKAGES, LOGISTICS],
  );
  const {
    lake,
    setLake,
    interests,
    setInterests,
    payload,
    loadDraft,
    draftWarning,
  } = useExperienceDraft(selectionOptions);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [loadedHeroSlides, setLoadedHeroSlides] = useState<number[]>([0]);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (heroPaused || reducedMotion || !heroReady) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setHeroSlide((current) => (current + 1) % 3);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [heroPaused, reducedMotion, heroReady]);
  useEffect(() => {
    if (!heroReady || heroPaused || reducedMotion) return;
    const nextSlide = (heroSlide + 1) % 3;
    const timer = window.setTimeout(() => {
      setLoadedHeroSlides((current) =>
        current.includes(nextSlide) ? current : [...current, nextSlide],
      );
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [heroReady, heroSlide, heroPaused, reducedMotion]);
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState<ExperienceCategory>("selection");
  const [experienceLake, setExperienceLake] = useState<"como" | "maggiore">(
    "como",
  );
  useEffect(() => {
    if (lake === "Lago di Como" || lake === "Lago Maggiore") {
      setExperienceLake(lake === "Lago Maggiore" ? "maggiore" : "como");
    }
  }, [lake]);
  const [activeStep, setActiveStep] = useState(1);
  const boatChoicesRef = useRef<HTMLDetailsElement>(null);
  const trackedSteps = useRef(
    new Set<Parameters<typeof trackExperienceStep>[0]>(),
  );
  const selectedExperiences = interests.filter(
    (value) => !LOGISTICS.some((service) => service.title === value),
  );
  const boatTitle = EXPERIENCES.find((item) => item.id === "boat")!.title;
  const boatSelected = interests.some(
    (value) => value === boatTitle || value.startsWith("Barca · "),
  );
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    const update = () => {
      if (boatChoicesRef.current)
        boatChoicesRef.current.open = desktop.matches || boatSelected;
    };
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, [boatSelected]);
  useEffect(() => {
    const update = () => {
      const anchors = ["stay-details", "esperienze", "travel-details"];
      let next = 1;
      anchors.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= 230)
          next = index + 1;
      });
      setActiveStep(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const [arrival, setArrival] = useState("");
  const [savedDetails, setSavedDetails] = useState<TripPayload["details"]>();
  const [formVersion, setFormVersion] = useState(0);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [accountTrip, setAccountTrip] = useState<SavedTripDraft | null>(null);
  const [preparing, setPreparing] = useState(false);
  const updateAccountTrip = useCallback((trip: SavedTripDraft | null) => {
    setAccountTrip(trip);
    setBrief(null);
  }, []);
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const loadAccountDraft = useCallback(
    (saved: TripPayload) => {
      loadDraft(saved);
      setSavedDetails(saved.details);
      setArrival(saved.details?.arrival || "");
      setBrief(null);
      setFormVersion((current) => current + 1);
    },
    [loadDraft],
  );
  function readTripPayload(): TripPayload {
    if (!formRef.current)
      throw new Error("[experience] Travel form is unavailable for saving.");
    const data = new FormData(formRef.current);
    const value = (name: string) => String(data.get(name) || "").trim();
    return {
      ...payload,
      details: {
        arrival: value("arrival"),
        departure: value("departure"),
        guests: Number(value("guests")),
        budget: value("budget"),
        experienceStyle: value("experienceStyle") as "" | "private" | "shared",
        arrivalPoint: value("arrivalPoint"),
        hotel: value("hotel"),
        stops: [
          value("extraStop0"),
          value("extraStop1"),
          value("extraStop2"),
        ].filter(Boolean),
        notes: value("notes"),
      },
    };
  }
  const { fields, Honeypot } = useAntibot();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Rome",
  });
  const visibleExperiences = EXPERIENCES.filter(
    (item) =>
      item.id !== "boat" &&
      item.lakes.includes(experienceLake) &&
      (category === "selection" || item.category === category),
  );
  const packageLake =
    lake === "Lago di Como"
      ? "como"
      : lake === "Lago Maggiore"
        ? "maggiore"
        : undefined;
  const lakeName = experienceLake === "como" ? "Lago di Como" : "Lago Maggiore";
  const priority =
    experienceLake === "como"
      ? ["boat", "silk", "gourmet", "golf", "milano", "jet-ski"]
      : ["boat", "islands", "gourmet", "golf-maggiore", "milano", "jet-ski"];
  const orderedExperiences = [...EXPERIENCES].sort((a, b) => {
    const rank = (id: string) =>
      priority.includes(id) ? priority.indexOf(id) : priority.length;
    return rank(a.id) - rank(b.id);
  });
  const filteredExperiences = orderedExperiences.filter((item) =>
    visibleExperiences.some((visible) => visible.id === item.id),
  );
  const displayedExperiences =
    category === "selection" && !showAll
      ? filteredExperiences.slice(0, 6)
      : filteredExperiences;
  const selectionAcrossLakes = interests.some((value) => {
    const item = EXPERIENCES.find((activity) => activity.title === value);
    return item && packageLake && !item.lakes.includes(packageLake);
  });
  const brunateNotice = t(
    today <= "2026-11-27"
      ? "Avviso ATM: chiusura della funicolare Como–Brunate annunciata dal 9 al 27 novembre 2026. Verifichiamo il servizio per le date del suo viaggio."
      : "Prima di inserire la funicolare nel programma verifichiamo servizio, eventuali lavori e condizioni di accesso con il gestore.",
  );
  function invalidateBrief() {
    setBrief(null);
    setError("");
    setStatus("idle");
  }
  function trackStep(step: Parameters<typeof trackExperienceStep>[0]) {
    if (trackedSteps.current.has(step)) return;
    trackedSteps.current.add(step);
    trackExperienceStep(step);
  }
  function toggleInterest(title: string) {
    if (
      !isInterestSelected(title) &&
      !LOGISTICS.some((service) => service.title === title)
    )
      trackStep("selection");
    setInterests((current) =>
      title === boatTitle && current.some((item) => item.startsWith("Barca · "))
        ? current.filter(
            (item) => item !== boatTitle && !item.startsWith("Barca · "),
          )
        : current.includes(title)
          ? current.filter((item) => item !== title)
          : [...current, title],
    );
    setBrief(null);
    setError("");
    setStatus("idle");
  }
  function isInterestSelected(title: string) {
    return interests.includes(title) || (title === boatTitle && boatSelected);
  }
  function chooseBoatPackage(option: (typeof BOAT_PACKAGES)[number]) {
    trackStep("selection");
    const title = `Barca · ${option.title}`;
    setInterests((current) => [
      ...current.filter((item) => !item.startsWith("Barca · ")),
      title,
    ]);
    setBrief(null);
    setError("");
    setStatus("idle");
  }
  async function prepareRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preparing) return;
    const form = event.currentTarget;
    const snapshot = JSON.stringify([...new FormData(form)]);
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const next: Brief = {
      savedTrip: accountTrip
        ? {
            id: accountTrip.id,
            title: accountTrip.title,
            updated_at: accountTrip.updated_at,
          }
        : null,
      name: value("name"),
      email: value("email"),
      phone: value("phone"),
      arrivalPoint: value("arrivalPoint"),
      hotel: value("hotel"),
      stops: [
        value("extraStop0"),
        value("extraStop1"),
        value("extraStop2"),
      ].filter(Boolean),
      lake,
      arrival: value("arrival"),
      departure: value("departure"),
      guests: value("guests"),
      budget: value("budget"),
      experienceStyle:
        value("experienceStyle") === "private"
          ? t("Preferisco esperienze private")
          : value("experienceStyle") === "shared"
            ? t("Valuto anche attività condivise")
            : "",
      interests: [...interests],
      notes: value("notes"),
    };
    if (
      (next.arrival && next.arrival < today) ||
      (next.departure && next.departure < (next.arrival || today))
    ) {
      setError(
        t(
          "Controlli le date: la partenza deve seguire l’arrivo e il soggiorno non può essere nel passato.",
        ),
      );
      return;
    }
    setError("");
    setPreparing(true);
    try {
      if (accountTrip) {
        const current = tripPayloadSchema.parse(readTripPayload());
        if (
          JSON.stringify(current) !==
          JSON.stringify(tripPayloadSchema.parse(accountTrip.payload))
        ) {
          const response = await fetch("/api/experience/trips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: accountTrip.id,
              updated_at: accountTrip.updated_at,
              title: accountTrip.title,
              payload: current,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          const saved = savedTripSchema.parse(result.trip);
          updateAccountTrip(saved);
          next.savedTrip = {
            id: saved.id,
            title: saved.title,
            updated_at: saved.updated_at,
          };
        }
      }
      if (
        formRef.current !== form ||
        JSON.stringify([...new FormData(form)]) !== snapshot
      )
        throw new Error("form_changed");
      setBrief(next);
      trackStep("review");
      requestAnimationFrame(() => reviewRef.current?.focus());
    } catch (cause) {
      console.error(
        "[experience] Request preparation failed:",
        cause instanceof Error ? cause.message : cause,
      );
      setError(
        t(
          "Non è stato possibile preparare il riepilogo. Verifichi i dati e la versione del viaggio salvato, quindi riprovi.",
        ),
      );
    } finally {
      setPreparing(false);
    }
  }
  async function sendRequest() {
    if (!brief || status === "sending") return;
    if (preview) {
      console.info(
        "[experience] Submission skipped: local preview; no contact or email created.",
      );
      return;
    }
    setStatus("sending");
    setError("");
    const messaggio = [
      "SILKinCOM EXPERIENCE — Richiesta di itinerario",
      `Destinazione: ${t(brief.lake)}`,
      `Punto di arrivo: ${brief.arrivalPoint || "Da definire"}`,
      `Hotel: ${brief.hotel || "Da definire"}`,
      `Tappe richieste: ${brief.stops.join(" → ") || "Da definire"}`,
      `Arrivo: ${brief.arrival || "Da definire"}`,
      `Partenza: ${brief.departure || "Da definire"}`,
      `Ospiti: ${brief.guests}`,
      `Budget totale indicativo: ${brief.budget || "Da definire"}`,
      `Interessi: ${brief.interests.join(", ") || "Da scegliere insieme"}`,
      `Formula desiderata: ${brief.experienceStyle || "Da concordare"}`,
      `Note: ${brief.notes || "Nessuna"}`,
      "Informativa privacy presa in visione. Nessuna prenotazione o pagamento.",
    ].join("\n");
    try {
      const response = await fetch("/api/contatti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: brief.name,
          email: brief.email,
          telefono: brief.phone,
          experienceTripId: brief.savedTrip?.id,
          experienceTripVersion: brief.savedTrip?.updated_at,
          messaggio,
          ...fields(),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true)
        throw new Error(
          result.error ||
            "Invio non riuscito. Riprovi oppure scriva a info@silkincom.com.",
        );
      setStatus("success");
      trackLead("experience");
    } catch (cause) {
      console.error("[experience] Contact submission failed:", cause);
      setError(
        t("Invio non riuscito. Riprovi oppure scriva a info@silkincom.com."),
      );
      setStatus("idle");
    }
  }
  function renderExperience(item: (typeof EXPERIENCES)[number]) {
    const Icon = ICONS[item.icon];
    const selected = isInterestSelected(item.title);
    const chosenBoat = BOAT_PACKAGES.find((option) =>
      interests.includes(`Barca · ${option.title}`),
    );
    return (
      <article
        hidden={
          item.id !== "boat" &&
          !displayedExperiences.some((visible) => visible.id === item.id)
        }
        id={`experience-${item.id}`}
        key={item.id}
        className={`${styles.experienceCard} ${item.id === "boat" ? styles.boatFeatured : ""} ${selected ? styles.cardSelected : ""}`}
      >
        {item.id === "boat" && (
          <span
            id="in-barca"
            className={styles.legacyAnchor}
            aria-hidden="true"
          />
        )}
        <figure className={styles.cardImage}>
          <ExperienceImage
            src={cardImage(item.id, experienceLake)}
            loading="lazy"
            alt={item.title}
            sizes={
              item.id === "boat"
                ? "(max-width: 700px) calc(100vw - 64px), (max-width: 1100px) 34vw, 30vw"
                : "(max-width: 600px) calc(100vw - 64px), (max-width: 1100px) 30vw, 20vw"
            }
            className={styles.cardPhoto}
          />
          <figcaption className={styles.imageDisclaimer}>
            {t("Immagine illustrativa")}
          </figcaption>
        </figure>
        <div className={styles.cardTop}>
          <Icon size={23} strokeWidth={1.1} aria-hidden="true" />
          <span>
            {item.lakes.length > 1 && item.id !== "milano"
              ? t(lakeName)
              : item.location}
          </span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <dl className={styles.cardFacts}>
          <div>
            <dt>{t("Tempo suggerito")}</dt>
            <dd>{item.duration}</dd>
          </div>
          <div>
            <dt>{t("Formula")}</dt>
            <dd>{item.format}</dd>
          </div>
        </dl>
        <details className={styles.cardDetails}>
          <summary>
            {t("Da sapere ")}
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <p>{item.description}</p>
          <p>{item.detail}</p>
          {item.id === "brunate" && (
            <p className={styles.serviceNotice}>
              {brunateNotice}{" "}
              <a
                href="https://www.atm.it/en/AltriServizi/Trasporto/Pages/FunicolareComoBrunate.aspx"
                target="_blank"
                rel="noreferrer"
              >
                {t("Avviso del gestore")}
              </a>
            </p>
          )}
          {item.id === "islands" &&
            today >= "2026-11-09" &&
            today <= "2026-11-22" && (
              <p className={styles.serviceNotice}>
                {t(
                  "Terre Borromeo segnala un\u2019apertura straordinaria di Isola Bella fino al 22 novembre 2026. Aperture delle altre mete e collegamenti sono da verificare separatamente.",
                )}{" "}
                <a
                  href="https://terreborromeo.it/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Informazioni del gestore")}
                </a>
              </p>
            )}

          {item.id === "silk" && (
            <p className={styles.referenceLink}>
              <Link href="/artigiani">
                {t("Scopra la cultura artigiana SILKinCOM")}
              </Link>
            </p>
          )}
          {EXPERIENCE_SOURCES[item.id] && (
            <p className={styles.referenceLink}>
              <a
                href={EXPERIENCE_SOURCES[item.id].url}
                target="_blank"
                rel="noreferrer"
              >
                {t(EXPERIENCE_SOURCES[item.id].label)}
              </a>
            </p>
          )}
        </details>
        <label className={styles.activityChoice}>
          <input
            type="checkbox"
            name="activity"
            value={item.id}
            checked={selected}
            onChange={() => toggleInterest(item.title)}
          />
          <span>
            {selected ? t("Selezionata") : t("Scelga questa esperienza")}
          </span>
          <span className="sr-only">: {item.title}</span>
        </label>
        {item.id === "boat" && (
          <details className={styles.boatOptions} ref={boatChoicesRef}>
            <summary>
              <span>
                {chosenBoat?.title || t("Scopra le formule in barca")}
              </span>
              <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <div className={styles.boatChoices}>
              <fieldset className={styles.boatChooser}>
                <legend className="sr-only">
                  {t("La sua formula in barca")}
                </legend>
                {BOAT_PACKAGES.map((option) => (
                  <label key={option.id}>
                    <input
                      type="radio"
                      name="boatPackage"
                      value={option.id}
                      checked={chosenBoat?.id === option.id}
                      onChange={() => chooseBoatPackage(option)}
                    />
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.format}</small>
                      <span className={styles.boatPackageSummary}>
                        {option.summary}
                      </span>
                    </span>
                  </label>
                ))}
                <label>
                  <input
                    type="radio"
                    name="boatPackage"
                    value="undecided"
                    checked={selected && !chosenBoat}
                    onChange={() => {
                      trackStep("selection");
                      setInterests((current) => [
                        ...current.filter(
                          (value) =>
                            value !== item.title &&
                            !value.startsWith("Barca · "),
                        ),
                        item.title,
                      ]);
                      setBrief(null);
                      setError("");
                      setStatus("idle");
                    }}
                  />
                  <span>{t("Da scegliere insieme")}</span>
                </label>
              </fieldset>
              {chosenBoat && (
                <>
                  <p>{chosenBoat.format}</p>
                  <details className={styles.boatChoiceDetail}>
                    <summary>{t("Dettagli della formula")}</summary>
                    <p>{chosenBoat.description}</p>
                    <ul>
                      {chosenBoat.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <p>{chosenBoat.detail}</p>
                    {chosenBoat.id === "freedom" && (
                      <a
                        href="https://www.mit.gov.it/node/2658"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t(
                          "Indicazioni del Ministero sui requisiti di conduzione",
                        )}
                      </a>
                    )}
                  </details>
                </>
              )}
              <p>
                {t(
                  "Imbarcazione, personale, durata, servizi e costi sono da confermare nella proposta.",
                )}
              </p>
            </div>
          </details>
        )}
      </article>
    );
  }
  return (
    <div className={styles.page}>
      {preview && (
        <div className={styles.preview}>
          {t(
            "Anteprima Experience \u00B7 Proposta in preparazione \u00B7 Nessuna richiesta viene inviata",
          )}
        </div>
      )}
      <section
        className={`${styles.hero} ${heroPaused ? styles.heroPaused : ""}`}
        aria-labelledby="experience-title"
      >
        {[
          {
            src: "/experience/lago-di-como.webp",
            alt: t(
              "Varenna sul Lago di Como, tra le case sul lungolago e le montagne",
            ),
          },
          {
            src: "/experience/lago-maggiore.webp",
            alt: t("Isola Bella sul Lago Maggiore"),
          },
          {
            src: "/experience/como-stadio-sinigaglia.webp",
            alt: t(
              "Lo stadio Giuseppe Sinigaglia e il Lago di Como, visti dal Monte Croce",
            ),
          },
        ].map((image, index) => (
          <div
            key={image.src}
            className={`${styles.heroSlide} ${index === 2 ? styles.heroSlideStadium : ""} ${heroSlide === index ? styles.heroSlideActive : ""}`}
            aria-hidden={heroSlide !== index}
          >
            {(loadedHeroSlides.includes(index) || heroSlide === index) && (
              <ExperienceImage
                src={image.src}
                alt={heroSlide === index ? image.alt : ""}
                priority={index === 0}
                sizes="100vw"
                className={styles.heroImage}
                onLoad={index === 0 ? () => setHeroReady(true) : undefined}
              />
            )}
          </div>
        ))}
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <nav
            className={styles.breadcrumb}
            aria-label={t("Percorso di navigazione")}
          >
            <Link href="/">{t("SILKinCOM")}</Link>
            <span aria-hidden="true">{t("/")}</span>
            <span aria-current="page">{t("Experience")}</span>
          </nav>
          <p className={styles.eyebrow}>
            {t("SILKinCOM Experience \u00B7 Ospitalit\u00E0 e territorio")}
          </p>
          <h1 id="experience-title">
            <span>{t("Lago di Como.")}</span>
            <span>{t("Lago Maggiore.")}</span>
            <em>{t("Il suo viaggio.")}</em>
          </h1>
          <p className={styles.heroIntro}>
            {t(
              "Barca privata, ville, golf e seta di Como. Un unico referente per esperienze e trasferimenti da aeroporto o stazione.",
            )}
          </p>
          <div className={styles.heroActions}>
            <a
              href="#experience-form"
              className={styles.lightButton}
              onClick={() => trackStep("start")}
            >
              {t("Crei la sua Experience")}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#esperienze" className={styles.heroSecondary}>
              {t("Scopra le esperienze")}{" "}
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.heroPromise}>
            {t(
              "Disponibilità e costi prima della conferma. Nessun pagamento per inviare la richiesta.",
            )}
          </p>
        </div>
        <div className={styles.heroBottom}>
          <span>
            {heroSlide === 2
              ? t("Como · Stadio Giuseppe Sinigaglia")
              : heroSlide === 0
                ? t("Lago di Como")
                : t("Lago Maggiore")}
          </span>
          <div
            className={styles.heroControls}
            role="group"
            aria-label={t("Immagini dei due laghi")}
          >
            {[
              t("Lago di Como"),
              t("Lago Maggiore"),
              t("Como · Stadio Giuseppe Sinigaglia"),
            ].map((name, index) => (
              <button
                type="button"
                key={name}
                aria-label={name}
                aria-pressed={heroSlide === index}
                onClick={() => {
                  setHeroSlide(index);
                  setHeroPaused(true);
                }}
              >
                <span aria-hidden="true">0{index + 1}</span>
              </button>
            ))}
            {!reducedMotion && (
              <button
                type="button"
                aria-label={
                  heroPaused
                    ? t("Riprendi le immagini")
                    : t("Metti in pausa le immagini")
                }
                onClick={() => setHeroPaused((current) => !current)}
              >
                {heroPaused ? (
                  <Play size={15} aria-hidden="true" />
                ) : (
                  <Pause size={15} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      <section
        id="richiesta"
        className={`${styles.section} ${styles.unifiedRequest}`}
        aria-labelledby="request-title"
      >
        <header className={styles.unifiedHeading}>
          <p className={styles.eyebrow}>
            {t("SILKinCOM · Experience su misura")}
          </p>
          <h2 id="request-title">
            {t("La sua esperienza, ")}
            <em>{t("su misura.")}</em>
          </h2>
          <p>
            {t(
              "Scelga il lago e le esperienze. Verifichiamo disponibilità e organizzazione, poi le presentiamo una proposta con servizi inclusi, costi e condizioni.",
            )}
          </p>
        </header>
        <form
          id="experience-form"
          aria-labelledby="request-title"
          tabIndex={-1}
          ref={formRef}
          onSubmit={prepareRequest}
          onFocus={() => trackStep("start")}
          onChange={invalidateBrief}
          onInvalidCapture={(event) => {
            (event.target as HTMLElement)
              .closest("details")
              ?.setAttribute("open", "");
          }}
          className={`${styles.form} ${styles.unifiedForm}`}
        >
          <Honeypot />
          <nav
            className={styles.formSteps}
            aria-label={t("Sezioni del modulo Experience")}
          >
            <a
              href="#stay-details"
              aria-current={activeStep === 1 ? "step" : undefined}
            >
              <span>01</span>
              {t("Lago e periodo")}
            </a>
            <a
              href="#esperienze"
              aria-current={activeStep === 2 ? "step" : undefined}
            >
              <span>02</span>
              {t("Esperienze")}
            </a>
            <a
              href="#travel-details"
              aria-current={activeStep === 3 ? "step" : undefined}
              onClick={() => trackStep("contacts")}
            >
              <span>03</span>
              {t("Recapiti")}
            </a>
          </nav>
          {draftWarning && (
            <p role="alert" className={styles.selectionNotice}>
              {t(
                "Le scelte non possono essere conservate in questa scheda. Può comunque compilare il modulo oppure salvarle nel suo account.",
              )}
            </p>
          )}
          <div className={styles.unifiedStep}>
            <div id="stay-details" className={styles.formSectionTitle}>
              <span>01</span>
              <div>
                <h3>{t("Lago, ospiti e periodo")}</h3>
                <p>
                  {t(
                    "Può lasciare le date aperte. I campi con * sono necessari.",
                  )}
                </p>
              </div>
            </div>
            <div className={styles.formRow}>
              <label>
                {t("La sua destinazione")}
                <select
                  name="lake"
                  value={lake}
                  onChange={(event) => {
                    setLake(event.target.value);
                    if (
                      event.target.value === "Lago Maggiore" ||
                      event.target.value === "Lago di Como"
                    ) {
                      setExperienceLake(
                        event.target.value === "Lago Maggiore"
                          ? "maggiore"
                          : "como",
                      );
                      setCategory("selection");
                      setShowAll(false);
                    }
                  }}
                >
                  <option value="Da scegliere insieme">
                    {t("Da scegliere insieme")}
                  </option>
                  <option value="Lago di Como">{t("Lago di Como")}</option>
                  <option value="Lago Maggiore">{t("Lago Maggiore")}</option>
                  <option value="Entrambi i laghi">
                    {t("Entrambi i laghi")}
                  </option>
                </select>
              </label>
              <label>
                {t("Numero di ospiti *")}
                <input
                  key={`guests-${formVersion}`}
                  name="guests"
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={savedDetails?.guests || 2}
                  required
                />
              </label>
            </div>
            <div className={styles.formRow}>
              <label>
                {t("Arrivo indicativo")}
                <input
                  name="arrival"
                  type="date"
                  min={today}
                  value={arrival}
                  onChange={(event) => setArrival(event.target.value)}
                />
              </label>
              <label>
                {t("Partenza indicativa")}
                <input
                  key={`departure-${formVersion}`}
                  name="departure"
                  type="date"
                  min={arrival || today}
                  defaultValue={savedDetails?.departure || ""}
                />
              </label>
            </div>
            <p className={styles.destinationContext}>
              {packageLake === "como"
                ? t(
                    "Lago di Como: ville e borghi del Lario, tradizione della seta e attività nell’entroterra comasco.",
                  )
                : packageLake === "maggiore"
                  ? t(
                      "Lago Maggiore: Stresa, Isole Borromee, giardini del Verbano e attività nel Vergante.",
                    )
                  : t(
                      "Lago di Como e Lago Maggiore sono destinazioni distinte. Scegliamo insieme le tappe e valutiamo gli spostamenti in base al tempo disponibile.",
                    )}
            </p>
            <a
              href="#esperienze"
              className={`${styles.darkButton} ${styles.stepAction}`}
            >
              {t("Scopra le esperienze")}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div id="esperienze" className={styles.unifiedStep} tabIndex={-1}>
            <span
              id="percorsi"
              className={styles.legacyAnchor}
              aria-hidden="true"
            />
            <div className={styles.formSectionTitle}>
              <span>02</span>
              <div>
                <h3 id="package-choices-title">
                  {t("Le esperienze che desidera vivere")}
                </h3>
                <p>
                  {t(
                    "Selezioni le attività da inserire nella sua proposta. Può modificarle in qualsiasi momento; la richiesta non comporta prenotazioni.",
                  )}
                </p>
              </div>
            </div>
            {!packageLake && (
              <div
                id="destinazioni"
                className={styles.lakeTabs}
                role="group"
                aria-label={t("Visualizzi le proposte di")}
              >
                <span>{t("Visualizzi le proposte di")}</span>
                {(["como", "maggiore"] as const).map((destination) => (
                  <button
                    key={destination}
                    type="button"
                    aria-pressed={experienceLake === destination}
                    onClick={() => {
                      setExperienceLake(destination);
                      setCategory("selection");
                      setShowAll(false);
                    }}
                  >
                    {t(
                      destination === "como" ? "Lago di Como" : "Lago Maggiore",
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.activitiesLayout}>
              <aside
                className={styles.boatAside}
                aria-label={t("L’esperienza in barca")}
              >
                {renderExperience(
                  EXPERIENCES.find((item) => item.id === "boat")!,
                )}
              </aside>
              <div className={styles.activityCatalogue}>
                <div
                  className={styles.filters}
                  role="group"
                  aria-label={t("Filtra le esperienze per interesse")}
                >
                  {EXPERIENCE_CATEGORIES.filter(
                    (group) =>
                      group.id === "selection" ||
                      EXPERIENCES.some(
                        (item) =>
                          item.lakes.includes(experienceLake) &&
                          item.category === group.id,
                      ),
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={category === item.id}
                      aria-controls="experience-results"
                      onClick={() => setCategory(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className={styles.resultsHeading}>
                  <p>
                    {
                      EXPERIENCE_CATEGORIES.find((item) => item.id === category)
                        ?.description
                    }
                  </p>
                  <span role="status">
                    {t(lakeName)}
                    {t(" \u00B7 ")}
                    {displayedExperiences.length < visibleExperiences.length
                      ? t("{shown} di {total}", {
                          shown: displayedExperiences.length,
                          total: visibleExperiences.length,
                        })
                      : visibleExperiences.length}{" "}
                    {visibleExperiences.length === 1
                      ? t("proposta")
                      : t("proposte")}
                    {" · "}
                    {t("selezionate")}:{" "}
                    {
                      interests.filter(
                        (value) =>
                          !LOGISTICS.some((service) => service.title === value),
                      ).length
                    }
                  </span>
                </div>
                <p className={styles.planningNote}>
                  {t(
                    "Tempi suggeriti per costruire il programma. Durata effettiva, formula e disponibilità vengono definite nella proposta.",
                  )}
                </p>
                {selectionAcrossLakes && (
                  <p className={styles.selectionNotice}>
                    {t(
                      "La sua selezione comprende anche attività dell’altro lago. Le organizzeremo in programmi distinti, con gli spostamenti necessari da valutare.",
                    )}
                  </p>
                )}
                <div id="experience-results" className={styles.experienceGrid}>
                  {orderedExperiences
                    .filter((item) => item.id !== "boat")
                    .map(renderExperience)}
                </div>
                {category === "selection" && filteredExperiences.length > 6 && (
                  <div className={styles.catalogueMore}>
                    <button
                      type="button"
                      aria-controls="experience-results"
                      aria-expanded={showAll}
                      onClick={() => {
                        setShowAll((current) => !current);
                        if (showAll)
                          requestAnimationFrame(() =>
                            document
                              .getElementById("esperienze")
                              ?.scrollIntoView({
                                behavior: reducedMotion ? "instant" : "smooth",
                              }),
                          );
                      }}
                    >
                      {showAll
                        ? t("Mostri meno esperienze")
                        : t("Mostri tutte le {count} esperienze", {
                            count: filteredExperiences.length,
                          })}
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <details className={styles.preferenceDetails}>
              <summary>
                {t("Quale formula preferisce per le attività?")}
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <fieldset className={styles.experiencePreference}>
                <legend className="sr-only">
                  {t("Quale formula preferisce per le attività?")}
                </legend>
                <p>
                  {t(
                    "Le attività private sono riservate al suo gruppo; quelle condivise prevedono anche altri partecipanti. È una preferenza da valutare nella proposta. La formula in barca si sceglie nella scheda dedicata.",
                  )}
                </p>
                <div className={styles.preferenceGrid}>
                  {[
                    {
                      value: "private",
                      title: "Preferisco esperienze private",
                      description:
                        "Attività riservate al suo gruppo, secondo disponibilità.",
                    },
                    {
                      value: "shared",
                      title: "Valuto anche attività condivise",
                      description:
                        "Possiamo proporle attività insieme ad altri ospiti.",
                    },
                    {
                      value: "",
                      title: "Da concordare insieme",
                      description:
                        "La aiutiamo a scegliere la formula più adatta.",
                    },
                  ].map((choice) => (
                    <label key={`${formVersion}-${choice.value}`}>
                      <input
                        type="radio"
                        name="experienceStyle"
                        value={choice.value}
                        defaultChecked={
                          (savedDetails?.experienceStyle || "") === choice.value
                        }
                      />
                      <span>
                        <strong>{t(choice.title)}</strong>
                        <small>{t(choice.description)}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </details>
            <section
              className={styles.selectionSummary}
              aria-labelledby="selection-summary-title"
            >
              <h3 id="selection-summary-title">{t("Le sue esperienze")}</h3>
              {selectedExperiences.length ? (
                <ul className={styles.selectedActivities}>
                  {selectedExperiences.map((value) => (
                    <li key={value}>
                      <Check size={15} aria-hidden="true" />
                      <span>{displayInterest(value)}</span>
                      <button
                        type="button"
                        aria-label={t("Rimuova {experience}", {
                          experience: displayInterest(value),
                        })}
                        onClick={() => toggleInterest(value)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {t(
                    "Può proseguire e scegliere le attività con il nostro aiuto.",
                  )}
                </p>
              )}
              <div
                className={styles.selectionProgress}
                data-floating={
                  activeStep === 2 && selectedExperiences.length > 0
                }
              >
                <p aria-live="polite" aria-atomic="true">
                  {selectedExperiences.length ? (
                    <>
                      <strong>{selectedExperiences.length}</strong>{" "}
                      {selectedExperiences.length === 1
                        ? t("esperienza selezionata")
                        : t("esperienze selezionate")}
                    </>
                  ) : (
                    t("Esperienze da concordare")
                  )}
                </p>
                <a
                  href="#travel-details"
                  className={styles.darkButton}
                  onClick={() => trackStep("contacts")}
                >
                  {t("Continui ai recapiti")}
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
            </section>
          </div>
          <div
            id="travel-details"
            className={styles.unifiedStep}
            tabIndex={-1}
            onFocus={() => trackStep("contacts")}
          >
            <div className={styles.formSectionTitle}>
              <span>03</span>
              <div>
                <h3>{t("I suoi recapiti e i dettagli utili")}</h3>
                <p>
                  {t(
                    "Ci indichi come contattarla e quali servizi desidera aggiungere. Un referente coordinerà la proposta e i professionisti per le attività richieste.",
                  )}
                </p>
              </div>
            </div>
            <div className={styles.formRow}>
              <label>
                {t("Nome e cognome *")}
                <input
                  key={`name-${formVersion}`}
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t("Email *")}
                <input
                  key={`email-${formVersion}`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  maxLength={200}
                />
              </label>
            </div>
            <fieldset className={styles.choiceGroup}>
              <legend>{t("Ci occupiamo anche dei dettagli")}</legend>
              <p className={styles.categoryDescription}>
                {t(
                  "Indichi i servizi utili per arrivare, soggiornare e muoversi.",
                )}
              </p>
              <div className={styles.choiceGrid}>
                {LOGISTICS.map((interest) => (
                  <label
                    key={interest.title}
                    className={`${styles.choiceCard} ${interests.includes(interest.title) ? styles.choiceSelected : ""}`}
                  >
                    <input
                      type="checkbox"
                      aria-label={interest.title}
                      checked={interests.includes(interest.title)}
                      onChange={() => toggleInterest(interest.title)}
                    />
                    <span>
                      <strong>{interest.title}</strong>
                      <small>{interest.summary}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <JourneyMapFields
              key={`places-${formVersion}`}
              initialValues={savedDetails}
              destination={lake}
              onPlacesChange={invalidateBrief}
              t={t}
            />
            <details className={styles.formDetails}>
              <summary>
                {t("Telefono e budget (facoltativi)")}{" "}
                <Plus size={16} aria-hidden="true" />
              </summary>
              <div className={styles.formRow}>
                <label>
                  {t("Telefono")}
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                  />
                </label>
                <label>
                  {t("Budget totale indicativo (\u20AC)")}
                  <input
                    key={`budget-${formVersion}`}
                    inputMode="decimal"
                    name="budget"
                    defaultValue={savedDetails?.budget || ""}
                    type="number"
                    min="0"
                    step="any"
                    placeholder={t("Da definire")}
                  />
                </label>
              </div>
            </details>
            <label>
              {t("Desidera aggiungere una richiesta particolare?")}
              <textarea
                key={`notes-${formVersion}`}
                name="notes"
                defaultValue={savedDetails?.notes || ""}
                rows={3}
                maxLength={3000}
                placeholder={t(
                  "Un\u2019occasione speciale, una lezione di golf, l\u2019hotel gi\u00E0 scelto\u2026",
                )}
              />
            </label>

            <details className={styles.formDetails}>
              <summary>
                {t("Salvi la sua Experience nell’account (facoltativo)")}
                <Plus size={16} aria-hidden="true" />
              </summary>
              <SaveTripAccount
                payload={payload}
                active={accountTrip}
                onActiveChange={updateAccountTrip}
                getPayload={readTripPayload}
                onLoad={loadAccountDraft}
                t={t}
              />
            </details>
            <label className={styles.privacy}>
              <input name="privacy" type="checkbox" required />
              <span>
                {t("Ho letto l\u2019")}
                <Link href="/privacy-policy" target="_blank">
                  {t("informativa privacy")}
                </Link>{" "}
                {t("per la gestione della mia richiesta. *")}
              </span>
            </label>

            {!brief && (
              <div id="request-submit" className={styles.formActionBar}>
                <div>
                  <p>
                    {t(
                      "Controlli il riepilogo: troverà poi il pulsante per inviare la richiesta.",
                    )}
                  </p>
                </div>
                <button
                  type="submit"
                  className={styles.darkButton}
                  disabled={preparing}
                >
                  {preparing
                    ? t("Preparazione del riepilogo…")
                    : t("Riveda la richiesta")}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            )}
            {brief && (
              <div
                ref={reviewRef}
                tabIndex={-1}
                className={styles.review}
                aria-labelledby="review-title"
              >
                <p className={styles.eyebrow}>
                  {status === "success"
                    ? t("Richiesta ricevuta")
                    : t("La sua richiesta, in sintesi")}
                </p>
                <h3 id="review-title">
                  {status === "success"
                    ? t("Grazie, il suo viaggio inizia qui.")
                    : t("La sua proposta da costruire insieme")}
                </h3>
                <dl>
                  {brief.savedTrip && (
                    <div>
                      <dt>{t("Experience nel suo account")}</dt>
                      <dd>{brief.savedTrip.title}</dd>
                    </div>
                  )}
                  <div>
                    <dt>{t("Ospite")}</dt>
                    <dd>
                      {brief.name}
                      {t(" \u00B7 ")}
                      {brief.email}
                      {brief.phone && ` · ${brief.phone}`}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Destinazione")}</dt>
                    <dd>{t(brief.lake)}</dd>
                  </div>
                  {brief.arrivalPoint && (
                    <div>
                      <dt>{t("Aeroporto o stazione")}</dt>
                      <dd>{brief.arrivalPoint}</dd>
                    </div>
                  )}
                  {brief.hotel && (
                    <div>
                      <dt>{t("Hotel o soggiorno")}</dt>
                      <dd>{brief.hotel}</dd>
                    </div>
                  )}
                  {brief.stops.length > 0 && (
                    <div>
                      <dt>{t("Tappe richieste")}</dt>
                      <dd>{brief.stops.join(" → ")}</dd>
                    </div>
                  )}
                  <div>
                    <dt>{t("Soggiorno")}</dt>
                    <dd>
                      {displayDate(
                        brief.arrival,
                        t("Arrivo da definire"),
                        locale,
                      )}
                      {t(" \u2192")}{" "}
                      {displayDate(
                        brief.departure,
                        t("Partenza da definire"),
                        locale,
                      )}
                      {t(" \u00B7")} {brief.guests}
                      {t(" ospiti")}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Budget totale")}</dt>
                    <dd>
                      {brief.budget
                        ? new Intl.NumberFormat(locale, {
                            style: "currency",
                            currency: "EUR",
                          }).format(Number(brief.budget))
                        : t("Da definire")}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Interessi")}</dt>
                    <dd>
                      {brief.interests.map(displayInterest).join(" · ") ||
                        t("Da scegliere insieme")}
                    </dd>
                  </div>
                  {brief.experienceStyle && (
                    <div>
                      <dt>{t("Formula desiderata")}</dt>
                      <dd>{brief.experienceStyle}</dd>
                    </div>
                  )}
                  {brief.notes && (
                    <div>
                      <dt>{t("I suoi desideri")}</dt>
                      <dd>{brief.notes}</dd>
                    </div>
                  )}
                </dl>
                {status === "success" ? (
                  <p role="status">
                    {t(
                      "La richiesta è stata registrata. Sarà contattato all’indirizzo indicato per approfondire i dettagli.",
                    )}
                  </p>
                ) : (
                  <>
                    <p className={styles.sendInstructions}>
                      {t(
                        "Il modulo invia la richiesta direttamente a SILKinCOM. Non crea una prenotazione e non richiede pagamenti.",
                      )}
                    </p>
                    <button
                      type="button"
                      className={styles.darkButton}
                      disabled={status === "sending" || preview}
                      aria-describedby={
                        preview ? "preview-send-explanation" : undefined
                      }
                      onClick={sendRequest}
                    >
                      {status === "sending"
                        ? t("Invio in corso…")
                        : t("Invii la richiesta")}
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                    {preview && (
                      <p
                        id="preview-send-explanation"
                        className={styles.previewNotice}
                      >
                        {t(
                          "Anteprima locale: il pulsante di invio è mostrato per verifica; da questa pagina non vengono inviate richieste.",
                        )}
                      </p>
                    )}
                  </>
                )}
                {status !== "success" && (
                  <button
                    className={styles.editButton}
                    type="button"
                    disabled={status === "sending"}
                    onClick={() => {
                      setBrief(null);
                      setError("");
                      formRef.current
                        ?.querySelector<HTMLInputElement>('input[name="name"]')
                        ?.focus();
                    }}
                  >
                    {t("Modifichi i dati")}
                  </button>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
          </div>
        </form>
      </section>

      <section
        id="organizzazione"
        className={`${styles.section} ${styles.faq}`}
        aria-labelledby="faq-title"
      >
        <div>
          <p className={styles.eyebrow}>{t("Prima di partire")}</p>
          <h2 id="faq-title">
            {t("Organizzare le esperienze: ")}
            <em>{t("le risposte.")}</em>
          </h2>
          <a
            href="#experience-form"
            className={`${styles.darkButton} ${styles.faqAction}`}
            onClick={() => trackStep("start")}
          >
            {t("Crei la sua Experience")}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div>
          {FAQ.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">{t("+")}</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <div className={styles.credits}>
        <p>
          {t(
            "Le immagini delle attività sono a scopo illustrativo e non identificano operatori o strutture già convenzionati. Strutture, mezzi e servizi effettivi vengono precisati nella proposta.",
          )}
        </p>
        <details className={styles.photoCredits}>
          <summary>{t("Crediti fotografici e licenze")}</summary>
          {photoCredits.map((photo) => (
            <span key={photo.id}>
              <a href={photo.source} target="_blank" rel="noreferrer">
                {photo.title.replace("File:", "")} · {photo.author}
              </a>
              {" ("}
              <a href={photo.licenseUrl}>{photo.license}</a>
              {") · "}
            </span>
          ))}
          <span>
            <a
              href="https://commons.wikimedia.org/wiki/File:Stadium_Giuseppe_Sinigaglia_seen_from_Monte_Croce.jpg"
              target="_blank"
              rel="noreferrer"
            >
              {t("Como · Stadio Giuseppe Sinigaglia")} · Kaitu / Wikimedia
              Commons
            </a>
            {" ("}
            <a href="https://creativecommons.org/publicdomain/zero/1.0/">
              CC0 1.0
            </a>
            {") · "}
          </span>
          {t("Fotografie:")}{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Varenna_-_View_from_Lake_Como.jpg"
            target="_blank"
            rel="noreferrer"
          >
            {t("Varenna, Xavier Car\u00E9 / Wikimedia Commons")}
          </a>{" "}
          {t("(")}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">
            {t("CC BY-SA 4.0")}
          </a>
          {t(");")}{" "}
          <a
            href="https://commons.wikimedia.org/wiki/File:Isola_Bella.jpg"
            target="_blank"
            rel="noreferrer"
          >
            {t(
              "Isola Bella, Markus Bernet, ritocco B\u00E1thoryP\u00E9ter / Wikimedia Commons",
            )}
          </a>{" "}
          {t("(")}
          <a href="https://creativecommons.org/licenses/by-sa/2.0/">
            {t("CC BY-SA 2.0")}
          </a>
          {t(
            "). Ridimensionamento, conversione WebP e ritaglio di visualizzazione; immagini derivate disponibili con le rispettive licenze.",
          )}
        </details>
      </div>
    </div>
  );
}
