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
    <section className="py-16 bg-warm-white border-y border-pearl-grey/40 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {VALUES.map((v, i) => (
          <motion.div
            key={v.key}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="flex flex-col items-center text-center"
          >
            <v.icon className="w-7 h-7 text-gold-primary mb-3 stroke-1" />
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-soft-black mb-1.5 font-medium">
              {v.title}
            </h3>
            <p className="text-xs text-soft-black/75 font-normal leading-relaxed max-w-[200px]">
              {v.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
