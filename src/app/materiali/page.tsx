'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Section = { label: string; title: string; body: string };
type PopupProduct = { image: string; name: string; href: string; price: string; rotate: string; offset: string };
type Material = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  lifestyleImage: string;
  productImage: string;
  productName: string;
  productHref: string;
  productPrice: string;
  dark: boolean;
  sections: Section[];
  popupProducts?: PopupProduct[];
};

const MATERIAL_CONFIG = [
  {
    id: 'seta', code: 'SE', tKey: 'seta',
    lifestyleImage: 'https://static.wixstatic.com/media/a34b56_d0546fb94b1141e292d6ab721a70f6af~mv2.png/v1/fill/w_2000,h_1400,al_c,q_90/file.png',
    productImage: 'https://static.wixstatic.com/media/b58e91_6e113b7ba95f4d81854d2300b10860e8~mv2.jpg/v1/fit/w_900,h_900,q_90/file.jpg',
    productName: 'Twilly Como Elegante', productHref: '/prodotto/como-elegante', productPrice: '€ 90', dark: false,
    sectionKeys: ['origine', 'caratteristiche', 'beneficio'] as const,
  },
  {
    id: 'cashmere', code: 'WS', tKey: 'cashmere',
    lifestyleImage: 'https://static.wixstatic.com/media/a34b56_a8f747d43425400e9268c9c5a50583dd~mv2.png/v1/fill/w_2000,h_1400,al_c,q_90/file.png',
    productImage: 'https://static.wixstatic.com/media/b58e91_6653f43860d34a5eb0143cae9523a134~mv2.jpg/v1/fit/w_900,h_900,q_90/file.jpg',
    productName: 'Bellagio — Pashmina', productHref: '/prodotto/bellagio-1', productPrice: '€ 170', dark: true,
    sectionKeys: ['origine', 'caratteristiche', 'beneficio'] as const,
  },
  {
    id: 'merino', code: 'WO', tKey: 'merino',
    lifestyleImage: 'https://static.wixstatic.com/media/a34b56_18eec7b7887f47f69567da3fbe1af6ca~mv2.png/v1/fill/w_2000,h_1400,al_c,q_90/file.png',
    productImage: 'https://static.wixstatic.com/media/a34b56_1af2743a614c4ac1b255dd1e53c8f436~mv2.jpg/v1/fit/w_900,h_900,q_90/file.jpg',
    productName: 'Tremezzo — Sciarpa Lana', productHref: '/prodotto/tremezzo-azzurra', productPrice: '€ 120', dark: false,
    sectionKeys: ['origine', 'caratteristiche', 'beneficio'] as const,
  },
  {
    id: 'lino-cotone', code: 'LI · CO', tKey: 'linoCotone',
    lifestyleImage: 'https://static.wixstatic.com/media/a34b56_4c95bebbb8a141b4a44c0340182bbe97~mv2.jpg/v1/fill/w_2000,h_1400,al_c,q_90,usm_0.66_1.00_0.01/file.jpg',
    productImage: 'https://static.wixstatic.com/media/a34b56_4cdb7894efaa4a128d5fb0714b80e743~mv2.jpg/v1/fit/w_900,h_900,q_90/file.jpg',
    productName: 'Melzi — Capo in Lino', productHref: '/prodotto/melzi-1', productPrice: '€ 65', dark: false,
    sectionKeys: ['linoOrigine', 'cotoneOrigine', 'caratteristiche', 'beneficio'] as const,
    popupProducts: [
      { image: 'https://static.wixstatic.com/media/a34b56_88c331613a2942d6bf9ac51c2f3f641c~mv2.jpg/v1/fit/w_1400,h_1400,q_92/file.jpg', name: 'Riva — Camicia', href: '/prodotto/riva', price: '€ 75', rotate: '-rotate-6', offset: '-translate-y-4 md:-translate-y-10' },
      { image: 'https://static.wixstatic.com/media/a34b56_4cdb7894efaa4a128d5fb0714b80e743~mv2.jpg/v1/fit/w_1400,h_1400,q_92/file.jpg', name: 'Melzi — Pantaloncino', href: '/prodotto/melzi-1', price: '€ 65', rotate: 'rotate-0', offset: 'translate-y-4 md:translate-y-8' },
      { image: 'https://static.wixstatic.com/media/a34b56_0f40416a402e4011a78dba5f2849cf6f~mv2.jpg/v1/fit/w_1400,h_1400,q_92/file.jpg', name: 'Darsena — Cappellino', href: '/prodotto/darsena-bianco', price: '€ 40', rotate: 'rotate-6', offset: '-translate-y-2 md:-translate-y-6' },
    ],
  },
];

