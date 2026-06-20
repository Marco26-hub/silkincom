'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { HomeSectionLocalized } from '@/data/home-content';

const FALLBACK_MAIN = '/artisans/tessitore-tessitura-como.webp';
const FALLBACK_TILE = '/instagram/ig-07.webp';

export function BrandStory({ section }: { section?: HomeSectionLocalized | null }) {
  const t = useTranslations('home.brandStory');

  const content = section?.content || {};
  const imgs = section?.images || [];
  const imgMain = imgs[0]?.url || FALLBACK_MAIN;
  const imgTile = imgs[1]?.url || FALLBACK_TILE;

  const eyebrow = content.eyebrow || t('eyebrow');
  const titlePlain = content.titlePlain || t('titlePlain');
  const titleAccent = content.titleAccent || t('titleAccent');
  const paragraph1 = content.paragraph1 || t('paragraph1');
  const paragraph2 = content.paragraph2 || t('paragraph2');
  const cta = content.cta || t('cta');
  const quote = content.quote || t('quote');
  const quoteAuthor = content.quoteAuthor || t('quoteAuthor');
  const imageMainAlt = imgs[0]?.alt || content.imageMainAlt || t('imageMainAlt');
  const imageTileAlt = imgs[1]?.alt || content.imageTileAlt || t('imageTileAlt');

  return (
    <section className="overflow-hidden bg-[#11100e] py-24 text-warm-white md:py-32">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:px-10 xl:gap-28">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative order-2 lg:order-1 lg:pb-20"
        >
          <div className="relative aspect-[4/5] overflow-hidden border border-gold-primary/20">
            <Image
              src={imgMain}
              alt={imageMainAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform [transition-duration:1500ms] hover:scale-105"
            />
            <div className="absolute inset-4 border border-warm-white/20 md:inset-6" />
            <span className="absolute bottom-8 left-8 text-[8px] uppercase tracking-[0.36em] text-gold-primary md:bottom-11 md:left-11">Como · Atelier</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            className="absolute bottom-0 right-[-1.5rem] hidden max-w-[300px] overflow-hidden border border-gold-primary/20 bg-[#f2ede4] text-soft-black shadow-[0_30px_80px_-35px_rgba(0,0,0,0.8)] md:block lg:right-[-2.5rem]"
          >
            <div className="relative aspect-[3/2]">
              <Image
                src={imgTile}
                alt={imageTileAlt}
                fill
                sizes="260px"
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <p className="mb-2 font-display text-xl italic leading-tight text-soft-black">
                &ldquo;{quote}&rdquo;
              </p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-soft-grey">
                {quoteAuthor}
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="order-1 max-w-xl lg:order-2"
        >
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-5 block text-[9px] uppercase tracking-[0.44em] text-gold-primary"
          >
            {eyebrow}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-9 font-display text-5xl font-light leading-[0.92] tracking-[-0.035em] md:text-6xl lg:text-7xl"
          >
            {titlePlain}<br />
            <em className="italic text-gold-primary">{titleAccent}</em>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-5 text-[14px] font-light leading-[1.9] text-warm-white/65 md:text-[15px]"
          >
            <p>{paragraph1}</p>
            <p>{paragraph2}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Link
              href="/la-nostra-storia"
              className="group mt-10 inline-flex items-center gap-3 border-b border-warm-white/50 pb-1 text-[10px] uppercase tracking-[0.28em] text-warm-white transition-all hover:border-gold-primary hover:text-gold-primary"
            >
              {cta}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
