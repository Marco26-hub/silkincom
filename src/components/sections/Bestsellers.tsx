'use client';

import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/data/catalog-meta';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export function BestsellerContent({ products }: { products: Product[] }) {
  const t = useTranslations('home.bestsellers');

  return (
    <section className="overflow-hidden bg-warm-white py-24 md:py-32">
      <div className="mx-auto max-w-[1500px] px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.32fr_0.68fr] lg:gap-14 xl:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="lg:sticky lg:top-32 lg:self-start"
        >
          <div>
            <span className="mb-5 block h-px w-12 bg-gold-dark" />
            <span className="mb-5 block text-[9px] uppercase tracking-[0.42em] text-gold-dark">
              {t('eyebrow')}
            </span>
            <h2 className="font-display text-5xl font-light leading-[0.9] tracking-[-0.035em] md:text-6xl lg:text-7xl">
              {t('titlePlain')} <em className="block italic text-gold-dark">{t('titleAccent')}</em>
            </h2>
            <p className="mt-7 max-w-xs text-sm font-light leading-[1.8] text-soft-black/60">
              Disegni essenziali, fibre nobili e proporzioni pensate per durare oltre la stagione.
            </p>
          </div>
          <Link
            href="/collezioni"
            className="group mt-9 inline-flex items-center gap-2 border-b border-soft-black pb-1 text-[10px] uppercase tracking-[0.28em] text-soft-black transition-colors hover:border-gold-dark hover:text-gold-dark"
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
          className="grid grid-cols-2 gap-x-4 gap-y-14 sm:gap-x-6 md:gap-x-8 md:gap-y-20"
        >
          {products.map((product, index) => (
            <motion.div key={product.slug} variants={itemVariants} className={index % 2 === 1 ? 'md:mt-20' : ''}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
        </div>
      </div>
    </section>
  );
}
