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

function MaterialCardComponent({ material, index }: { material: HomeMaterialCard; index: number }) {
  const t = useTranslations('home.materials');
  const [activeTab, setActiveTab] = useState<TabKey>('origine');
  const active = material.tabs[activeTab];

  return (
    <motion.div
      variants={cardVariants}
      className={`group flex flex-col overflow-hidden border border-gold-primary/20 bg-[#11100e] p-6 text-warm-white transition-all duration-500 hover:border-gold-primary/55 sm:p-7 md:p-9 ${
        index < 2 ? 'xl:col-span-3' : 'xl:col-span-2'
      }`}
      style={{
        boxShadow: '0 24px 70px -42px rgba(23,23,23,0.65)',
      }}
    >
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-3xl font-light text-warm-white transition-colors duration-500 group-hover:text-gold-primary md:text-4xl">
          {material.name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.4em] text-gold-primary">
          ({material.code})
        </span>
      </div>

      <div
        className={`relative mb-7 overflow-hidden ${index < 2 ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}
        style={{
          background: '#1d1a16',
          boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.12)',
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
        <div className="pointer-events-none absolute inset-3 border border-warm-white/15" />
      </div>

      <div role="tablist" className="mb-6 flex border-b border-warm-white/15">
        {TAB_KEYS.map((key) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(key)}
              className={`relative flex-1 min-w-0 px-1 pb-3 pt-1 text-[10px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.1em] font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300 ${
                isActive ? 'text-gold-primary' : 'text-warm-white/35 hover:text-warm-white/80'
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
        <h4 className="mb-3 font-display text-lg italic text-gold-primary md:text-xl">
          {active.title}
        </h4>
        <p className="line-clamp-3 text-sm font-light leading-[1.7] text-warm-white/60">
          {active.body}
        </p>
      </div>

      <Link
        href={material.href}
        className="mt-8 inline-flex self-start items-center gap-2 border-b border-gold-primary/40 pb-1 text-[9px] uppercase tracking-[0.32em] text-gold-primary transition-colors hover:border-gold-primary"
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
    <section className="overflow-hidden bg-[#f2ede4] py-24 text-soft-black md:py-32">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="mb-16 grid items-end gap-8 border-t border-soft-black/20 pt-7 text-left md:grid-cols-[0.65fr_1.35fr] md:gap-12 lg:mb-20"
        >
          <div>
            <span className="mb-3 block text-[9px] uppercase tracking-[0.42em] text-gold-dark">{t('eyebrow')}</span>
            <p className="max-w-sm text-xs font-light leading-relaxed text-soft-black/55">{t('description')}</p>
          </div>
          <h2 className="font-display text-5xl font-light leading-[0.9] tracking-[-0.035em] text-soft-black md:text-6xl lg:text-7xl">
            {t('titlePlain')}<br />
            <em className="italic text-gold-dark">{t('titleAccent')}</em>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-6"
        >
          {materials.map((material, index) => (
            <MaterialCardComponent key={material.id} material={material} index={index} />
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
