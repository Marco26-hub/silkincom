'use client';

import Image from 'next/image';
import {motion, useReducedMotion} from 'framer-motion';
import {ArrowUpRight} from 'lucide-react';
import {Link} from '@/i18n/navigation';
import {WINTER_VISUALS, WINTER_MACRO_ALT} from '@/data/winter-2026-visuals';
import {normLocale} from '@/data/catalog-meta';

const COPY = {
  it: {kicker: 'Menaggio · Il dettaglio', title: 'Il Lago,', accent: 'filo dopo filo.', body: 'Cashmere grigio. Ricamo blu. La nostra firma, vista da vicino.', cta: 'Scopri Menaggio'},
  en: {kicker: 'Menaggio · The detail', title: 'The Lake,', accent: 'thread by thread.', body: 'Grey cashmere. Blue embroidery. Our signature, up close.', cta: 'Discover Menaggio'},
  es: {kicker: 'Menaggio · El detalle', title: 'El Lago,', accent: 'hilo a hilo.', body: 'Cachemira gris. Bordado azul. Nuestra firma, de cerca.', cta: 'Descubrir Menaggio'},
  fr: {kicker: 'Menaggio · Le détail', title: 'Le Lac,', accent: 'fil après fil.', body: 'Cachemire gris. Broderie bleue. Notre signature, de près.', cta: 'Découvrir Menaggio'},
  de: {kicker: 'Menaggio · Das Detail', title: 'Der See,', accent: 'Faden für Faden.', body: 'Graues Kaschmir. Blaue Stickerei. Unsere Signatur aus der Nähe.', cta: 'Menaggio entdecken'},
  pt: {kicker: 'Menaggio · O detalhe', title: 'O Lago,', accent: 'fio a fio.', body: 'Caxemira cinzenta. Bordado azul. A nossa assinatura, de perto.', cta: 'Descobrir Menaggio'},
  nl: {kicker: 'Menaggio · Het detail', title: 'Het meer,', accent: 'draad voor draad.', body: 'Grijs kasjmier. Blauw borduurwerk. Onze signatuur van dichtbij.', cta: 'Ontdek Menaggio'},
} as const;

export function Winter2026Macro({locale}: {locale: string}) {
  const lang = normLocale(locale);
  const t = COPY[lang];
  const reducedMotion = useReducedMotion();
  return (
    <div id="dettaglio-menaggio" className="mx-auto mt-16 grid max-w-[1500px] overflow-hidden border border-white/15 md:mt-24 md:grid-cols-[1.2fr_0.8fr]">
      <div className="relative aspect-[5/4] overflow-hidden bg-[#515961] md:aspect-[4/3]">
        <motion.div className="absolute inset-0" initial={{scale: 1}} whileInView={{scale: reducedMotion ? 1 : 1.065}} viewport={{once: true, amount: 0.3}} transition={{duration: 14, ease: 'easeOut'}}>
          <Image src={WINTER_VISUALS.menaggio.detail} alt={WINTER_MACRO_ALT[lang]} fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover object-[50%_63%]" quality={95} />
        </motion.div>
        <div className="pointer-events-none absolute inset-4 border border-white/25 md:inset-6" />
        <span className="absolute bottom-7 left-7 text-[9px] uppercase tracking-[0.3em] text-white [text-shadow:0_1px_5px_#000]">SILKinCOM · Menaggio</span>
      </div>
      <div className="flex flex-col justify-center bg-[#11151a] px-8 py-12 md:p-12 lg:p-16">
        <span className="mb-6 text-[9px] uppercase tracking-[0.3em] text-[#e4c06d]">{t.kicker}</span>
        <h3 className="font-display text-5xl font-light leading-[1.02] lg:text-6xl">{t.title}<em className="mt-2 block text-[#e4c06d]">{t.accent}</em></h3>
        <p className="mt-7 max-w-sm text-sm font-light leading-[1.9] text-white/65">{t.body}</p>
        <Link href="/prodotto/menaggio-berretto-cashmere-grigio#macro-ricamo" className="mt-8 inline-flex w-fit items-center gap-3 border-b border-[#e4c06d]/65 pb-2 text-[10px] uppercase tracking-[0.22em] text-[#e4c06d]">{t.cta}<ArrowUpRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
