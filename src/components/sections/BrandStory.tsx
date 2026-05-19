'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const IMG_MAIN =
  'https://static.wixstatic.com/media/a34b56_4263d83ff0284639b971746bfd160b9c~mv2.jpg/v1/fill/w_1400,h_1750,al_c,q_92/file.jpg';
const IMG_TILE =
  'https://static.wixstatic.com/media/b58e91_6fa8a67dc30b47898c29a53a97cf8ba9~mv2.jpg/v1/fill/w_700,h_500,al_c,q_92/file.jpg';

export function BrandStory() {
  const t = useTranslations('home.brandStory');

  return (
    <section className="py-24 md:py-section bg-ivory overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative order-2 lg:order-1"
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={IMG_MAIN}
              alt={t('imageMainAlt')}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform [transition-duration:1500ms] hover:scale-105"
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            className="absolute -bottom-16 -right-6 hidden md:block bg-warm-white shadow-2xl overflow-hidden max-w-[260px]"
          >
            <div className="relative aspect-[3/2]">
              <Image
                src={IMG_TILE}
                alt={t('imageTileAlt')}
                fill
                sizes="260px"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <p className="font-display italic text-lg text-soft-black leading-tight mb-1">
                "{t('quote')}"
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-soft-grey">
                {t('quoteAuthor')}
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="order-1 lg:order-2 max-w-xl"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4"
          >
            {t('eyebrow')}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-8 tracking-[-0.005em]"
          >
            {t('titlePlain')}<br />
            <em className="italic text-gold-primary">{t('titleAccent')}</em>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-5 text-[15px] md:text-base font-light leading-[1.85] text-soft-black/80"
          >
            <p>{t('paragraph1')}</p>
            <p>{t('paragraph2')}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Link
              href="/la-nostra-storia"
              className="inline-flex items-center gap-3 mt-10 text-sm uppercase tracking-[0.2em] text-soft-black border-b border-soft-black pb-1 hover:text-gold-primary hover:border-gold-primary transition-all group"
            >
              {t('cta')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
