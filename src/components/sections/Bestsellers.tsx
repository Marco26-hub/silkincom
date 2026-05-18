'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { ProductCard } from '@/components/product/ProductCard';
import { getProducts } from '@/data/catalog';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export function Bestsellers() {
  const t = useTranslations('home.bestsellers');
  const locale = useLocale();
  const products = getProducts(locale);
  // pick 4 representative products
  const featured = ['bellagio-2', 'cernobbio-azzurra', 'tremezzo-beige', 'varenna-grigia']
    .map((s) => products.find((p) => p.slug === s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // fallback: first 4 products if slugs not found
  const display = featured.length >= 2 ? featured : products.slice(0, 4);

  return (
    <section className="py-24 md:py-section bg-warm-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
              {t('eyebrow')}
            </span>
            <h2 className="font-display font-light text-4xl md:text-5xl">
              {t('titlePlain')} <em className="italic text-gold-primary">{t('titleAccent')}</em>
            </h2>
          </div>
          <Link
            href="/collezioni"
            className="hidden md:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-soft-black hover:text-gold-primary transition-colors group border-b border-soft-black hover:border-gold-primary pb-1"
          >
            {t('viewAll')}
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-8"
        >
          {display.map((p) => (
            <motion.div key={p.slug} variants={itemVariants}>
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
