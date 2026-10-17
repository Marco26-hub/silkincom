'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { getCollectionNavigation } from '@/data/collection-navigation';

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
  const navigation = getCollectionNavigation(useLocale());

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] },
    },
  };

  if (!collections || collections.length === 0) return null;

  return (
    <section id="home-collezioni" className="overflow-hidden bg-[#f2ede4] py-20 md:py-24">
      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="mb-10 grid gap-6 border-t border-soft-black/20 pt-6 md:grid-cols-[0.7fr_1.3fr] md:items-end md:gap-10 lg:mb-14"
        >
          <motion.div variants={itemVariants}>
            <span className="mb-4 block text-[11px] uppercase tracking-[0.18em] text-[#72603a]">
              {t('eyebrow')}
            </span>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-soft-black/65">Lookbook · Como 2026</span>
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
          className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-5 lg:gap-7"
        >
          {collections.map((collection, index) => {
            const image = collection.image || FALLBACK_IMAGES[collection.slug] || DEFAULT_FALLBACK;
            const imagePosition = collection.slug === 'inverno'
              ? 'object-[50%_46%]'
              : collection.slug === 'primavera'
                ? 'object-[48%_50%]'
                : 'object-[50%_48%]';
            const categoryLinks = navigation.find(item => item.slug === collection.slug)?.links;
            return (
              <motion.div key={collection.slug} variants={itemVariants} className="min-w-0">
                <Link
                  href={`/collezioni/${collection.slug}`}
                  className="group relative isolate block aspect-[4/5] overflow-hidden bg-[#1a1815] md:aspect-[3/4]"
                >
                  <Image
                    src={image}
                    alt={collection.name}
                    fill
                    sizes="(max-width: 767px) 100vw, 33vw"
                    className={`object-cover transition-transform duration-[1400ms] ${imagePosition}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
                  <span className="absolute left-6 top-6 bg-black/35 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                    0{index + 1} · {t('collectionLabel')}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-6 pt-12 text-warm-white lg:p-8">
                    <h3 className="max-w-full break-words font-display text-[clamp(2rem,3.3vw,3.6rem)] font-light leading-[1.02] tracking-[-0.025em]">
                      {collection.shortName || collection.name}
                    </h3>
                    <div className="mt-5 flex items-end justify-between gap-5 border-t border-warm-white/25 pt-5">
                      <p className="max-w-[85%] text-[13px] font-light leading-relaxed text-warm-white/85">{collection.tagline}</p>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-gold-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                  </div>
                </Link>
                {categoryLinks && <nav aria-label={collection.name} className="mt-1 flex flex-wrap gap-x-4 border-b border-soft-black/20 py-2">
                  {categoryLinks.map(item => <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center text-[11px] font-medium uppercase tracking-[0.06em] text-soft-black/80 transition-colors hover:text-[#72603a]">{item.label}</Link>)}
                </nav>}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
