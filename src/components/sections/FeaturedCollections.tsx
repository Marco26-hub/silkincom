'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export type FeaturedCollectionCard = {
  slug: string;
  name: string;
  shortName: string;
  accent: string;
  tagline: string;
  description: string;
  image: string;
};

const FALLBACK_IMAGES: Record<string, string> = {
  inverno: '/instagram/ig-09.webp',
  iconica: '/instagram/ig-10.webp',
  primavera: '/instagram/ig-11.webp',
};
const DEFAULT_FALLBACK = '/instagram/ig-09.webp';

export function FeaturedCollections({ collections }: { collections: FeaturedCollectionCard[] }) {
  const t = useTranslations('home.featured');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] },
    },
  };

  if (!collections || collections.length === 0) return null;

  return (
    <section className="overflow-hidden bg-[#f2ede4] py-24 md:py-32">
      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="mb-16 grid gap-8 border-t border-soft-black/20 pt-7 md:grid-cols-[0.7fr_1.3fr] md:items-end md:gap-12 lg:mb-24"
        >
          <motion.div variants={itemVariants}>
            <span className="mb-4 block text-[9px] uppercase tracking-[0.42em] text-gold-dark">
              {t('eyebrow')}
            </span>
            <span className="block text-[9px] uppercase tracking-[0.32em] text-soft-black/45">Lookbook · Como 2026</span>
          </motion.div>
          <motion.div variants={itemVariants} className="md:text-right">
            <h2 className="font-display text-[3.4rem] font-light leading-[0.88] tracking-[-0.035em] sm:text-6xl md:text-7xl lg:text-8xl">
              {t('titlePlain')} <em className="block italic text-gold-dark">{t('titleAccent')}</em>
            </h2>
          </motion.div>
          <motion.div variants={itemVariants} className="md:col-start-2 md:justify-self-end">
            <Link
              href="/collezioni"
              className="group inline-flex items-center gap-2 border-b border-soft-black pb-1 text-[10px] uppercase tracking-[0.28em] text-soft-black transition-colors hover:border-gold-dark hover:text-gold-dark"
            >
              {t('viewAll')}
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
          className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8 lg:gap-10"
        >
          {collections.map((collection, index) => {
            const image = collection.image || FALLBACK_IMAGES[collection.slug] || DEFAULT_FALLBACK;
            const placement = index === 0
              ? 'md:col-span-7'
              : index === 1
                ? 'md:col-span-5 md:mt-28'
                : 'md:col-span-9 md:col-start-3 md:mt-4';
            const ratio = index === 2 ? 'aspect-[5/4] md:aspect-[16/9]' : 'aspect-[4/5]';
            return (
              <motion.div key={collection.slug} variants={itemVariants} className={placement}>
                <Link
                  href={`/collezioni/${collection.slug}`}
                  className={`group relative block overflow-hidden bg-[#1a1815] ${ratio}`}
                >
                  <Image
                    src={image}
                    alt={collection.name}
                    fill
                    sizes={index === 2 ? '(max-width: 767px) 100vw, 75vw' : '(max-width: 767px) 100vw, 50vw'}
                    className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.055]"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/10" />
                  <div className="absolute inset-3 border border-warm-white/20 transition-colors duration-700 group-hover:border-gold-primary/70 md:inset-5" />
                  <span className="absolute left-7 top-7 text-[9px] uppercase tracking-[0.34em] text-warm-white/70 md:left-10 md:top-10">
                    0{index + 1} · {t('collectionLabel')}
                  </span>
                  {collection.accent ? (
                    <span className="absolute right-7 top-7 text-[8px] uppercase tracking-[0.3em] text-gold-primary md:right-10 md:top-10">
                      {collection.accent}
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 p-8 text-warm-white md:p-12">
                    <h3 className="max-w-xl font-display text-4xl font-light leading-[0.92] md:text-6xl">
                      {collection.shortName || collection.name}
                    </h3>
                    <div className="mt-5 flex items-end justify-between gap-6 border-t border-warm-white/25 pt-5">
                      <p className="max-w-sm text-xs font-light leading-relaxed text-warm-white/70">{collection.tagline}</p>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-gold-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