export default function MaterialiPage() {
  const t = useTranslations('materialiPage');
  const tm = useTranslations('materialiPage.materials');

  const MATERIALI: Material[] = MATERIAL_CONFIG.map((cfg) => ({
    id: cfg.id,
    code: cfg.code,
    name: tm(`${cfg.tKey}.name` as any),
    subtitle: tm(`${cfg.tKey}.subtitle` as any),
    lifestyleImage: cfg.lifestyleImage,
    productImage: cfg.productImage,
    productName: cfg.productName,
    productHref: cfg.productHref,
    productPrice: cfg.productPrice,
    dark: cfg.dark,
    sections: cfg.sectionKeys.map((sk) => ({
      label: tm(`${cfg.tKey}.sections.${sk}.label` as any),
      title: tm(`${cfg.tKey}.sections.${sk}.title` as any),
      body: tm(`${cfg.tKey}.sections.${sk}.body` as any),
    })),
    popupProducts: 'popupProducts' in cfg ? cfg.popupProducts : undefined,
  }));
  return (
    <>
      {/* Hero */}
      <section className="pt-44 pb-20 bg-ivory">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="max-w-[1400px] mx-auto px-6 lg:px-10 text-center"
        >
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('eyebrow')}
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8">
            {t('titleP1')}<br />
            <em className="italic text-gold-primary font-light">{t('titleAccent')}</em>
          </h1>
          <p className="max-w-2xl mx-auto text-base font-light leading-relaxed text-soft-black/70">
            {t('description')}
          </p>
        </motion.div>
      </section>

      {/* Material sections — luxury split layout with real product */}
      {MATERIALI.map((m, idx) => (
        <section key={m.id} id={m.id} className={m.dark ? 'bg-soft-black text-warm-white' : 'bg-warm-white text-soft-black'}>
          {/* Lifestyle banner with floating product card OR popup composition (Lino) */}
          <div className="relative">
            {m.popupProducts ? (
              // BRIGHT POPUP COMPOSITION — for Lino
              <div
                className="relative h-[75vh] min-h-[520px] md:min-h-[640px] overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, #FFFDF8 0%, #F7F2EA 55%, #EDE3D3 100%)',
                }}
              >
                {/* Soft radial spotlight */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 60% 45% at 50% 35%, rgba(255,253,248,0.9) 0%, transparent 70%)',
                  }}
                />

                {/* Title — top */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
                  className="relative z-10 text-center pt-20 md:pt-24 px-6 text-soft-black"
                >
                  <span className="block text-[10px] uppercase tracking-[0.6em] text-gold-primary mb-5">
                    ({m.code})
                  </span>
                  <h2 className="font-display font-light text-3xl sm:text-5xl md:text-7xl leading-[0.95] tracking-tight">
                    {m.name}{' '}
                    <em className="italic text-gold-primary font-light">{m.subtitle}</em>
                  </h2>
                </motion.div>

                {/* Floating products composition */}
                <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-10 mt-10 md:mt-14 grid grid-cols-3 gap-3 md:gap-8 items-center">
                  {m.popupProducts.map((pp, pi) => (
                    <motion.div
                      key={pp.href}
                      initial={{ opacity: 0, y: 80, scale: 0.9 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 1.1,
                        delay: 0.25 + pi * 0.18,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                      className={`${pp.offset}`}
                    >
                      <Link href={pp.href} className={`group block ${pp.rotate} hover:rotate-0 transition-transform duration-700 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]`}>
                        <div
                          className="relative aspect-square overflow-hidden bg-warm-white"
                          style={{
                            boxShadow:
                              '0 30px 60px -25px rgba(23,23,23,0.30), 0 12px 24px -12px rgba(23,23,23,0.18), inset 0 0 0 1px rgba(212,175,55,0.08)',
                          }}
                        >
                          <Image
                            src={pp.image}
                            alt={pp.name}
                            fill
                            sizes="(max-width: 768px) 33vw, 360px"
                            quality={92}
                            className="object-contain p-3 sm:p-8 md:p-16 transition-transform duration-[1500ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.04] drop-shadow-[0_12px_24px_rgba(23,23,23,0.10)]"
                          />
                          {/* Subtle gold corner */}
                          <span className="pointer-events-none absolute top-0 left-0 w-6 h-px bg-gold-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <span className="pointer-events-none absolute top-0 left-0 w-px h-6 bg-gold-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <div className="text-center mt-4 md:mt-5">
                          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-gold-dark font-medium mb-1">
                            {pp.name}
                          </p>
                          <p className="text-xs md:text-sm font-light text-soft-black/70">{pp.price}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom hairline */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-12 bg-gold-primary/40" />
              </div>
            ) : (
              <div className="relative h-[58vh] min-h-[440px] md:min-h-[560px] overflow-hidden">
                <Image
                  src={m.lifestyleImage}
                  alt={`${m.name} ${m.subtitle} — atmosfera Lago di Como`}
                  fill
                  sizes="100vw"
                  className="object-cover scale-105 hover:scale-100 transition-transform duration-[3s] ease-out"
                  priority={idx === 0}
                />
                {/* Layered gradient: dark left for title legibility + soft bottom for product card */}
                <div className="absolute inset-0 bg-gradient-to-r from-soft-black/75 via-soft-black/35 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-soft-black/55" />

                {/* Material title overlay — top-left, no overlap with central image content */}
                <div className="relative z-10 h-full flex items-start text-left text-warm-white px-6 sm:px-10 lg:px-16 pt-14 md:pt-20">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="max-w-[60%] sm:max-w-[55%] md:max-w-[50%]"
                  >
                    <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
                      ({m.code})
                    </span>
                    <span className="block w-10 h-px bg-gold-primary mb-6" />
                    <h2 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.98] tracking-tight">
                      {m.name}
                      <br />
                      <em className="italic text-gold-primary font-light">{m.subtitle}</em>
                    </h2>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Floating product card — hidden for popup mode */}
            {!m.popupProducts && (
            <motion.div
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true }}
              transition={{ duration: 1.8, delay: 0.6, ease: [0.16, 0.84, 0.32, 1] }}
              className="relative -mt-20 md:-mt-40 z-20 max-w-[1400px] mx-auto px-6 lg:px-10"
            >
              <div
                className="mx-auto md:ml-auto md:mr-0 max-w-sm md:max-w-md md:flex overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,253,248,0.92) 0%, rgba(247,242,234,0.88) 50%, rgba(237,227,211,0.85) 100%)',
                  backdropFilter: 'blur(18px) saturate(135%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(135%)',
                  boxShadow:
                    '0 1px 2px rgba(23,23,23,0.04), 0 20px 50px -25px rgba(23,23,23,0.25), 0 40px 90px -45px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
                  borderTop: '1px solid rgba(212,175,55,0.45)',
                }}
              >
                <Link href={m.productHref} className="group block md:flex flex-1">
                  <div
                    className="relative aspect-square md:w-44 md:h-44 flex-shrink-0 overflow-hidden"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 35%, rgba(255,253,248,0.95) 0%, rgba(247,242,234,0.7) 60%, rgba(237,227,211,0.55) 100%)',
                    }}
                  >
                    <Image
                      src={m.productImage}
                      alt={m.productName}
                      fill
                      sizes="(max-width: 768px) 100vw, 200px"
                      className="object-contain p-4 transition-transform duration-[1200ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:scale-[1.06]"
                    />
                  </div>
                  <div className="p-6 md:p-7 flex flex-col justify-between flex-1 text-soft-black">
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.35em] text-gold-primary mb-2">
                        {t('bestIn', { material: m.name })}
                      </span>
                      <h3 className="font-display font-light text-2xl leading-tight mb-2">
                        {m.productName}
                      </h3>
                      <p className="text-sm font-light text-soft-black/60">{m.productPrice}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-soft-black border-b border-soft-black/30 pb-1 group-hover:border-gold-primary group-hover:text-gold-primary transition-all w-fit mt-4">
                      {t('discoverProduct')}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </div>
            </motion.div>
            )}
          </div>

          {/* Content grid */}
          <div className="pt-32 md:pt-40 pb-20 md:pb-28">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8 }}
                className={`grid grid-cols-1 sm:grid-cols-2 ${m.sections.length === 4 ? 'lg:grid-cols-4' : 'md:grid-cols-3'} gap-px`}
                style={{
                  background: m.dark ? '#D4AF37' : '#E5E0D8',
                }}
              >
                {m.sections.map((s, si) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: si * 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className={`${m.sections.length === 4 ? 'p-8 md:p-10' : 'p-12 md:p-14'} ${m.dark ? 'bg-soft-black' : 'bg-warm-white'}`}
                  >
                    <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-8 font-medium">
                      {s.label}
                    </span>
                    <h3 className="font-display font-light text-3xl md:text-4xl leading-tight mb-6">
                      {s.title}
                    </h3>
                    <p className={`text-sm font-light leading-[1.8] tracking-wide ${m.dark ? 'text-warm-white/65' : 'text-soft-black/70'}`}>
                      {s.body}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-24 md:py-32 bg-ivory text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto px-6"
        >
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-5">
            {t('exploreCta')}
          </span>
          <span className="block w-px h-10 bg-gold-primary mx-auto mb-8" />
          <h2 className="font-display font-light text-4xl md:text-5xl leading-[1.1] mb-10">
            {t('ctaTitle')}<br /><em className="italic text-gold-primary">{t('ctaTitleAccent')}</em>
          </h2>
          <Link
            href="/collezioni"
            className="inline-flex items-center gap-3 px-12 py-5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.4em] hover:bg-gold-primary hover:text-soft-black transition-all duration-500 group"
          >
            {t('exploreCollections')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>
    </>
  );
}
