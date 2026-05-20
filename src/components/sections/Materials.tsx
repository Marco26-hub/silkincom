'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { HomeMaterialCard } from '@/data/home-content';

type TabKey = 'origine' | 'caratteristiche' | 'beneficio';
const TAB_KEYS: TabKey[] = ['origine', 'caratteristiche', 'beneficio'];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } },
};

function MaterialCardComponent({ material }: { material: HomeMaterialCard }) {
  const t = useTranslations('home.materials');
  const [activeTab, setActiveTab] = useState<TabKey>('origine');
  const active = material.tabs[activeTab];

  return (
    <motion.div
      variants={cardVariants}
      className="bg-warm-white border border-pearl-grey/40 p-6 sm:p-7 md:p-9 flex flex-col group transition-all duration-500 hover:border-gold-primary/30 overflow-hidden"
      style={{
        boxShadow: '0 1px 2px rgba(23,23,23,0.04), 0 12px 32px -16px rgba(23,23,23,0.10)',
      }}
    >
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display font-light text-3xl md:text-4xl text-soft-black group-hover:text-gold-dark transition-colors duration-500">
          {material.name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.4em] text-gold-primary">
          ({material.code})
        </span>
      </div>

      <div
        className="relative aspect-[4/3] mb-7 overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, #FFFDF8 0%, #F7F2EA 60%, #EDE3D3 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.06)',
        }}
      >
        {material.image ? (
          <Image
            src={material.image}
            alt={material.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            quality={92}
            className="object-cover transition-transform duration-[1500ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.04]"
          />
        ) : null}
      </div>

      <div role="tablist" className="flex border-b border-pearl-grey/60 mb-6">
        {TAB_KEYS.map((key) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(key)}
              className={`relative flex-1 min-w-0 px-0.5 pb-3 pt-1 text-[8px] uppercase tracking-[0.08em] font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300 ${
                isActive ? 'text-gold-dark' : 'text-soft-black/45 hover:text-soft-black/80'
              }`}
            >
              {t(`tabs.${key}`)}
              <span
                className={`absolute left-0 right-0 -bottom-px h-px bg-gold-primary transition-transform duration-500 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] origin-center ${
                  isActive ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        key={activeTab}
        className="flex-1 animate-[fadeIn_0.4s_ease-out] min-h-[120px]"
      >
        <h4 className="font-display text-lg md:text-xl text-gold-dark mb-3 italic">
          {active.title}
        </h4>
        <p className="text-sm font-light text-soft-black/75 leading-[1.7] line-clamp-3">
          {active.body}
        </p>
      </div>

      <Link
        href={material.href}
        className="inline-flex items-center gap-2 mt-8 text-[10px] uppercase tracking-[0.3em] text-gold-dark border-b border-gold-primary/40 hover:border-gold-primary self-start pb-1 transition-colors"
      >
        {t('discoverShort')}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

export function Materials({ materials }: { materials?: HomeMaterialCard[] }) {
  const t = useTranslations('home.materials');

  if (!materials || materials.length === 0) return null;

  return (
    <section className="py-24 md:py-section bg-warm-white text-soft-black overflow-hidden">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            {t('eyebrow')}
          </span>
          <h2 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.1] text-soft-black">
            {t('titlePlain')}<br />
            <em className="italic text-gold-primary">{t('titleAccent')}</em>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-5"
        >
          {materials.map((m) => (
            <MaterialCardComponent key={m.id} material={m} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-14"
        >
          <Link
            href="/materiali"
            className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-soft-black border-b border-soft-black hover:border-gold-primary hover:text-gold-primary pb-1 transition-colors group"
          >
            {t('discover')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
