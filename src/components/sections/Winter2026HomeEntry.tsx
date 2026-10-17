'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { WINTER_COPY } from '@/data/winter-2026-copy';
import { WINTER_PRODUCTS } from '@/data/winter-2026';
import { WINTER_VISUALS } from '@/data/winter-2026-visuals';
import { normLocale } from '@/data/catalog-meta';
import {Winter2026Macro} from './Winter2026Macro';

const copy = {
  it: {
    eyebrow: 'Nuova capsule uomo · Inverno 2026',
    title: 'L’inverno prende',
    accent: 'forma sul Lago.',
    body: 'Brunate, Menaggio e Domaso: tre nuovi capi, uniti dal profilo del Lago ricamato in blu.',
    offer: 'Anteprima −10%',
    status: 'La capsule è pronta',
    cta: 'Entra nell’anteprima',
  },
  en: {
    eyebrow: 'New men’s capsule · Winter 2026', title: 'Winter takes', accent: 'shape on the Lake.',
    body: 'Brunate, Menaggio and Domaso: three new pieces, united by the Lake profile embroidered in blue.',
    offer: 'Preview −10%', status: 'The capsule is ready', cta: 'Enter the preview',
  },
  fr: {
    eyebrow: 'Nouvelle capsule homme · Hiver 2026', title: 'L’hiver prend', accent: 'forme sur le Lac.',
    body: 'Brunate, Menaggio et Domaso : trois nouvelles pièces, unies par le profil du Lac brodé en bleu.',
    offer: 'Avant-première −10 %', status: 'La capsule est prête', cta: 'Découvrir en avant-première',
  },
  de: {
    eyebrow: 'Neue Herrenkapsel · Winter 2026', title: 'Der Winter nimmt', accent: 'am See Gestalt an.',
    body: 'Brunate, Menaggio und Domaso: drei neue Stücke, verbunden durch das blau gestickte Profil des Sees.',
    offer: 'Vorschau −10 %', status: 'Die Kapsel ist bereit', cta: 'Vorschau entdecken',
  },
  es: {
    eyebrow: 'Nueva cápsula hombre · Invierno 2026', title: 'El invierno toma', accent: 'forma en el Lago.',
    body: 'Brunate, Menaggio y Domaso: tres nuevas prendas, unidas por el perfil del Lago bordado en azul.',
    offer: 'Avance −10 %', status: 'La cápsula está lista', cta: 'Entrar en el avance',
  },
  pt: {
    eyebrow: 'Nova cápsula homem · Inverno 2026', title: 'O inverno ganha', accent: 'forma no Lago.',
    body: 'Brunate, Menaggio e Domaso: três novas peças, unidas pelo perfil do Lago bordado a azul.',
    offer: 'Antevisão −10%', status: 'A cápsula está pronta', cta: 'Entrar na antevisão',
  },
  nl: {
    eyebrow: 'Nieuwe herencapsule · Winter 2026', title: 'De winter krijgt', accent: 'vorm aan het meer.',
    body: 'Brunate, Menaggio en Domaso: drie nieuwe stukken, verbonden door het blauw geborduurde meerprofiel.',
    offer: 'Preview −10%', status: 'De capsule is klaar', cta: 'Bekijk de preview',
  },
} as const;

const cards = [
  {
    name: 'Brunate',
    material: '100% lana pregiata',
    image: WINTER_VISUALS.brunate.cinematic,
    className: 'col-span-2 aspect-[4/5] sm:col-span-1 sm:row-span-2 sm:aspect-auto',
    position: 'object-top',
  },
  {
    name: 'Menaggio',
    material: '100% cashmere',
    image: WINTER_VISUALS.menaggio.cinematic,
    className: 'aspect-[4/5] sm:aspect-auto',
    position: 'object-top',
  },
  {
    name: 'Domaso',
    material: '100% lana merino',
    image: '/products/inverno-2026/final/dolcevita-uomo-lana-merino-nero-domaso-silkincom-02-indossato-lago-como.webp',
    className: 'aspect-[4/5] sm:aspect-auto',
    position: 'object-top',
  },
] as const;

export function Winter2026HomeEntry({ locale }: { locale: string }) {
  const lang = normLocale(locale);
  const t = copy[lang];

  return (
    <section className="relative overflow-hidden border-y border-[#d5ae58]/20 bg-[#0b0c0f] py-20 text-[#f7f1e7] md:py-28">
      <div className="pointer-events-none absolute -left-40 top-24 h-[430px] w-[430px] rounded-full bg-[#16356d]/15 blur-[110px]" />
      <div className="pointer-events-none absolute -right-36 bottom-0 h-[360px] w-[360px] rounded-full bg-[#d5ae58]/10 blur-[110px]" />

      <div className="relative mx-auto grid max-w-[1500px] gap-14 px-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.9, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="lg:pr-4"
        >
          <div className="mb-7 flex flex-wrap items-center gap-3">
            <span className="border border-[#d5ae58]/45 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#e4c06d]">{t.status}</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">{WINTER_COPY[lang].offer}</span>
          </div>
          <span className="mb-5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#e4c06d]">{t.eyebrow}</span>
          <h2 className="font-display text-[3.4rem] font-light leading-[0.9] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[5.8rem]">
            {t.title}<em className="mt-1 block italic text-[#e4c06d]">{t.accent}</em>
          </h2>
          <p className="mt-8 max-w-xl text-sm font-light leading-[1.9] text-white/75 md:text-base">{t.body}</p>
          <Link
            href="/collezioni/inverno#capsule-inverno-2026"
            className="group mt-9 inline-flex items-center gap-3 border-b border-[#d5ae58]/70 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#e4c06d]"
          >
            {t.cta}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, delay: 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="grid min-h-[560px] grid-cols-2 gap-3 sm:grid-rows-2 md:gap-5 lg:min-h-[620px]"
        >
          {cards.map((card, index) => (
            <motion.div
              key={card.name}
              transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
              className={`group relative overflow-hidden border border-white/10 bg-[#17191e] ${card.className}`}
            >
              <Link
                href={`/prodotto/${WINTER_PRODUCTS[index].slug}`}
                aria-label={`${WINTER_COPY[lang].view} · ${card.name}`}
                className="absolute inset-0 z-20"
              />
              <Image
                src={card.image}
                alt={`${card.name}, ${WINTER_PRODUCTS[index].content[lang].composition} SILKinCOM`}
                fill
                sizes={index === 0 ? '(max-width: 640px) 100vw, 45vw' : '(max-width: 640px) 50vw, 28vw'}
                className={`object-cover ${card.position}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/15" />
              <div className="absolute inset-3 border border-white/15 md:inset-4" />
              <span className="absolute left-6 top-6 font-display text-5xl text-white/25 md:left-8 md:top-8 md:text-7xl">0{index + 1}</span>
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <h3 className="font-display text-[clamp(1.5rem,3vw,2.8rem)] font-light leading-none">{card.name}</h3>
                <span className="mt-3 block text-[11px] font-medium uppercase tracking-[0.08em] text-[#e4c06d]">{WINTER_PRODUCTS[index].content[lang].composition}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="px-6 lg:px-10"><Winter2026Macro locale={locale} /></div>
    </section>
  );
}
