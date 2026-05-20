'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const IMG_HERO =
  'https://static.wixstatic.com/media/11062b_07ccc5eabef74564bafa19a17ab1fd0b~mv2_d_5262_3508_s_4_2.jpg/v1/fill/w_2400,h_1600,al_c,q_90,usm_0.66_1.00_0.01/file.jpg';
const IMG_TESSILE =
  'https://static.wixstatic.com/media/11062b_69b6328a0fa6434a9f5fbc33960efc9d~mv2.jpg/v1/fill/w_1400,h_1000,al_c,q_90,usm_0.66_1.00_0.01/file.jpg';
const IMG_FILATO =
  'https://static.wixstatic.com/media/a34b56_fc015259aa5a4e58a0b7803fdbdb7367~mv2.jpg/v1/fill/w_1400,h_1000,al_c,q_90,usm_0.66_1.00_0.01/file.jpg';

export function LegacyStoria() {
  const t = useTranslations('storia');
  return (
    <>
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <Image
          src={IMG_HERO}
          alt="Artigianato tessile SILKinCOM a Como"
          fill
          priority
          className="object-cover scale-[1.03] transition-transform [transition-duration:3000ms] ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-soft-black/50 via-soft-black/20 to-soft-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-soft-black/40 to-transparent" />
        <div className="relative z-10 h-full flex items-end pb-20 md:items-center md:pb-0">
          <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 text-warm-white">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6"
            >
              {t('eyebrow')}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="font-display font-light text-5xl md:text-7xl lg:text-[88px] leading-[1.05] max-w-3xl"
            >
              {t('titleP1')}<br />
              {t('titleP2')}{' '}
              <em className="italic text-gold-primary">{t('titleAccent')}</em>
            </motion.h1>
          </div>
        </div>
      </section>

      {/* Intro quote */}
      <section className="py-24 bg-warm-white">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="max-w-3xl mx-auto px-6 text-center"
        >
          <p className="text-xl md:text-2xl font-display italic text-soft-black/80 leading-relaxed">
            &ldquo;{t('quote')}&rdquo;
          </p>
        </motion.div>
      </section>

      {/* Capitolo I — La storia */}
      <section className="py-24 bg-ivory overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative aspect-[4/5] overflow-hidden"
          >
            <Image
              src={IMG_TESSILE}
              alt="Industria tessile comasca"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-soft-black/20 to-transparent" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
              {t('chapterI')}
            </span>
            <h2 className="font-display font-light text-4xl md:text-5xl mb-8 leading-[1.1]">
              {t('storyTitlePlain')} <em className="italic text-gold-primary">{t('storyTitleAccent')}</em>
            </h2>
            <div className="space-y-4 text-base font-light leading-relaxed text-soft-black/80">
              <p>{t('storyP1')}</p>
              <p>{t('storyP2')}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capitolo II — L'essenza */}
      <section className="py-24 bg-soft-black text-warm-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          >
            <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
              {t('chapterII')}
            </span>
            <h2 className="font-display font-light text-4xl md:text-5xl mb-8 leading-[1.1]">
              {t('essenceTitlePlain')} <em className="italic text-gold-primary">{t('essenceTitleAccent')}</em>
            </h2>
            <div className="space-y-4 text-base font-light leading-relaxed text-warm-white/80">
              <p>{t('essenceP1')}</p>
              <p>{t('essenceP2')}</p>
            </div>
            <div className="flex flex-wrap gap-8 mt-12">
              {[
                { num: '36+', label: t('stat1') },
                { num: '100%', label: t('stat2') },
                { num: '5+', label: t('stat3') },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display text-4xl text-gold-primary mb-1">{s.num}</p>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-warm-white/60">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="relative aspect-[3/2] lg:aspect-[4/3] overflow-hidden"
          >
            <Image
              src={IMG_FILATO}
              alt="Gomitoli di filato pregiato"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Capitolo III — Vivi SILKinCOM */}
      <section className="py-24 bg-warm-white">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="max-w-3xl mx-auto px-6 text-center"
        >
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            {t('chapterIII')}
          </span>
          <h2 className="font-display font-light text-4xl md:text-5xl mb-8 leading-[1.1]">
            {t('liveTitlePlain')}{' '}
            <em className="italic text-gold-primary">{t('liveTitleAccent')}</em>
          </h2>
          <p className="text-lg font-light leading-relaxed text-soft-black/80 mb-10">
            {t('liveDescription')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="https://www.instagram.com/silkincom.official/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
            >
              {t('followInstagram')}
            </a>
            <Link
              href="/collezioni"
              className="inline-flex items-center gap-3 px-8 py-4 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-all duration-300"
            >
              {t('exploreCollections')}
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
