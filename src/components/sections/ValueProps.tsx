'use client';

import { Truck, Award, Heart, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function ValueProps() {
  const t = useTranslations('home.perks');
  const VALUES = [
    { icon: Award, key: 'madeInComo' as const },
    { icon: Truck, key: 'shipping' as const },
    { icon: Package, key: 'giftBox' as const },
    { icon: Heart, key: 'returns' as const },
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
              {t(`${v.key}.title`)}
            </h3>
            <p className="text-xs text-soft-grey font-light leading-relaxed max-w-[200px]">
              {t(`${v.key}.desc`)}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
