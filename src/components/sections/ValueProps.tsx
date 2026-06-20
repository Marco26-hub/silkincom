'use client';

import { Truck, Award, Heart, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { HomeSectionLocalized } from '@/data/home-content';

export function ValueProps({ section }: { section?: HomeSectionLocalized | null }) {
  const t = useTranslations('home.perks');
  const c = section?.content || {};

  // Each card: icon + admin-editable title + admin-editable description.
  // Falls back to messages.home.perks.* if the DB row hasn't been touched.
  const VALUES = [
    {
      icon: Award,
      title: c.madeInComoTitle || t('madeInComo.title'),
      desc: c.madeInComoDesc || t('madeInComo.desc'),
      key: 'madeInComo',
    },
    {
      icon: Truck,
      title: c.shippingTitle || t('shipping.title'),
      desc: c.shippingDesc || t('shipping.desc'),
      key: 'shipping',
    },
    {
      icon: Package,
      title: c.giftBoxTitle || t('giftBox.title'),
      desc: c.giftBoxDesc || t('giftBox.desc'),
      key: 'giftBox',
    },
    {
      icon: Heart,
      title: c.returnsTitle || t('returns.title'),
      desc: c.returnsDesc || t('returns.desc'),
      key: 'returns',
    },
  ];

  return (
    <section className="overflow-hidden border-y border-gold-primary/20 bg-[#11100e] py-5 text-warm-white md:py-0">
      <div className="mx-auto grid max-w-[1500px] grid-cols-2 px-6 md:grid-cols-4 lg:px-10">
        {VALUES.map((value, index) => (
          <motion.div
            key={value.key}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="grid grid-cols-[auto_1fr] items-start gap-3 border-gold-primary/15 px-2 py-5 odd:border-r md:border-r md:px-6 md:py-8 md:last:border-r-0"
          >
            <value.icon className="mt-0.5 h-4 w-4 stroke-1 text-gold-primary" />
            <div>
              <h3 className="mb-1 text-[9px] font-medium uppercase tracking-[0.2em] text-warm-white">{value.title}</h3>
              <p className="max-w-[210px] text-[10px] font-light leading-relaxed text-warm-white/50 md:text-[11px]">{value.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
