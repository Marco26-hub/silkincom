'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

// Slides hero — foto reali SILKinCOM (lifestyle Lago di Como)
const SLIDES = [
  {
    src: '/instagram/ig-06.jpg',
    alt: 'Sciarpe in cashmere e lana SILKinCOM con logo gabbiano oro — dettaglio tessuto',
    focus: 'center',
  },
  {
    src: '/instagram/ig-02.jpg',
    alt: 'Donna con twilly in seta SILKinCOM tra i capelli — aperitivo sul Lago di Como',
    focus: 'center',
  },
  {
    src: '/instagram/ig-01.jpg',
    alt: 'Uomo con camicia lino e cappello SILKinCOM sul molo — Lago di Como',
    focus: 'center',
  },
];

const SLIDE_DURATION = 6500; // ms each slide

export function Hero() {
  const t = useTranslations('home.hero');
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Parallax: subtle vertical shift + opacity fade
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.4, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  // Auto-rotate slides
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((s) => (s + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, []);

  const title = t('titleMain');
  const accent = t('titleAccent');

  return (
    <section
      ref={containerRef}
      className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-soft-black"
    >
      {/* Slideshow with Ken Burns crossfade */}
      <motion.div
        style={{ y, opacity, scale }}
        className="absolute inset-0 w-full h-full"
      >
        <AnimatePresence mode="sync">
          {SLIDES.map((slide, i) =>
            i === activeSlide ? (
              <motion.div
                key={`slide-${i}`}
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  initial={{ scale: 1.0 }}
                  animate={{ scale: 1.12 }}
                  transition={{
                    duration: SLIDE_DURATION / 1000 + 1.6,
                    ease: 'linear',
                  }}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover object-center"
                    quality={92}
                  />
                </motion.div>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </motion.div>

      {/* Multi-layer cinematic gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-soft-black/55 via-soft-black/15 to-soft-black/85 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-soft-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Top gold hairline */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/60 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-24 md:items-center md:pb-0">
        <div className="max-w-[1500px] w-full mx-auto px-6 lg:px-12">
          <div className="max-w-3xl text-warm-white">
            {/* Eyebrow with hairline */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="flex items-center gap-4 mb-8"
            >
              <span className="block w-12 h-px bg-gold-primary" />
              <span className="text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.5em] text-gold-primary font-medium">
                {t('eyebrow')}
              </span>
            </motion.div>

            {/* Title — word by word reveal */}
            <h1 className="font-display font-light text-[2.85rem] sm:text-6xl md:text-7xl lg:text-[88px] xl:text-[100px] leading-[1.15] tracking-[-0.01em] mb-10">
              <span className="block overflow-hidden pb-[0.12em]">
                {title.split(' ').map((word, i) => (
                  <motion.span
                    key={`w1-${i}`}
                    initial={{ y: '110%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      duration: 1.1,
                      delay: 0.5 + i * 0.08,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                    className="inline-block mr-[0.25em]"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <span className="block overflow-hidden mt-1 pb-[0.18em]">
                {accent.split(' ').map((word, i) => (
                  <motion.em
                    key={`w2-${i}`}
                    initial={{ y: '110%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      duration: 1.1,
                      delay: 0.85 + i * 0.08,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                    className="inline-block mr-[0.25em] italic font-light text-gold-primary"
                  >
                    {word}
                  </motion.em>
                ))}
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="text-base md:text-lg lg:text-xl font-light text-warm-white/85 max-w-xl mb-12 leading-[1.75] tracking-wide"
            >
              {t('subtitle')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.6, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="flex flex-wrap gap-5"
            >
              <Link
                href="/collezioni/primavera"
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-warm-white text-soft-black text-[10.5px] uppercase tracking-[0.3em] overflow-hidden transition-all duration-700 font-medium"
              >
                <span className="absolute inset-0 bg-gold-primary translate-y-[105%] group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]" />
                <span className="relative z-10 group-hover:text-warm-white transition-colors duration-700">
                  {t('cta')}
                </span>
                <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-1.5 group-hover:text-warm-white transition-all duration-700" />
              </Link>
              <Link
                href="/la-nostra-storia"
                className="group inline-flex items-center gap-3 px-10 py-5 border border-warm-white/35 text-warm-white text-[10.5px] uppercase tracking-[0.3em] hover:border-gold-primary hover:text-gold-primary transition-all duration-700 backdrop-blur-md"
              >
                {t('ctaSecondary')}
                <span className="block w-0 h-px bg-gold-primary group-hover:w-4 transition-all duration-700" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 right-6 lg:right-12 z-10 flex items-center gap-3"
      >
        {SLIDES.map((_, i) => (
          <button
            key={`dot-${i}`}
            onClick={() => setActiveSlide(i)}
            aria-label={t('slideAria', { n: i + 1 })}
            className="group relative h-px w-12 bg-warm-white/20 overflow-hidden"
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
      </motion.div>

      {/* Scroll indicator — bottom left */}
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

      {/* Bottom gold hairline */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent z-10" />
    </section>
  );
}
