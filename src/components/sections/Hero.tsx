"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCollections, normLocale } from "@/data/catalog-meta";

export type HeroSlideInput = {
  id: string;
  src: string;
  alt: string;
  focus: string;
  portrait?: boolean;
  titleMain: string;
  titleAccent: string;
  subtitle: string;
  href?: string;
  ctaLabel?: string;
  offer?: string;
};

const FALLBACK_SLIDES: HeroSlideInput[] = [
  {
    id: "fallback",
    src: "/home/hero-3.webp",
    alt: "SILKinCOM · Lago di Como",
    focus: "50% 0%",
    portrait: true,
    titleMain: "",
    titleAccent: "",
    subtitle: "",
    href: "/collezioni",
  },
];
const CONTROLS = {
  it: {
    pause: "Pausa presentazione",
    play: "Riprendi presentazione",
    unavailable: "Immagine temporaneamente non disponibile",
  },
  en: {
    pause: "Pause slideshow",
    play: "Resume slideshow",
    unavailable: "Image temporarily unavailable",
  },
  es: {
    pause: "Pausar presentación",
    play: "Reanudar presentación",
    unavailable: "Imagen temporalmente no disponible",
  },
  fr: {
    pause: "Mettre le diaporama en pause",
    play: "Reprendre le diaporama",
    unavailable: "Image temporairement indisponible",
  },
  de: {
    pause: "Diashow pausieren",
    play: "Diashow fortsetzen",
    unavailable: "Bild vorübergehend nicht verfügbar",
  },
  pt: {
    pause: "Pausar apresentação",
    play: "Retomar apresentação",
    unavailable: "Imagem temporariamente indisponível",
  },
  nl: {
    pause: "Diavoorstelling pauzeren",
    play: "Diavoorstelling hervatten",
    unavailable: "Afbeelding tijdelijk niet beschikbaar",
  },
} as const;
const SLIDE_DURATION = 8500;

