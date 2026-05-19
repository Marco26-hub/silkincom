'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { getPosts } from '@/data/posts';
import { ArrowUpRight } from 'lucide-react';

export default function TramePage() {
  const t = useTranslations('journal');
  const locale = useLocale();
  const posts = getPosts(locale);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] },
    },
  };

  return (
    <>
      <section className="pt-40 pb-20 bg-ivory relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-bl from-gold-primary/5 to-transparent pointer-events-none" />
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center relative z-10"
        >
          <motion.span variants={itemVariants} className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6">
            {t('eyebrow')}
          </motion.span>
          <motion.h1 variants={itemVariants} className="font-display font-light text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] mb-6">
            {t.rich('title', { em: (c) => <em className="italic text-gold-primary">{c}</em> })}
          </motion.h1>
          <motion.p variants={itemVariants} className="max-w-2xl mx-auto text-base md:text-lg font-light text-soft-black/70 leading-relaxed">
            {t('intro')}
          </motion.p>
        </motion.div>
      </section>

      {/* Cinematic video banner — luxury editorial */}
      <section className="relative py-20 md:py-28 bg-ivory overflow-hidden">
        {/* Subtle ambient gold gradients */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 w-[480px] h-[480px] blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)' }}
        />

        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10">
          {/* Eyebrow caption */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-center mb-10 md:mb-14"
          >
            <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4">
              {t('atelier.eyebrow')}
            </span>
            <span className="block w-px h-8 bg-gold-primary mx-auto mb-5" />
            <h2 className="font-display font-light text-3xl md:text-4xl lg:text-5xl leading-[1.15]">
              {t.rich('atelier.title', { em: (c) => <em className="italic text-gold-primary">{c}</em> })}
            </h2>
          </motion.div>

          {/* Editorial split layout: portrait video + side caption */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 lg:gap-12 items-center">
            {/* Left side text — desktop */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="hidden md:block md:col-span-3 lg:col-span-3 text-right pr-4"
            >
              <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-4">
                {t('atelier.loomEyebrow')}
              </span>
              <span className="block w-12 h-px bg-gold-primary ml-auto mb-5" />
              <p className="font-display italic text-2xl lg:text-3xl text-soft-black/80 leading-snug mb-6">
                &ldquo;{t('atelier.quote')}&rdquo;
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-soft-black/50">
                — {t('atelier.quoteAuthor')}
              </p>
            </motion.div>

            {/* Portrait video frame */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="relative group md:col-span-6 lg:col-span-6 mx-auto w-full max-w-[520px]"
              style={{
                boxShadow:
                  '0 1px 2px rgba(23,23,23,0.06), 0 30px 80px -30px rgba(23,23,23,0.45), 0 60px 140px -60px rgba(212,175,55,0.25)',
              }}
            >
              {/* Gold corner accents */}
              <span className="pointer-events-none absolute -top-px -left-px w-10 h-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -top-px -left-px h-10 w-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -top-px -right-px w-10 h-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -top-px -right-px h-10 w-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -bottom-px -left-px w-10 h-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -bottom-px -left-px h-10 w-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -bottom-px -right-px w-10 h-px bg-gold-primary z-20" />
              <span className="pointer-events-none absolute -bottom-px -right-px h-10 w-px bg-gold-primary z-20" />

              {/* Portrait 9:16 video — full visible, no crop */}
              <div className="relative aspect-[9/16] overflow-hidden bg-soft-black">
                <video
                  src="/videos/silkincomtwill.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="SILKinCOM — telaio in lavorazione, twill di seta"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Subtle vignette */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-soft-black/15 via-transparent to-soft-black/30" />
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    background:
                      'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.12) 0%, transparent 70%)',
                  }}
                />
                {/* Inner gold hairline */}
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold-primary/25" />
              </div>
            </motion.div>

            {/* Right side metadata — desktop */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="hidden md:block md:col-span-3 lg:col-span-3 pl-4 space-y-8"
            >
              <div>
                <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-2">{t('atelier.techniqueLabel')}</span>
                <p className="text-sm text-soft-black/75 font-light leading-relaxed">{t('atelier.techniqueValue')}</p>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-2">{t('atelier.originLabel')}</span>
                <p className="text-sm text-soft-black/75 font-light leading-relaxed">{t('atelier.originValue')}</p>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-2">{t('atelier.timeLabel')}</span>
                <p className="text-sm text-soft-black/75 font-light leading-relaxed">{t('atelier.timeValue')}</p>
              </div>
            </motion.div>

            {/* Mobile caption */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: 0.3 }}
              className="md:hidden text-center px-4"
            >
              <p className="font-display italic text-xl text-soft-black/80 leading-snug mb-3">
                &ldquo;{t('atelier.quote')}&rdquo;
              </p>
              <p className="text-[10px] uppercase tracking-[0.4em] text-gold-dark">
                {t('atelier.mobileCaption')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-warm-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
          className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16"
        >
          {posts.map((a) => (
            <motion.div key={a.slug} variants={itemVariants} className="h-full">
              <Link href={`/trame-di-como/${a.slug}`} className="group block h-full flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden bg-beige-light mb-6">
                  {a.image && (
                    <Image src={a.image} alt={a.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                  )}
                  <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/10 transition-colors duration-500" />
                  <div className="absolute bottom-4 right-4 bg-warm-white text-soft-black p-3 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 rounded-full shadow-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-gold-primary mb-3 block">
                    {a.date && new Date(a.date).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl font-light mb-4 group-hover:text-gold-primary transition-colors duration-300 leading-tight">
                    {a.title}
                  </h2>
                  <p className="text-sm text-soft-black/70 font-light leading-relaxed line-clamp-3 mt-auto">
                    {a.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </>
  );
}
