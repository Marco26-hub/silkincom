"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Bike,
  Check,
  ChefHat,
  Compass,
  Factory,
  Flag,
  Landmark,
  Mail,
  MessageCircle,
  Mountain,
  Palette,
  Pause,
  Plane,
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
import styles from "./experience.module.css";
import photoCredits from "../../../public/experience/cards/credits.json";
import { JourneyMapFields } from "./JourneyMapFields";
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
  "jet-ski",
  "milano",
]);
function cardImage(id: string, lake: "como" | "maggiore") {
  if (id === "jet-ski") return "/experience/cards/jet-ski-user.webp";
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
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  lake: Waves,
  taste: Utensils,
  silk: Factory,
  active: Flag,
  city: Landmark,
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
  journey: string;
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
  const {
    EXPERIENCES,
    BOAT_PACKAGES,
    EXPERIENCE_CATEGORIES,
    JOURNEYS,
    LOGISTICS,
    FAQ,
  } = content;
  const t = createExperienceTranslator(locale, copy);
  const displayInterest = (value: string) =>
    value.startsWith("Barca · ")
      ? `${t("Barca")} · ${value.slice("Barca · ".length)}`
      : value;
  const [lake, setLake] = useState("Da scegliere insieme");
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (heroPaused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setHeroSlide((current) => (current + 1) % 2);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [heroPaused, reducedMotion]);
  const [journeyTitle, setJourneyTitle] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [category, setCategory] = useState<ExperienceCategory>("selection");
  const [experienceLake, setExperienceLake] = useState<"como" | "maggiore">(
    "como",
  );
  const [arrival, setArrival] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const { fields, Honeypot } = useAntibot();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Rome",
  });
  const visibleExperiences = EXPERIENCES.filter(
    (item) =>
      item.lakes.includes(experienceLake) &&
      (category === "selection" || item.category === category),
  );
  const packageLake =
    lake === "Lago di Como"
      ? "como"
      : lake === "Lago Maggiore"
        ? "maggiore"
        : undefined;
  const packageExperiences = EXPERIENCES.filter(
    (item) => !packageLake || item.lakes.includes(packageLake),
  );
  const lakeName = experienceLake === "como" ? "Lago di Como" : "Lago Maggiore";
  const contactMessage = [
    t(
      "Buongiorno SILKinCOM, desidero una proposta per un’esperienza su misura sui laghi.",
    ),
    t("Destinazione: {lake}.", { lake: t(lake) }),
    ...(journeyTitle
      ? [t("Itinerario di interesse: {journey}.", { journey: journeyTitle })]
      : []),
    ...(interests.length
      ? [
          t("Esperienze e servizi di interesse: {interests}.", {
            interests: interests.map(displayInterest).join(", "),
          }),
        ]
      : []),
    t("Vorrei concordare con voi periodo, ospiti e dettagli del soggiorno."),
  ].join("\n\n");
  const whatsappHref = `https://wa.me/393477196603?text=${encodeURIComponent(contactMessage)}`;
  const emailHref = `mailto:info@silkincom.com?subject=${encodeURIComponent(t("SILKinCOM Experience — Proposta personalizzata"))}&body=${encodeURIComponent(contactMessage)}`;
  const visibleJourneys = JOURNEYS.filter(
    (journey) => journey.lake === lakeName,
  );
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
  function toggleInterest(title: string) {
    setInterests((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title],
    );
    setBrief(null);
    setError("");
    setStatus("idle");
  }
  function chooseBoatPackage(
    option: (typeof BOAT_PACKAGES)[number],
    scrollToRequest = true,
  ) {
    const title = `Barca · ${option.title}`;
    setInterests((current) => [
      ...current.filter((item) => !item.startsWith("Barca · ")),
      title,
    ]);
    if (scrollToRequest) setLake(lakeName);
    setBrief(null);
    setError("");
    setStatus("idle");
    if (!scrollToRequest) return;
    document.getElementById("richiesta")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function chooseJourney(journey: (typeof JOURNEYS)[number]) {
    setJourneyTitle(journey.title);
    setLake(journey.lake);
    setExperienceLake(journey.lake === "Lago Maggiore" ? "maggiore" : "como");
    const titles = EXPERIENCES.filter((item) =>
      (journey.interests as readonly string[]).includes(item.id),
    ).map((item) => item.title);
    setInterests((current) => [...new Set([...current, ...titles])]);
    setBrief(null);
    setError("");
    setStatus("idle");
    document.getElementById("richiesta")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function chooseLake(value: string) {
    setLake(value);
    setExperienceLake(value === "Lago Maggiore" ? "maggiore" : "como");
    setCategory("selection");
    setJourneyTitle("");
    setBrief(null);
    document.getElementById("esperienze")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function prepareRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const next: Brief = {
      journey: journeyTitle,
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
    setBrief(next);
    requestAnimationFrame(() => reviewRef.current?.focus());
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
      `Idea di partenza: ${brief.journey || "Percorso da costruire insieme"}`,
      `Destinazione: ${t(brief.lake)}`,
      `Punto di arrivo: ${brief.arrivalPoint || "Da definire"}`,
      `Hotel: ${brief.hotel || "Da definire"}`,
      `Tappe richieste: ${brief.stops.join(" → ") || "Da definire"}`,
      `Arrivo: ${brief.arrival || "Da definire"}`,
      `Partenza: ${brief.departure || "Da definire"}`,
      `Ospiti: ${brief.guests}`,
      `Budget totale indicativo: ${brief.budget || "Da definire"}`,
      `Interessi: ${brief.interests.join(", ") || "Da scegliere insieme"}`,
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
    } catch (cause) {
      console.error("[experience] Contact submission failed:", cause);
      setError(
        t("Invio non riuscito. Riprovi oppure scriva a info@silkincom.com."),
      );
      setStatus("idle");
    }
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
        ].map((image, index) => (
          <div
            key={image.src}
            className={`${styles.heroSlide} ${heroSlide === index ? styles.heroSlideActive : ""}`}
            aria-hidden={heroSlide !== index}
          >
            <Image
              src={image.src}
              alt={heroSlide === index ? image.alt : ""}
              fill
              priority={index === 0}
              sizes="100vw"
              className={styles.heroImage}
            />
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
              "Navigazione privata, dimore storiche, golf e incontri con la seta di Como.",
            )}
            <br />
            {t(
              "Un itinerario pensato per lei, dall\u2019accoglienza alle esperienze accompagnate.",
            )}
          </p>
          <div className={styles.heroActions}>
            <a href="#experience-form" className={styles.lightButton}>
              {t("Crea la tua Experience")}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="#esperienze" className={styles.heroSecondary}>
              {t("Scopra le esperienze")}{" "}
              <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={styles.heroBottom}>
          <span>
            {heroSlide === 0 ? t("Lago di Como") : t("Lago Maggiore")}
          </span>
          <div
            className={styles.heroControls}
            role="group"
            aria-label={t("Immagini dei due laghi")}
          >
            {["Lago di Como", "Lago Maggiore"].map((name, index) => (
              <button
                type="button"
                key={name}
                aria-label={t(name)}
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

      <nav className={styles.pageNav} aria-label={t("Esplora Experience")}>
        <div className={styles.pageNavLinks}>
          <a href="#destinazioni">{t("I due laghi")}</a>
          <a href="#esperienze">{t("Le esperienze")}</a>
          <a href="#in-barca">{t("In barca")}</a>
          <a href="#percorsi">{t("Itinerari")}</a>
          <a href="#organizzazione">{t("Come funziona")}</a>
        </div>
        <a href="#experience-form" className={styles.navCreate}>
          {t("Crea la tua Experience")}
          <ArrowRight size={13} aria-hidden="true" />
        </a>
      </nav>

      <section id="il-progetto" className={`${styles.section} ${styles.intro}`}>
        <p className={styles.eyebrow}>
          {t("Un altro modo di incontrare il territorio")}
        </p>
        <div>
          <h2>
            {t("Esperienze sui laghi.")}
            <br />
            <em>{t("Scelte intorno a lei.")}</em>
          </h2>
          <p>
            {t(
              "SILKinCOM Experience nasce per far conoscere il Lago di Como e il Lago Maggiore attraverso il paesaggio, la cultura e gli incontri con il territorio. Una giornata o un soggiorno, costruiti intorno ai suoi interessi.",
            )}
          </p>
          <p>
            {t(
              "Una villa affacciata sull\u2019acqua, una tavola da scoprire, una partita a golf o un incontro con la seta di Como. Le esperienze possono intrecciarsi in un percorso personale, con accoglienza in aeroporto o in stazione e trasferimenti dal suo hotel.",
            )}
          </p>
          <p>
            {t(
              "Un referente segue l\u2019organizzazione; personale competente accompagna le singole attivit\u00E0. Il programma presenta servizi, disponibilit\u00E0 e costi prima di ogni conferma.",
            )}
          </p>
          <div className={styles.introNotes}>
            <span>{t("Un lago o entrambi")}</span>
            <span>{t("Una giornata o un soggiorno")}</span>
            <span>{t("Richiesta senza impegno")}</span>
          </div>
        </div>
      </section>

      <section
        id="destinazioni"
        className={`${styles.section} ${styles.destinations}`}
        aria-labelledby="destinations-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              {t("Prima il luogo, poi il percorso")}
            </p>
            <h2 id="destinations-title">
              {t("Due laghi, ")}
              <em>{t("due caratteri.")}</em>
            </h2>
          </div>
          <p>
            {t(
              "Partiamo dal luogo in cui desidera soggiornare. Gli spostamenti seguono il viaggio, non lo riempiono.",
            )}
          </p>
        </div>
        <div className={styles.lakes}>
          <article className={styles.lake}>
            <div className={styles.lakeImage}>
              <Image
                src="/experience/lago-di-como.webp"
                alt={t("Varenna, sulla sponda orientale del Lago di Como")}
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
            </div>
            <div className={styles.lakeText}>
              <span className={styles.number}>{t("01 / IL LARIO")}</span>
              <h3>{t("Lago di Como")}</h3>
              <p>
                {t(
                  "Le ville e i borghi di Bellagio e Varenna, Como e Brunate, una partita a golf e la cultura della seta. Da abbinare scegliendo la parte di lago pi\u00F9 adatta al suo soggiorno.",
                )}
              </p>
              <button type="button" onClick={() => chooseLake("Lago di Como")}>
                {t("Esplori il Lago di Como")}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </article>
          <article className={styles.lake}>
            <div className={styles.lakeImage}>
              <Image
                src="/experience/lago-maggiore.webp"
                alt={t(
                  "Isola Bella, nel gruppo delle Isole Borromee sul Lago Maggiore",
                )}
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
            </div>
            <div className={styles.lakeText}>
              <span className={styles.number}>{t("02 / IL VERBANO")}</span>
              <h3>{t("Lago Maggiore")}</h3>
              <p>
                {t(
                  "Stresa, le Isole Borromee e i giardini, con il tempo per una sosta gourmet o un\u2019uscita nella natura. Un soggiorno con una propria base e un proprio ritmo.",
                )}
              </p>
              <button type="button" onClick={() => chooseLake("Lago Maggiore")}>
                {t("Esplori il Lago Maggiore")}{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        id="esperienze"
        className={`${styles.section} ${styles.explore}`}
        aria-labelledby="services-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              {t("Il viaggio nasce dai suoi interessi")}
            </p>
            <h2 id="services-title">
              {t("Le esperienze, ")}
              <em>{t("da scegliere.")}</em>
            </h2>
          </div>
          <p>
            {t(
              "Selezioni le esperienze che desidera approfondire. \u00C8 una lista di desideri: nessuna attivit\u00E0 viene prenotata.",
            )}
          </p>
        </div>
        <div
          className={styles.destinationSwitch}
          role="group"
          aria-label={t("Scelga il lago delle esperienze")}
        >
          {(
            [
              {
                id: "como",
                label: "Lago di Como",
                detail: "Ville, borghi e cultura della seta",
              },
              {
                id: "maggiore",
                label: "Lago Maggiore",
                detail: "Isole, giardini e paesaggi del Verbano",
              },
            ] as const
          ).map((destination) => (
            <button
              key={destination.id}
              type="button"
              aria-label={t(destination.label)}
              aria-pressed={experienceLake === destination.id}
              onClick={() => {
                setExperienceLake(destination.id);
                setLake(
                  destination.id === "maggiore"
                    ? "Lago Maggiore"
                    : "Lago di Como",
                );
                setJourneyTitle("");
                setBrief(null);
                setCategory("selection");
              }}
            >
              <span>
                <strong>{t(destination.label)}</strong>
                <small>{t(destination.detail)}</small>
              </span>
              {experienceLake === destination.id ? (
                <Check size={19} aria-hidden="true" />
              ) : (
                <ArrowRight size={19} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
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
            {visibleExperiences.length}{" "}
            {visibleExperiences.length === 1 ? t("proposta") : t("proposte")}
            {" · "}
            {t("selezione")}: {interests.length}
          </span>
        </div>
        <div id="experience-results" className={styles.experienceGrid}>
          {EXPERIENCES.map((item) => {
            const Icon = ICONS[item.icon];
            const selected = interests.includes(item.title);
            return (
              <article
                hidden={
                  !visibleExperiences.some((visible) => visible.id === item.id)
                }
                id={`experience-${item.id}`}
                key={item.id}
                className={`${styles.experienceCard} ${selected ? styles.cardSelected : ""}`}
              >
                <div className={styles.cardImage}>
                  <Image
                    src={cardImage(item.id, experienceLake)}
                    alt={item.title}
                    fill
                    sizes="(max-width: 599px) 92vw, (max-width: 1100px) 45vw, 24vw"
                    className={styles.cardPhoto}
                  />
                </div>
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
                {item.id === "boat" && (
                  <a href="#in-barca" className={styles.boatLink}>
                    {t("Scopra le formule in barca")}{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                )}
                <details className={styles.cardDetails}>
                  <summary>
                    {t("Da sapere ")}
                    <Plus size={14} aria-hidden="true" />
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
                <button
                  type="button"
                  className={styles.selectExperience}
                  aria-pressed={selected}
                  aria-label={t("{value0} {value1}", {
                    value0: selected ? t("Rimuovi") : t("Aggiungi"),
                    value1: item.title,
                  })}
                  onClick={() => toggleInterest(item.title)}
                >
                  {selected ? t("Nella sua selezione") : t("Mi piacerebbe")}
                  {selected ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Plus size={17} aria-hidden="true" />
                  )}
                </button>
              </article>
            );
          })}
        </div>
        <div className={styles.selectionBar}>
          <p>
            {interests.length
              ? t(
                  "{value0} idee nella sua selezione. \u00C8 possibile continuare a esplorare o passare alla richiesta.",
                  { value0: interests.length },
                )
              : t(
                  "Desidera un consiglio? La proposta pu\u00F2 partire anche da una conversazione.",
                )}
          </p>
          <a href="#richiesta">
            {interests.length
              ? t("Personalizzi il suo viaggio")
              : t("Ci racconti i suoi desideri")}{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        id="in-barca"
        className={`${styles.section} ${styles.boatSection}`}
        aria-labelledby="boat-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              {t("SILKinCOM \u00B7 Lake Collection")}
            </p>
            <h2 id="boat-title">
              {t("Il lago, ")}
              <em>{t("nella sua forma pi\u00F9 personale.")}</em>
            </h2>
          </div>
          <p>
            {t(
              "Quattro formule per il Lago di Como e il Lago Maggiore. La selezione avvia una proposta su misura: imbarcazioni, personale, servizi e costi sono da confermare.",
            )}
          </p>
        </div>
        <div className={styles.boatGrid}>
          {BOAT_PACKAGES.map((option) => {
            const selected = interests.includes(`Barca · ${option.title}`);
            return (
              <article
                key={option.id}
                className={selected ? styles.boatSelected : ""}
              >
                <div className={styles.boatNumber}>
                  {option.number}
                  <Ship size={25} strokeWidth={1} aria-hidden="true" />
                </div>
                <p className={styles.eyebrow}>{option.format}</p>
                <h3>{option.title}</h3>
                <p className={styles.boatAudience}>{option.audience}</p>
                <p>{option.description}</p>
                <ul>
                  {option.features.map((feature) => (
                    <li key={feature}>
                      <Check size={14} aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <details className={styles.cardDetails}>
                  <summary>
                    {t("Dettagli della proposta")}{" "}
                    <Plus size={15} aria-hidden="true" />
                  </summary>
                  <p>{option.detail}</p>
                  {option.id === "freedom" && (
                    <p>
                      <a
                        href="https://www.mit.gov.it/node/2658"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t(
                          "Indicazioni del Ministero sui requisiti di conduzione",
                        )}
                      </a>
                    </p>
                  )}
                </details>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseBoatPackage(option)}
                >
                  {selected
                    ? t("Formula selezionata")
                    : t("Richieda questa formula")}
                  {selected ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <ArrowRight size={17} aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {t(": ")}
                    {option.title}
                  </span>
                </button>
              </article>
            );
          })}
        </div>
        <p className={styles.boatFootnote}>
          {t(
            "Durata, capienza, modello, carburante, cauzione, bevande, ingressi e trasferimenti vengono dettagliati nel preventivo. Fotografo, allestimenti e occasioni speciali possono essere valutati come servizi aggiuntivi.",
          )}
        </p>
      </section>

      {experienceLake === "como" && (
        <section className={styles.signature} aria-labelledby="signature-title">
          <div>
            <p className={styles.eyebrow}>{t("Il legame con SILKinCOM")}</p>
            <h2 id="signature-title">
              {t("Como")}
              <br />
              <em>{t("Silk Experience.")}</em>
            </h2>
            <p>
              {t(
                "La seta non \u00E8 soltanto un ricordo da portare a casa. \u00C8 una chiave per conoscere il territorio: il lavoro del telaio, la ricerca del colore, il dialogo con chi sceglie e lavora i tessuti.",
              )}
            </p>
            <Link href="/artigiani" className={styles.textLink}>
              {t("Scopra la cultura artigiana SILKinCOM")}{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.silkSteps}>
            <p>
              <span>{t("01")}</span>
              <strong>{t("Osservare")}</strong>
              {t(
                "Una visita guidata in tessitura o tintoria, con accessi concordati.",
              )}
            </p>
            <p>
              <span>{t("02")}</span>
              <strong>{t("Riconoscere")}</strong>
              {t(
                "Materiali, trame e lavorazioni raccontati attraverso il prodotto.",
              )}
            </p>
            <p>
              <span>{t("03")}</span>
              <strong>{t("Scegliere")}</strong>
              {t("Uno showroom da visitare, con acquisti sempre facoltativi.")}
            </p>
            <button type="button" onClick={() => chooseJourney(JOURNEYS[1])}>
              {t("Richieda Como Silk Experience")}{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      <section
        id="percorsi"
        className={`${styles.section} ${styles.routes}`}
        aria-labelledby="routes-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              {t("Poche tappe, un filo conduttore")}
            </p>
            <h2 id="routes-title">
              {t("Il suo itinerario, ")}
              <em>{t("un incontro dopo l\u2019altro.")}</em>
            </h2>
          </div>
          <p>
            {t(
              "Esempi di percorso da personalizzare. Durata, ordine delle tappe e costi dipendono dal soggiorno e dalle disponibilit\u00E0.",
            )}
          </p>
        </div>
        <div className={styles.routeGrid}>
          {visibleJourneys.map((journey) => (
            <article key={journey.id}>
              <div className={styles.routeNumber}>
                {journey.number}
                <span>{t(journey.lake)}</span>
              </div>
              <p className={styles.eyebrow}>{journey.subtitle}</p>
              <h3>{journey.title}</h3>
              <p>{journey.description}</p>
              <ol>
                {journey.stops.map((stop) => (
                  <li key={stop}>{stop}</li>
                ))}
              </ol>
              <button type="button" onClick={() => chooseJourney(journey)}>
                {t("Personalizzi questo percorso")}{" "}
                <ArrowRight size={17} aria-hidden="true" />
                <span className="sr-only">
                  {t(": ")}
                  {journey.title}
                </span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section
        id="organizzazione"
        className={styles.arrival}
        aria-labelledby="arrival-title"
      >
        <div className={styles.arrivalIcon}>
          <Plane size={30} strokeWidth={1} aria-hidden="true" />
          <span>{t("ARRIVI")}</span>
        </div>
        <div>
          <p className={styles.eyebrow}>
            {t("Arrivo, soggiorno, spostamenti")}
          </p>
          <h2 id="arrival-title">
            {t("Dall\u2019aeroporto o dalla stazione, ")}
            <em>{t("al suo lago.")}</em>
          </h2>
          <p>
            {t(
              "Indichi l\u2019aeroporto o la stazione di arrivo e l\u2019hotel, se gi\u00E0 scelto. Nella proposta possiamo valutare accoglienza, trasferimenti di andata e ritorno, soggiorno e noleggio auto, scegliendo prima le esperienze e poi gli spostamenti necessari.",
            )}
          </p>
        </div>
        <a href="#richiesta" className={styles.textLink}>
          {t("Organizziamo il suo arrivo ")}
          <ArrowRight size={17} aria-hidden="true" />
        </a>
      </section>

      <section
        className={`${styles.section} ${styles.journey}`}
        aria-labelledby="journey-title"
      >
        <p className={styles.eyebrow}>{t("Come nasce la proposta")}</p>
        <h2 id="journey-title">
          {t("Prima i desideri. ")}
          <em>{t("Poi i dettagli.")}</em>
        </h2>
        <ol>
          <li>
            <span>{t("01")}</span>
            <h3>{t("Condivida i suoi desideri")}</h3>
            <p>
              {t(
                "Il lago, il periodo e qualche idea. Non serve avere gi\u00E0 deciso tutto.",
              )}
            </p>
          </li>
          <li>
            <span>{t("02")}</span>
            <h3>{t("Disegniamo il percorso")}</h3>
            <p>
              {t(
                "Mettiamo in relazione tappe, tempi e disponibilit\u00E0 di strutture e operatori.",
              )}
            </p>
          </li>
          <li>
            <span>{t("03")}</span>
            <h3>{t("La proposta, nei dettagli")}</h3>
            <p>
              {t(
                "Servizi, costi e condizioni arrivano prima di ogni conferma o pagamento.",
              )}
            </p>
          </li>
        </ol>
      </section>

      <section
        id="richiesta"
        className={`${styles.section} ${styles.request}`}
        aria-labelledby="request-title"
      >
        <div className={styles.requestIntro}>
          <div className={styles.requestLead}>
            <div>
              <p className={styles.eyebrow}>
                {t("Il lago, come desidera viverlo")}
              </p>
              <h2 id="request-title">
                {t("Il suo viaggio,")}
                <br />
                <em>{t("su misura.")}</em>
              </h2>
              <p>
                {t(
                  "Un giro in barca, una villa da scoprire, una cena vista lago. Scelga ci\u00F2 che desidera vivere: costruiremo insieme un percorso che unisce le sue passioni al tempo a disposizione.",
                )}
              </p>
              <p>
                {t(
                  "Pu\u00F2 abbinare pi\u00F9 esperienze nel modulo oppure iniziare con un messaggio su WhatsApp o via email. Anche una sola idea \u00E8 un buon punto di partenza.",
                )}
              </p>
            </div>
            <figure className={styles.requestVisual}>
              <Image
                src={
                  lake === "Lago Maggiore"
                    ? "/experience/lago-maggiore.webp"
                    : "/experience/lago-di-como.webp"
                }
                alt={
                  lake === "Lago Maggiore"
                    ? t("Isola Bella sul Lago Maggiore")
                    : t("Varenna affacciata sul Lago di Como")
                }
                fill
                sizes="(max-width: 760px) 100vw, 45vw"
              />
              <figcaption>
                {lake === "Lago Maggiore"
                  ? t("Lago Maggiore \u00B7 Isola Bella")
                  : t("Lago di Como \u00B7 Varenna")}
              </figcaption>
            </figure>
          </div>
          <div
            className={styles.contactOptions}
            aria-label={t("Come richiedere la sua esperienza")}
          >
            <a href="#experience-form">
              <Compass size={20} aria-hidden="true" />
              <span>
                <strong>{t("Pacchetto personalizzato")}</strong>
                <small>
                  {t("Scelga le esperienze e ci racconti il suo viaggio.")}
                </small>
              </span>
              <ArrowDown size={16} aria-hidden="true" />
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} aria-hidden="true" />
              <span>
                <strong>{t("WhatsApp")}</strong>
                <small>
                  {t("Un messaggio per iniziare, senza compilare il modulo.")}
                </small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href={emailHref}>
              <Mail size={20} aria-hidden="true" />
              <span>
                <strong>{t("Email")}</strong>
                <small>{t("Le sue idee, con calma. info@silkincom.com")}</small>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.contactNote}>
            {t(
              "La richiesta \u00E8 senza impegno. Il pacchetto viene definito insieme, con disponibilit\u00E0 e costi prima di ogni prenotazione. WhatsApp ed email aprono una bozza con il lago e gli interessi selezionati, da completare e inviare.",
            )}
          </p>
        </div>
        <div>
          <form
            id="experience-form"
            ref={formRef}
            onSubmit={prepareRequest}
            onChange={invalidateBrief}
            onInvalidCapture={(event) => {
              (event.target as HTMLElement)
                .closest("details")
                ?.setAttribute("open", "");
            }}
            className={styles.form}
          >
            <Honeypot />
            <div className={styles.formHeading}>
              <span>
                {t("Un viaggio che prende forma, una scelta alla volta.")}
              </span>
              <p>
                {t(
                  "Destinazione, esperienze e qualche dettaglio: al resto pensiamo insieme. I campi con * sono necessari; le date possono restare aperte.",
                )}
              </p>
              <nav
                className={styles.formSteps}
                aria-label={t("Sezioni del pacchetto personalizzato")}
              >
                <a href="#stay-details">
                  <span>{t("01")}</span>
                  {t(" Soggiorno")}
                </a>
                <a href="#package-choices-title">
                  <span>{t("02")}</span>
                  {t(" Esperienze")}
                </a>
                <a href="#travel-details">
                  <span>{t("03")}</span>
                  {t(" Dettagli")}
                </a>
              </nav>
            </div>
            <div id="stay-details" className={styles.formSectionTitle}>
              <span>{t("01")}</span>
              <div>
                <h3>{t("Il suo soggiorno")}</h3>
                <p>
                  {t(
                    "Il lago, gli ospiti e il periodo in cui desidera partire.",
                  )}
                </p>
              </div>
            </div>
            <div className={styles.formRow}>
              <label>
                {t("Nome e cognome *")}
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t("Email *")}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  maxLength={200}
                />
              </label>
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
                    }
                    setJourneyTitle("");
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
                  name="guests"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="2"
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
                <input name="departure" type="date" min={arrival || today} />
              </label>
            </div>
            <div
              className={styles.chosenInterests}
              aria-label={t("Le sue esperienze selezionate")}
            >
              {interests.length ? (
                <>
                  <p>{t("Esperienze selezionate")}</p>
                  <div>
                    {interests.map((interest) => (
                      <button
                        type="button"
                        key={displayInterest(interest)}
                        onClick={() => toggleInterest(interest)}
                        aria-label={t("Rimuovi dalla richiesta: {value0}", {
                          value0: displayInterest(interest),
                        })}
                      >
                        {displayInterest(interest)}
                        <X size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <a href="#request-submit" className={styles.reviewShortcut}>
                    {t("Al riepilogo della richiesta")}{" "}
                    <ArrowDown size={14} aria-hidden="true" />
                  </a>
                </>
              ) : (
                <p>
                  {t(
                    "Nessuna esperienza selezionata: pu\u00F2 chiedere un consiglio oppure esplorare le idee qui sopra.",
                  )}
                </p>
              )}
            </div>
            <section
              className={styles.packagePicker}
              aria-labelledby="package-choices-title"
            >
              <div className={styles.formSectionTitle}>
                <span>{t("02")}</span>
                <div>
                  <h3 id="package-choices-title">
                    {t("Le esperienze che desidera")}
                  </h3>
                  <p>
                    {t(
                      "Selezioni una o pi\u00F9 proposte, anche di categorie diverse. Il percorso sar\u00E0 adattato al lago e al tempo disponibile.",
                    )}
                  </p>
                </div>
              </div>
              {EXPERIENCE_CATEGORIES.filter(
                (item) =>
                  item.id !== "selection" &&
                  packageExperiences.some(
                    (experience) => experience.category === item.id,
                  ),
              ).map((group) => (
                <fieldset key={group.id} className={styles.choiceGroup}>
                  <legend>
                    {(() => {
                      const Icon = CATEGORY_ICONS[group.id];
                      return (
                        <Icon size={20} strokeWidth={1.3} aria-hidden="true" />
                      );
                    })()}
                    {group.label}
                  </legend>
                  <p className={styles.categoryDescription}>
                    {group.description}
                  </p>
                  <div className={styles.choiceGrid}>
                    {packageExperiences
                      .filter((item) => item.category === group.id)
                      .map((item) => (
                        <label
                          key={item.id}
                          className={`${styles.choiceCard} ${interests.includes(item.title) ? styles.choiceSelected : ""}`}
                        >
                          <input
                            type="checkbox"
                            aria-label={item.title}
                            aria-describedby={`choice-${item.id}-description`}
                            checked={interests.includes(item.title)}
                            onChange={() => toggleInterest(item.title)}
                          />
                          <span>
                            <strong>{item.title}</strong>
                            {item.lakes.length === 1 && (
                              <span className={styles.choiceLocation}>
                                {item.lakes[0] === "como"
                                  ? t("Lago di Como")
                                  : t("Lago Maggiore")}
                              </span>
                            )}
                            <small id={`choice-${item.id}-description`}>
                              {item.summary}
                            </small>
                          </span>
                        </label>
                      ))}
                  </div>
                </fieldset>
              ))}
              <fieldset
                className={`${styles.choiceGroup} ${styles.boatChoices}`}
              >
                <legend>{t("Come desidera vivere il lago in barca?")}</legend>
                <p className={styles.categoryDescription}>
                  {t(
                    "In autonomia o con capitano, per un aperitivo o un\u2019intera giornata. Una formula da scegliere, senza prenotare.",
                  )}
                </p>
                <div className={styles.choiceGrid}>
                  {BOAT_PACKAGES.map((option) => (
                    <label
                      key={option.id}
                      className={`${styles.choiceCard} ${interests.includes(`Barca · ${option.title}`) ? styles.choiceSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name="boatPackage"
                        value={option.id}
                        aria-label={option.title}
                        aria-describedby={`boat-choice-${option.id}-description`}
                        checked={interests.includes(`Barca · ${option.title}`)}
                        onChange={() => chooseBoatPackage(option, false)}
                      />
                      <span>
                        <strong>{option.title}</strong>
                        <small className={styles.boatChoiceFormat}>
                          {option.format}
                        </small>
                        <small id={`boat-choice-${option.id}-description`}>
                          {option.summary}
                        </small>
                      </span>
                    </label>
                  ))}
                  <label
                    className={`${styles.choiceCard} ${styles.undecidedBoat}`}
                  >
                    <input
                      type="radio"
                      name="boatPackage"
                      value="undecided"
                      aria-label={t("Formula da scegliere insieme")}
                      checked={
                        !interests.some((item) => item.startsWith("Barca · "))
                      }
                      onChange={() => {
                        setInterests((current) =>
                          current.filter(
                            (item) => !item.startsWith("Barca · "),
                          ),
                        );
                        setBrief(null);
                      }}
                    />
                    <span>
                      <strong>{t("Preferisco un consiglio")}</strong>
                      <small>
                        {t(
                          "La formula in barca pu\u00F2 essere scelta insieme.",
                        )}
                      </small>
                    </span>
                  </label>
                </div>
              </fieldset>
            </section>
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
            <div id="travel-details" className={styles.formSectionTitle}>
              <span>{t("03")}</span>
              <div>
                <h3>{t("I dettagli che fanno la differenza")}</h3>
                <p>
                  {t(
                    "Un hotel gi\u00E0 scelto, un\u2019occasione speciale o un desiderio da condividere.",
                  )}
                </p>
              </div>
            </div>
            <JourneyMapFields
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
                    name="budget"
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
                name="notes"
                rows={3}
                maxLength={3000}
                placeholder={t(
                  "Un\u2019occasione speciale, una lezione di golf, l\u2019hotel gi\u00E0 scelto\u2026",
                )}
              />
            </label>
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
            <div id="request-submit" className={styles.formActionBar}>
              <div>
                <strong>
                  {interests.length === 1
                    ? t("Una scelta nel suo pacchetto")
                    : interests.length
                      ? t("{value0} scelte nel suo pacchetto", {
                          value0: interests.length,
                        })
                      : t(
                          "Il suo viaggio pu\u00F2 iniziare anche da un consiglio",
                        )}
                </strong>
                <p>
                  {t(
                    "Riveda i dettagli prima di inviare la richiesta. Nessun pagamento.",
                  )}
                </p>
              </div>
              <button type="submit" className={styles.darkButton}>
                {t("Riepilogo e invio ")}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            <p className={styles.small}>
              {preview
                ? t(
                    "Anteprima locale: il modulo \u00E8 consultabile, senza inviare dati.",
                  )
                : t(
                    "Nessun pagamento richiesto. Potr\u00E0 rivedere i dati prima dell\u2019invio.",
                  )}
            </p>
          </form>
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
                  : t("Il suo pacchetto, in sintesi")}
              </p>
              <h3 id="review-title">
                {status === "success"
                  ? t("Grazie, il suo viaggio inizia qui.")
                  : t("La sua proposta da costruire insieme")}
              </h3>
              <dl>
                {brief.journey && (
                  <div>
                    <dt>{t("Idea di partenza")}</dt>
                    <dd>{brief.journey}</dd>
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
                {brief.notes && (
                  <div>
                    <dt>{t("I suoi desideri")}</dt>
                    <dd>{brief.notes}</dd>
                  </div>
                )}
              </dl>
              {preview ? (
                <p className={styles.previewNotice}>
                  <Check size={18} aria-hidden="true" />
                  {t(
                    "Anteprima pronta. Nessun dato inviato: l\u2019invio sar\u00E0 attivato al lancio del servizio.",
                  )}
                </p>
              ) : status === "success" ? (
                <p role="status">
                  {t(
                    "La richiesta \u00E8 stata registrata. Sar\u00E0 contattato all\u2019indirizzo indicato per approfondire i dettagli.",
                  )}
                </p>
              ) : (
                <button
                  type="button"
                  className={styles.darkButton}
                  disabled={status === "sending"}
                  onClick={sendRequest}
                >
                  {status === "sending"
                    ? t("Invio in corso\u2026")
                    : t("Invia la richiesta")}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
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
                  {t("Modifica i dati")}
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
      </section>

      <section
        className={`${styles.section} ${styles.faq}`}
        aria-labelledby="faq-title"
      >
        <div>
          <p className={styles.eyebrow}>{t("Prima di partire")}</p>
          <h2 id="faq-title">
            {t("Organizzare le esperienze: ")}
            <em>{t("le risposte.")}</em>
          </h2>
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
            "Le immagini delle attività sono illustrative e non identificano operatori o strutture già convenzionati.",
          )}
        </p>
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
      </div>
    </div>
  );
}