export function Hero({ slides }: { slides?: HeroSlideInput[] }) {
  const t = useTranslations("home.hero");
  const locale = normLocale(useLocale());
  const copy = CONTROLS[locale];
  const reducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [readyImages, setReadyImages] = useState<string[]>([]);
  const [displayedSlideId, setDisplayedSlideId] = useState<string | null>(null);
  const availableSlides = useMemo(
    () => (slides?.length ? slides : FALLBACK_SLIDES),
    [slides],
  );
  const requested = availableSlides[activeSlide % availableSlides.length];
  const displayedIndex = availableSlides.findIndex(
    (slide) => slide.id === displayedSlideId,
  );
  const index = displayedIndex < 0 ? 0 : displayedIndex;
  const current = availableSlides[index];
  const playing = !paused && !interacting && !reducedMotion && pageVisible;
  const collections = getCollections(locale);

  useEffect(() => {
    // Keep the current photograph visible until the next one can actually paint.
    if (
      readyImages.includes(requested.id) ||
      failedImages.includes(requested.id)
    ) {
      setDisplayedSlideId(requested.id);
    }
  }, [requested.id, readyImages, failedImages]);

  useEffect(() => {
    if (!slides?.length)
      console.warn(
        "[home.hero] No slides supplied; using the bundled editorial fallback.",
      );
  }, [slides]);
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (!playing || availableSlides.length < 2) return;
    const timer = setInterval(
      () => setActiveSlide((value) => (value + 1) % availableSlides.length),
      SLIDE_DURATION,
    );
    return () => clearInterval(timer);
  }, [playing, availableSlides.length]);

  const label = (slide: HeroSlideInput) => {
    if (slide.id.includes("menaggio")) return "Menaggio";
    if (slide.id.includes("brunate"))
      return collections.find((item) => item.slug === "inverno")!.shortName;
    if (slide.href?.includes("twilly")) return "Twilly";
    if (slide.href?.includes("lario")) return "Lario";
    if (slide.href?.includes("riva")) return "Riva";
    return slide.titleMain || t("cta");
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("eyebrow")}
      className="home-hero"
    >
      <div className="home-hero-media">
        {availableSlides.map((slide, i) => (
          <div
            key={slide.id}
            data-hero-image={slide.id}
            aria-hidden={i !== index}
            className="absolute inset-0"
            style={{
              opacity: i === index ? 1 : 0,
              transition: reducedMotion
                ? "none"
                : "opacity 1.6s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {failedImages.includes(slide.id) ? (
              <div
                role="status"
                className="flex h-full items-center justify-center bg-[#242923] px-8 text-center text-sm text-warm-white/80"
              >
                {copy.unavailable}
              </div>
            ) : (
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : "eager"}
                sizes="(min-width: 1024px) 54vw, 100vw"
                quality={85}
                className="object-cover"
                style={{
                  objectPosition:
                    !slide.focus || slide.focus === "center"
                      ? "50% 20%"
                      : slide.focus,
                }}
                onLoad={async (event) => {
                  const photograph = event.currentTarget;
                  try {
                    await photograph.decode();
                  } catch {
                    console.warn(
                      "[home.hero] Image decode unavailable; using the completed browser load.",
                      { slideId: slide.id },
                    );
                  }
                  setReadyImages((value) =>
                    value.includes(slide.id) ? value : [...value, slide.id],
                  );
                }}
                onError={() => {
                  console.error(
                    "[home.hero] Editorial image unavailable; showing its explicit empty state.",
                    { slideId: slide.id, src: slide.src },
                  );
                  setFailedImages((value) =>
                    value.includes(slide.id) ? value : [...value, slide.id],
                  );
                }}
              />
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/15" />
        <div
          aria-hidden="true"
          className="absolute bottom-6 left-6 right-6 flex justify-between border-t border-white/40 pt-3 text-[11px] uppercase tracking-[0.16em] text-white [text-shadow:0_1px_5px_#000] lg:bottom-10 lg:left-10 lg:right-10"
        >
          <span>Lago di Como</span>
          <span>SILKinCOM · 2026</span>
        </div>
      </div>
      <div className="home-hero-copy">
        <div className="mb-7 flex items-center gap-3 text-[10px] font-medium uppercase leading-relaxed tracking-[0.18em] text-[#d8bf89] lg:mb-9">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-current" />
          {t("eyebrow")}
        </div>
        <div
          className="grid"
          aria-live={playing ? "off" : "polite"}
          aria-atomic="true"
        >
          {availableSlides.map((slide) => {
            const visible = slide.id === current.id;
            const Heading = visible ? "h1" : "div";
            return (
              <div
                key={slide.id}
                data-hero-copy={slide.id}
                aria-hidden={!visible}
                className="col-start-1 row-start-1 min-w-0"
                style={{ visibility: visible ? "visible" : "hidden" }}
              >
                <Heading className="home-hero-title font-display font-light">
                  <span className="block">
                    {slide.titleMain || t("titleMain")}
                  </span>
                  {(slide.titleAccent || !slide.titleMain) && (
                    <em className="mt-1 block font-light text-[#d8bf89]">
                      {slide.titleAccent || t("titleAccent")}
                    </em>
                  )}
                </Heading>
                <p className="home-hero-description">
                  {slide.subtitle || t("subtitle")}
                </p>
                <p className="mt-5 max-w-md text-[11px] font-medium uppercase leading-[1.8] tracking-[0.1em] text-[#d8bf89]">
                  {slide.offer || t("offer")}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 lg:mt-9">
                  <Link
                    href={slide.href || "/collezioni"}
                    className="group inline-flex min-h-14 items-center justify-between gap-8 bg-[#f5f1e9] px-6 py-4 text-[11px] font-medium uppercase tracking-[0.13em] text-[#181b18] transition-colors hover:bg-[#d8bf89]"
                  >
                    {slide.ctaLabel || t("cta")}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.4}
                    />
                  </Link>
                  <Link
                    href="/la-nostra-storia"
                    className="inline-flex min-h-11 items-center border-b border-white/40 text-[11px] uppercase tracking-[0.12em] text-white/85 transition-colors hover:border-[#d8bf89] hover:text-[#d8bf89]"
                  >
                    {t("ctaSecondary")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="home-hero-controls"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setInteracting(false);
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3 lg:gap-5">
          {availableSlides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => {
                setActiveSlide(i);
                setPaused(true);
              }}
              aria-label={t("slideAria", { n: i + 1 })}
              aria-pressed={i === index}
              className={`group relative min-h-12 min-w-0 flex-1 border-t py-3 text-left transition-colors ${i === index ? "border-[#d8bf89] text-[#d8bf89]" : "border-white/25 text-white/55 hover:text-white"}`}
            >
              <span className="text-[11px] tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="ml-3 hidden text-[10px] uppercase tracking-[0.08em] lg:inline">
                {label(slide)}
              </span>
            </button>
          ))}
        </div>
        {availableSlides.length > 1 && (
          <button
            onClick={() => setPaused((value) => !value)}
            disabled={!!reducedMotion}
            aria-label={paused ? copy.play : copy.pause}
            aria-pressed={paused || !!reducedMotion}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-[#d8bf89] hover:text-[#d8bf89] disabled:opacity-40"
          >
            {paused || reducedMotion ? (
              <Play aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Pause aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        )}
        <Link
          href="#home-collezioni"
          aria-label={t("scrollLabel")}
          className="hidden h-12 w-12 items-center justify-center border-l border-white/20 text-white/70 transition-colors hover:text-[#d8bf89] lg:flex"
        >
          <ArrowDown aria-hidden="true" className="h-5 w-5" strokeWidth={1.3} />
        </Link>
      </div>
    </section>
  );
}
