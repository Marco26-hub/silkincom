'use client';

import Image from 'next/image';
import { Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { HomeSectionLocalized } from '@/data/home-content';

const WIX = (id: string) => `https://static.wixstatic.com/media/${id}~mv2.jpg/v1/fill/w_700,h_700,al_c,q_85/file.jpg`;

const FALLBACK_PHOTOS = [
  WIX('b58e91_6fa8a67dc30b47898c29a53a97cf8ba9'),
  WIX('b58e91_6e113b7ba95f4d81854d2300b10860e8'),
  WIX('a34b56_88c331613a2942d6bf9ac51c2f3f641c'),
  WIX('a34b56_4cdb7894efaa4a128d5fb0714b80e743'),
  WIX('a34b56_1c703913173a458d848ef300b9e954ba'),
  WIX('a34b56_3a1c36685f104db88a70b86aab6bdb32'),
];

const FALLBACK_SOCIAL = {
  instagram: 'https://www.instagram.com/silkincom.official/',
  facebook: 'https://www.facebook.com/profile.php?id=61581900780447',
  pinterest: 'https://it.pinterest.com/silkincomofficial',
};

export function InstagramFeed({ section }: { section?: HomeSectionLocalized | null }) {
  const t = useTranslations('instagram');

  const content = section?.content || {};
  const photos = (section?.images?.length ? section.images : FALLBACK_PHOTOS.map((u) => ({ url: u, alt: '' })));
  const socials = (section?.socialLinks && Object.keys(section.socialLinks).length) ? section.socialLinks : FALLBACK_SOCIAL;

  const titleStart = content.titleStart || t('titleStart');
  const titleEmphasis = content.titleEmphasis || t('titleEmphasis');
  const description = content.description || t('description');
  const followEyebrow = content.followEyebrow || t('followEyebrow');

  return (
    <section className="py-24 md:py-section bg-warm-white">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="block text-[11px] uppercase tracking-[0.4em] text-gold-primary mb-4">
            @silkincom.official
          </span>
          <h2 className="font-display font-light text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-5">
            {titleStart} <em className="italic text-gold-primary">{titleEmphasis}</em>
          </h2>
          <p className="text-sm md:text-base font-light text-soft-black/70 leading-relaxed">
            {description}
          </p>
        </motion.div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-1.5 md:gap-2">
          {photos.map((p, i) => {
            const src = p.url;
            const alt = p.alt || t('photoAlt', { number: i + 1 });
            return (
              <motion.a
                key={`${src}-${i}`}
                href={socials.instagram || '#'}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                className="group relative block aspect-square overflow-hidden bg-ivory"
                aria-label={t('photoAriaLabel', { number: i + 1 })}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 33vw, 16vw"
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/55 transition-all duration-500 flex items-center justify-center">
                  <Instagram
                    strokeWidth={1.4}
                    className="w-7 h-7 text-warm-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500"
                  />
                </div>
              </motion.a>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-14"
        >
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-6">
            {followEyebrow}
          </span>
          <div className="flex items-center justify-center gap-7">
            {socials.instagram ? (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="group inline-flex flex-col items-center gap-2 text-soft-black hover:text-gold-primary transition-colors"
              >
                <span className="w-12 h-12 flex items-center justify-center border border-soft-black/20 group-hover:border-gold-primary group-hover:bg-gold-primary/5 transition-all rounded-full">
                  <Instagram className="w-[18px] h-[18px]" strokeWidth={1.4} />
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em]">Instagram</span>
              </a>
            ) : null}
            {socials.facebook ? (
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="group inline-flex flex-col items-center gap-2 text-soft-black hover:text-gold-primary transition-colors"
              >
                <span className="w-12 h-12 flex items-center justify-center border border-soft-black/20 group-hover:border-gold-primary group-hover:bg-gold-primary/5 transition-all rounded-full">
                  <Facebook className="w-[18px] h-[18px]" strokeWidth={1.4} />
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em]">Facebook</span>
              </a>
            ) : null}
            {socials.pinterest ? (
              <a
                href={socials.pinterest}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pinterest"
                className="group inline-flex flex-col items-center gap-2 text-soft-black hover:text-gold-primary transition-colors"
              >
                <span className="w-12 h-12 flex items-center justify-center border border-soft-black/20 group-hover:border-gold-primary group-hover:bg-gold-primary/5 transition-all rounded-full">
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                  </svg>
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em]">Pinterest</span>
              </a>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
