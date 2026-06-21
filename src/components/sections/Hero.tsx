'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export type HeroSlideInput = {
  id: string;
  src: string;
  alt: string;
  focus: string;
  titleMain: string;
  titleAccent: string;
  subtitle: string;
};

// Static fallback used only if DB returns no active slides.
// Mirrors public/instagram/ assets shipped in the repo.
const FALLBACK_SLIDES: HeroSlideInput[] = [
  {
    id: 'fallback-1',
    src: '/instagram/ig-06.webp',
    alt: 'Sciarpe in cashmere e lana SILKinCOM con logo Lago di Como oro — dettaglio tessuto',
    focus: 'center',
    titleMain: '',
    titleAccent: '',
    subtitle: '',
  },
  {
    id: 'fallback-2',
    src: '/instagram/ig-02.webp',
    alt: 'Donna con twilly in seta SILKinCOM tra i capelli — aperitivo sul Lago di Como',
    focus: 'center',
    titleMain: '',
    titleAccent: '',
    subtitle: '',
  },
  {
    id: 'fallback-3',
    src: '/instagram/ig-01.webp',
    alt: 'Uomo con camicia lino e cappello SILKinCOM sul molo — Lago di Como',
    focus: 'center',
    titleMain: '',
    titleAccent: '',
    subtitle: '',
  },
];

const SLIDE_DURATION = 7500;
// Ken Burns max scale: kept gentle so portrait subjects (faces, busts) stay
// inside the frame for the full slide duration instead of being cropped out
// by the parallax + slideshow zoom stack. Paired with a sub-percentage X-axis
// drift so the slide reads as cinema instead of a still photograph.
const KEN_BURNS_MAX_SCALE = 1.07;
const KEN_BURNS_X_DRIFT_PX = 28; // ~1-1.5% on a 1440px canvas — readable but elegant.

// Translate the admin Focus dropdown values into CSS objectPosition pairs.
// Default "center" used to be 50%/50%, which decapitates portrait subjects
// shot from chest-up — the face sat above the visible band. We treat plain
// "center" as a face-safe center (50% 28%) and add explicit "face" / "face-
// top" options so the operator can opt-in to a tighter framing without
// relying on a heuristic.
function resolveFocus(focus: string | undefined | null): string {
  if (!focus) return '50% 28%';
  const f = focus.trim().toLowerCase();
  switch (f) {
    case 'center':
      return '50% 28%';
    case 'top':
      return '50% 0%';
    case 'bottom':
      return '50% 100%';
    case 'left':
      return '0% 50%';
    case 'right':
      return '100% 50%';
    case 'face':
    case 'viso':
      return '50% 22%';
    case 'face-top':
    case 'viso-alto':
      return '50% 12%';
    default:
      // Pass-through for raw CSS values like "30% 70%".
      return focus;
  }
}

