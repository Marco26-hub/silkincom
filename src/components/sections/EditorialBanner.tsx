'use client';

import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { HomeSectionLocalized } from '@/data/home-content';

const FALLBACK_BG = '/instagram/ig-07.webp';

export function EditorialBanner({ section }: { section?: HomeSectionLocalized | null }) {
  const t = useTranslations('home.editorial');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  const content = section?.content || {};
  const bg = section?.images?.[0]?.url || FALLBACK_BG;
  const eyebrow = content.eyebrow || t('eyebrow');
  const titlePlain = content.titlePlain || t('titlePlain');
  const titleAccent = content.titleAccent || t('titleAccent');
  const description = content.description || t('description');
  const cta = content.cta || t('cta');

  return (
    <section ref={ref} className="relative h-[82svh] min-h-[620px] overflow-hidden bg-[#11100e]">
      <motion.div style={{ y }} className="absolute inset-0 scale-110">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${bg}')` }}
        />
      </motion.div>

      <div className="absolute inset-0 bg-soft-black/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-soft-black/95 via-soft-black/20 to-soft-black/20" />
      <div className="absolute inset-4 border border-gold-primary/25 md:inset-8" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1500px] items-end px-8 pb-16 text-left text-warm-white sm:px-12 md:pb-24 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-5xl"
        >
          <motion.span
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            whileInView={{ opacity: 1, letterSpacing: '0.5em' }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mb-6 block text-[9px] uppercase tracking-[0.48em] text-gold-primary"
          >
            {eyebrow}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mb-8 font-display text-[3.5rem] font-light leading-[0.88] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-8xl"
          >
            {titlePlain}<br />
            <em className="italic text-gold-primary">{titleAccent}</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mb-10 max-w-xl text-sm font-light leading-[1.85] text-warm-white/70 md:text-base"
          >
            {description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link
              href="/atelier"
              className="group inline-flex items-center gap-3 border border-gold-primary/70 px-8 py-4 text-[9px] uppercase tracking-[0.32em] text-warm-white transition-all duration-500 hover:bg-gold-primary hover:text-soft-black"
            >
              {cta}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
