'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';

const BG_IMG =
  'https://static.wixstatic.com/media/a34b56_4263d83ff0284639b971746bfd160b9c~mv2.jpg/v1/fill/w_2400,h_1600,al_c,q_92/file.jpg';

export function EditorialBanner() {
  const t = useTranslations('home.editorial');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="relative h-[70vh] min-h-[480px] overflow-hidden">
      {/* Parallax background */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 scale-110"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${BG_IMG}')` }}
        />
      </motion.div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-soft-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center text-center text-warm-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-3xl"
        >
          <motion.span
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            whileInView={{ opacity: 1, letterSpacing: '0.5em' }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-6"
          >
            {t('eyebrow')}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="font-display font-light text-4xl md:text-6xl lg:text-7xl leading-[1.02] mb-8 tracking-[-0.005em]"
          >
            {t('titlePlain')}<br />
            <em className="italic text-gold-primary">{t('titleAccent')}</em>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-base md:text-lg font-light text-warm-white/85 max-w-xl mx-auto mb-10 leading-[1.8]"
          >
            {t('description')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link
              href="/atelier"
              className="group inline-flex items-center gap-3 px-10 py-4 border border-warm-white text-warm-white text-[11px] uppercase tracking-[0.3em] hover:bg-warm-white hover:text-soft-black transition-all duration-500"
            >
              {t('cta')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