export function Hero({ slides }: { slides?: HeroSlideInput[] }) {
  const t = useTranslations('home.hero');
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const SLIDES = useMemo(
    () => (slides && slides.length > 0 ? slides : FALLBACK_SLIDES),
    [slides]
  );

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  // Stay fully opaque while the hero is on screen, fade only in the last leg
  // as it scrolls off — otherwise on short (mobile) viewports a small scroll
  // already dimmed the editorial image ("disappears immediately").
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0]);
  // Scroll parallax tightened from 1.05 → 1.02 so the subject does not drift
  // out of frame during the user's natural scroll-down gesture.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.02]);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, [SLIDES.length]);

  const current = SLIDES[activeSlide];
  const title = current.titleMain || t('titleMain');
  const accent = current.titleAccent || t('titleAccent');
  const subtitle = current.subtitle || t('subtitle');

  return (
    <section
      ref={containerRef}
      className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-soft-black max-lg:landscape:min-h-[440px]"
    >
      <motion.div
        style={{ y, opacity, scale }}
        className="absolute inset-0 w-full h-full"
      >
        <AnimatePresence mode="sync">
          {SLIDES.map((slide, i) =>
            i === activeSlide ? (
              <motion.div
                key={`slide-${slide.id}`}
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {/* Ken Burns — alternating direction per slide so adjacent
                    slides don't drift the same way and the carousel reads
                    as cinema. Even slides drift left, odd slides drift
                    right; both ease in/out for fluidity, not linear ramps. */}
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  initial={{ scale: 1.0, x: 0 }}
                  animate={{
                    scale: KEN_BURNS_MAX_SCALE,
                    x: i % 2 === 0 ? -KEN_BURNS_X_DRIFT_PX : KEN_BURNS_X_DRIFT_PX,
                  }}
                  transition={{
                    duration: SLIDE_DURATION / 1000 + 1.6,
                    ease: [0.45, 0, 0.55, 1],
                  }}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover"
                    style={{ objectPosition: resolveFocus(slide.focus) }}
                    quality={92}
                  />
                </motion.div>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </motion.div>

      {/* Premium overlay stack — read top to bottom:
            1. vertical scrim: blacker at the top so the nav floats clean
            2. left-side scrim: text column readability without darkening
               the whole photograph
            3. cinematic vignette: edges fall off subtly, focuses the eye
            4. warm gold haze on the lower band: ties the photo to the
               brand palette without a heavy filter
            5. film-grain noise (SVG turbulence): luxury editorial finish */}
      <div className="absolute inset-0 bg-gradient-to-b from-soft-black/65 via-soft-black/10 to-soft-black/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-soft-black/70 via-soft-black/20 to-transparent pointer-events-none" />
      {/* Vignette — gently breathes (8 s loop) so the edges feel alive,
          not stamped on. Stays subtle: 0.50 ↔ 0.60. */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/* Gold haze breathes opposite direction so the warm tone shifts
          gently against the vignette — adds depth without distraction. */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none mix-blend-soft-light"
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        style={{
          background:
            'linear-gradient(to top, rgba(212,175,55,0.22) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          backgroundSize: '160px 160px',
        }}
      />

      <motion.div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/60 to-transparent z-10"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Couture-bound inner gold hairline frame — packaging-grade detail.
          Breathes subtly so the slide feels printed on warm silk, not flat. */}
      <motion.div
        className="pointer-events-none absolute inset-6 md:inset-10 border border-gold-primary/15 z-10"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-[1500px] w-full mx-auto px-6 lg:px-12">
          <div className="max-w-3xl text-warm-white" aria-live="polite">
            {/* Editorial eyebrow — hairline / monogram-style dot / label /
                trailing hairline. Echoes the typographic conventions of the
                Loro Piana & Hermès campaign mastheads. */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="flex items-center gap-4 mb-10"
            >
              <motion.span
                className="block h-px bg-gradient-to-r from-transparent via-gold-primary to-gold-primary/40 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, width: ['56px', '88px', '56px'] }}
                transition={{
                  scaleX: { duration: 1.6, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
                  width: { duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2.1 },
                }}
              />
              <motion.span
                className="block w-[5px] h-[5px] bg-gold-primary"
                aria-hidden
                animate={{ rotate: [45, 405] }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
              />
              <span className="text-[10px] uppercase tracking-[0.34em] sm:tracking-[0.46em] md:tracking-[0.56em] text-gold-primary font-medium">
                {t('eyebrow')}
              </span>
              <motion.span
                className="hidden md:block h-px bg-gradient-to-l from-transparent via-gold-primary/40 to-gold-primary/40 origin-right"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, width: ['40px', '64px', '40px'] }}
                transition={{
                  scaleX: { duration: 1.6, delay: 0.7, ease: [0.21, 0.47, 0.32, 0.98] },
                  width: { duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 },
                }}
              />
            </motion.div>

            {/* Per-slide title — full word-by-word reveal on first mount only;
                subsequent slide changes use a softer block fade so the user
                isn't visually slammed every 6.5 s. */}
            <h1
              key={`title-${activeSlide}`}
              className="font-display font-light text-[2.25rem] xs:text-[2.5rem] sm:text-5xl md:text-7xl lg:text-[88px] xl:text-[100px] leading-[1.08] tracking-[-0.015em] mb-10 md:mb-12 [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]"
            >
              {activeSlide === 0 ? (
                <>
                  <span className="block overflow-hidden pb-[0.12em]">
                    {title.split(' ').map((word, i) => (
                      <motion.span
                        key={`w1-0-${i}`}
                        initial={{ y: '110%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{
                          duration: 1.1,
                          delay: 0.3 + i * 0.08,
                          ease: [0.21, 0.47, 0.32, 0.98],
                        }}
                        className="inline-block mr-[0.25em]"
                      >
                        {word}
                      </motion.span>
                    ))}
                  </span>
                  {accent ? (
                    <span className="block overflow-hidden mt-1 pb-[0.18em]">
                      {accent.split(' ').map((word, i) => (
                        <motion.em
                          key={`w2-0-${i}`}
                          initial={{ y: '110%', opacity: 0 }}
                          animate={{ y: '0%', opacity: 1 }}
                          transition={{
                            duration: 1.1,
                            delay: 0.55 + i * 0.08,
                            ease: [0.21, 0.47, 0.32, 0.98],
                          }}
                          className="inline-block mr-[0.25em] italic font-light text-gold-primary"
                        >
                          {word}
                        </motion.em>
                      ))}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <motion.span
                    key={`t1-${activeSlide}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="block pb-[0.12em]"
                  >
                    {title}
                  </motion.span>
                  {accent ? (
                    <motion.em
                      key={`t2-${activeSlide}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.9, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
                      className="block mt-1 pb-[0.18em] italic font-light text-gold-primary"
                    >
                      {accent}
                    </motion.em>
                  ) : null}
                </>
              )}
            </h1>

            <motion.p
              key={`subtitle-${activeSlide}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: activeSlide === 0 ? 1 : 0.9,
                delay: activeSlide === 0 ? 1.0 : 0.35,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="text-sm sm:text-base md:text-lg lg:text-xl font-light text-warm-white/85 max-w-xl mb-7 md:mb-9 leading-[1.7] md:leading-[1.75] tracking-wide"
            >
              {subtitle}
            </motion.p>

            {/* Commercial offer line — fixed copy (what + where + price) shown
                on EVERY slide so the hero passes the 5-second test regardless
                of which editorial slide title is on screen. Drives the buy
                decision the poetic slide copy alone never made. */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.25, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="flex items-center gap-3 text-[11px] sm:text-xs uppercase tracking-[0.16em] text-gold-primary mb-8 md:mb-10 [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]"
            >
              <span className="block h-px w-6 bg-gold-primary/70 flex-shrink-0" />
              {t('offer')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.6, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-5"
            >
              {/* Primary CTA — ivory chip with a gold hairline frame just
                  inside the border (visible only on hover via opacity). The
                  gold sweep still rises on hover but now slides under a
                  hairline frame for a couture-bound feel. */}
              <Link
                href="/collezioni"
                className="group relative inline-flex items-center justify-center sm:justify-start gap-3 px-9 sm:px-11 py-4 sm:py-5 bg-warm-white text-soft-black text-[10.5px] uppercase tracking-[0.28em] sm:tracking-[0.32em] overflow-hidden transition-all duration-700 font-medium min-h-[48px] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]"
              >
                <span className="absolute inset-0 bg-gold-primary translate-y-[105%] group-hover:translate-y-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)]" />
                <span className="pointer-events-none absolute inset-[5px] border border-gold-primary/0 group-hover:border-gold-primary/55 transition-colors duration-700" />
                <span className="relative z-10 group-hover:text-warm-white transition-colors duration-700">
                  {t('cta')}
                </span>
                <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-1.5 group-hover:text-warm-white transition-all duration-700" />
              </Link>
              {/* Secondary CTA — hairline outline, gold flourish on hover.
                  The trailing underline grows from 0 → 28px (was 16px) so
                  the hover reads as a deliberate flourish, not a tic. */}
              <Link
                href="/la-nostra-storia"
                className="group relative inline-flex items-center justify-center sm:justify-start gap-3 px-9 sm:px-11 py-4 sm:py-5 border border-warm-white/30 text-warm-white text-[10.5px] uppercase tracking-[0.28em] sm:tracking-[0.32em] hover:border-gold-primary/80 hover:text-gold-primary transition-all duration-700 backdrop-blur-md min-h-[48px]"
              >
                <span className="pointer-events-none absolute inset-[5px] border border-gold-primary/0 group-hover:border-gold-primary/25 transition-colors duration-700" />
                <span className="relative z-10">{t('ctaSecondary')}</span>
                <span className="relative z-10 block w-0 h-px bg-gold-primary group-hover:w-7 transition-all duration-700" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Magazine-style slide counter — "01 — 03" with a row of hairlines.
          The active hairline fills with gold across the slide duration so
          progress reads at a glance without competing with the copy. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1.2 }}
        className="absolute bottom-10 right-6 lg:right-12 z-10 flex items-end gap-5"
      >
        <div className="hidden md:flex items-baseline gap-2 text-warm-white/80 tabular-nums">
          <span className="font-display text-[26px] leading-none text-gold-primary">
            {String(activeSlide + 1).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-warm-white/40">—</span>
          <span className="font-display text-[14px] leading-none text-warm-white/55">
            {String(SLIDES.length).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={`dot-${i}`}
              onClick={() => setActiveSlide(i)}
              aria-label={t('slideAria', { n: i + 1 })}
              className="group relative h-px w-10 md:w-14 bg-warm-white/20 overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-gold-primary origin-left"
                initial={{ scaleX: 0 }}
                animate={{
                  scaleX: i === activeSlide ? 1 : i < activeSlide ? 1 : 0,
                }}
                transition={{
                  duration: i === activeSlide ? SLIDE_DURATION / 1000 : 0.4,
                  ease: i === activeSlide ? 'linear' : 'easeOut',
                }}
                key={`fill-${i}-${activeSlide}`}
              />
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 1.2 }}
        className="absolute bottom-10 left-6 lg:left-12 z-10 hidden md:flex flex-col items-start gap-4 text-warm-white/60"
      >
        <span className="text-[9px] uppercase tracking-[0.5em] font-medium">
          {t('scrollLabel')}
        </span>
        <div className="w-px h-14 bg-warm-white/20 overflow-hidden relative">
          <motion.div
            className="absolute inset-x-0 top-0 h-1/3 bg-gold-primary"
            animate={{ y: ['0%', '300%'] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: [0.65, 0, 0.35, 1],
            }}
          />
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent z-10" />
    </section>
  );
}
