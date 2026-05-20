'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import type { StaticPageBlock } from '@/data/static-pages';

type I18nMap = Partial<Record<string, string>>;

function pick(map: I18nMap | undefined, locale: string, fallback = ''): string {
  if (!map) return fallback;
  return map[locale] || map.en || map.it || fallback;
}

export function StaticPageBlocks({ blocks, locale }: { blocks: StaticPageBlock[]; locale: string }) {
  return (
    <>
      {blocks.map((b) => {
        switch (b.type) {
          case 'hero':
            return <HeroBlock key={b.id} block={b} locale={locale} />;
          case 'section':
            return <SectionBlock key={b.id} block={b} locale={locale} />;
          case 'image-text':
            return <ImageTextBlock key={b.id} block={b} locale={locale} />;
          case 'gallery':
            return <GalleryBlock key={b.id} block={b} locale={locale} />;
          case 'cta':
            return <CtaBlock key={b.id} block={b} locale={locale} />;
          case 'quote':
            return <QuoteBlock key={b.id} block={b} locale={locale} />;
          case 'list':
            return <ListBlock key={b.id} block={b} locale={locale} />;
          case 'faq':
            return <FaqBlock key={b.id} block={b} locale={locale} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function HeroBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'hero' }>; locale: string }) {
  const eyebrow = pick(block.eyebrow_i18n, locale);
  const title = pick(block.title_i18n, locale);
  const accent = pick(block.accent_i18n, locale);
  const subtitle = pick(block.subtitle_i18n, locale);
  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      {block.image_url ? (
        <Image
          src={block.image_url}
          alt={title || 'SILKinCOM'}
          fill
          priority
          sizes="100vw"
          className="object-cover scale-[1.03] transition-transform [transition-duration:3000ms] ease-out"
        />
      ) : (
        <div className="absolute inset-0 bg-soft-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-soft-black/50 via-soft-black/20 to-soft-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-soft-black/40 to-transparent" />
      <div className="relative z-10 h-full flex items-end pb-20 md:items-center md:pb-0">
        <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-10 text-warm-white">
          {eyebrow ? (
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-6"
            >
              {eyebrow}
            </motion.span>
          ) : null}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="font-display font-light text-5xl md:text-7xl lg:text-[88px] leading-[1.05] max-w-3xl"
          >
            {title}
            {accent ? (
              <>
                {' '}
                <em className="italic text-gold-primary">{accent}</em>
              </>
            ) : null}
          </motion.h1>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="text-lg font-light text-warm-white/85 max-w-xl mt-8 leading-relaxed"
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SectionBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'section' }>; locale: string }) {
  const title = pick(block.title_i18n, locale);
  const body = pick(block.body_i18n, locale);
  return (
    <section className="py-24 bg-warm-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl mx-auto px-6"
      >
        {title ? (
          <h2 className="font-display font-light text-4xl md:text-5xl mb-8 leading-[1.1] text-center">
            {title}
          </h2>
        ) : null}
        {body ? (
          <div className="text-base font-light leading-relaxed text-soft-black/80 space-y-4 whitespace-pre-line">
            {body}
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}

function ImageTextBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'image-text' }>; locale: string }) {
  const title = pick(block.title_i18n, locale);
  const body = pick(block.body_i18n, locale);
  const position = block.image_position || 'left';
  const imageFirst = position === 'left';
  return (
    <section className="py-24 bg-ivory overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {imageFirst ? (
          <ImageHalf url={block.image_url} alt={title} />
        ) : null}
        <motion.div
          initial={{ opacity: 0, x: imageFirst ? 60 : -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          {title ? (
            <h2 className="font-display font-light text-4xl md:text-5xl mb-8 leading-[1.1]">
              {title}
            </h2>
          ) : null}
          {body ? (
            <div className="text-base font-light leading-relaxed text-soft-black/80 space-y-4 whitespace-pre-line">
              {body}
            </div>
          ) : null}
        </motion.div>
        {!imageFirst ? (
          <ImageHalf url={block.image_url} alt={title} />
        ) : null}
      </div>
    </section>
  );
}

function ImageHalf({ url, alt }: { url?: string; alt?: string }) {
  if (!url) return <div className="aspect-[4/5] bg-pearl-grey" />;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative aspect-[4/5] overflow-hidden"
    >
      <Image src={url} alt={alt || ''} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
    </motion.div>
  );
}

function GalleryBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'gallery' }>; locale: string }) {
  const images = block.images || [];
  if (images.length === 0) return null;
  return (
    <section className="py-24 bg-warm-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => {
          const caption = pick(img.caption_i18n, locale);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: (i % 4) * 0.1 }}
              className="relative aspect-square overflow-hidden group"
            >
              <Image
                src={img.url}
                alt={caption || ''}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {caption ? (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-soft-black/70 to-transparent p-3">
                  <p className="text-warm-white text-xs">{caption}</p>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function CtaBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'cta' }>; locale: string }) {
  const text = pick(block.text_i18n, locale);
  const href = block.href || '/';
  const primary = (block.variant || 'primary') === 'primary';
  const cls = primary
    ? 'inline-flex items-center gap-3 px-8 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300'
    : 'inline-flex items-center gap-3 px-8 py-4 border border-soft-black text-soft-black text-[11px] uppercase tracking-[0.25em] hover:bg-soft-black hover:text-warm-white transition-all duration-300';
  const isExternal = href.startsWith('http');
  return (
    <section className="py-16 bg-warm-white">
      <div className="max-w-3xl mx-auto px-6 text-center">
        {isExternal ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {text}
          </a>
        ) : (
          <Link href={href} className={cls}>
            {text}
          </Link>
        )}
      </div>
    </section>
  );
}

function QuoteBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'quote' }>; locale: string }) {
  const quote = pick(block.quote_i18n, locale);
  const author = pick(block.author_i18n, locale);
  return (
    <section className="py-24 bg-ivory">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="max-w-3xl mx-auto px-6 text-center"
      >
        <p className="text-xl md:text-2xl font-display italic text-soft-black/80 leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
        {author ? (
          <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-gold-primary">— {author}</p>
        ) : null}
      </motion.div>
    </section>
  );
}

function ListBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'list' }>; locale: string }) {
  const title = pick(block.title_i18n, locale);
  const items = (block.items_i18n || []).map((m) => pick(m, locale)).filter(Boolean);
  if (items.length === 0 && !title) return null;
  return (
    <section className="py-24 bg-warm-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="max-w-2xl mx-auto px-6"
      >
        {title ? (
          <h2 className="font-display font-light text-3xl md:text-4xl mb-8 text-center">
            {title}
          </h2>
        ) : null}
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-3 text-base font-light text-soft-black/85">
              <span className="text-gold-primary mt-1.5">◆</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}

function FaqBlock({ block, locale }: { block: Extract<StaticPageBlock, { type: 'faq' }>; locale: string }) {
  const title = pick(block.title_i18n, locale);
  const items = block.items || [];
  if (items.length === 0 && !title) return null;
  return (
    <section className="py-24 bg-warm-white">
      <div className="max-w-3xl mx-auto px-6">
        {title ? (
          <h2 className="font-display font-light text-4xl md:text-5xl mb-10 text-center">
            {title}
          </h2>
        ) : null}
        <div className="divide-y divide-pearl-grey border-y border-pearl-grey">
          {items.map((it, i) => {
            const q = pick(it.q_i18n, locale);
            const a = pick(it.a_i18n, locale);
            return (
              <details key={i} className="group py-5">
                <summary className="flex justify-between items-start gap-4 cursor-pointer list-none">
                  <span className="font-display text-lg text-soft-black">{q}</span>
                  <span className="text-gold-primary text-xl transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-soft-black/75 font-light leading-relaxed whitespace-pre-line">{a}</p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
