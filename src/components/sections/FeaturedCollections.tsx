'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const FEATURED_SLUGS = ['inverno', 'iconica', 'primavera'] as const;
const FEATURED_IMAGES: Record<string, string> = {
  inverno: '/instagram/ig-09.jpg',
  iconica: '/instagram/ig-10.jpg',
  primavera: '/instagram/ig-11.jpg',
};

export function FeaturedCollections() {
  const t = useTranslations('home.featured');
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
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

  return (
    <section className="py-24 md:py-section bg-warm-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6"
        >
          <motion.div variants={itemVariants} className="max-w-2xl">
            <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
              {t('eyebrow')}
            </span>
            <h2 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-[-0.005em]">
              {t('titlePlain')}<br />
              <em className="italic text-gold-primary">{t('titleAccent')}</em>
            </h2>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Link
              href="/collezioni"
              className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-soft-black hover:text-gold-primary transition-colors group"
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {FEATURED_SLUGS.map((slug, i) => (
            <motion.div key={slug} variants={itemVariants} className="h-full">
              <Link
                href={`/collezioni/${slug}`}
                className="group relative block overflow-hidden bg-beige-light h-full"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={FEATURED_IMAGES[slug]}
                    alt={t(`items.${slug}.name`)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    priority={i === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-soft-black/85 via-soft-black/30 to-soft-black/20 opacity-90 group-hover:opacity-95 transition-opacity duration-500" />

                  <span className="absolute top-6 left-6 px-3 py-1 bg-warm-white/95 text-[10px] uppercase tracking-[0.3em] text-soft-black backdrop-blur-sm shadow-sm">
                    {t(`items.${slug}.accent`)}
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-8 text-warm-white">
                    <span className="block text-[10px] uppercase tracking-[0.4em] text-gold-primary mb-3">
                      {t('collectionLabel')}
                    </span>
                    <h3 className="font-display font-light text-3xl md:text-4xl leading-tight mb-3">
                      {t(`items.${slug}.shortName`)}
                    </h3>
                    <p className="text-xs font-light text-warm-white/85 mb-4 max-w-xs leading-relaxed">
                      {t(`items.${slug}.tagline`)}
                    </p>
                    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-primary border-b border-gold-primary/40 pb-1 group-hover:border-gold-primary transition-colors">
                      {t('explore')}
                      <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
