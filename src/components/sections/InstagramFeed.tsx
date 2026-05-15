'use client';

import Image from 'next/image';
import { Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';

// Foto reali scrappate dal sito ufficiale silkincom.com (Wix CDN)
const WIX = (id: string) => `https://static.wixstatic.com/media/${id}~mv2.jpg/v1/fill/w_700,h_700,al_c,q_85/file.jpg`;
// Mix prodotti + lifestyle reali silkincom (no placeholder gold-letters)
const PHOTOS = [
  WIX('b58e91_6fa8a67dc30b47898c29a53a97cf8ba9'),
  WIX('b58e91_6e113b7ba95f4d81854d2300b10860e8'),
  WIX('a34b56_88c331613a2942d6bf9ac51c2f3f641c'),
  WIX('a34b56_4cdb7894efaa4a128d5fb0714b80e743'),
  WIX('a34b56_1c703913173a458d848ef300b9e954ba'),
  WIX('a34b56_3a1c36685f104db88a70b86aab6bdb32'),
  WIX('a34b56_a341e8d4e66442e4bc33fcd2476368af'),
  WIX('a34b56_4c95bebbb8a141b4a44c0340182bbe97'),
  WIX('a34b56_c17c8b8c3ed9469baee1b992666ad11b'),
  WIX('a34b56_e76f0bb5106c49df8f2ef2b5d8602b0e'),
  WIX('a34b56_87ba179b67414ed2af2b491235a5a4cc'),
  WIX('a34b56_9f32bcd4e4c842bf9bf898d3fb1ff939'),
  WIX('a34b56_75af23fe386c4fc8b2593d6d7f4bfef6'),
  WIX('a34b56_aeb0f1560658422586c12f4bcaba4409'),
  WIX('a34b56_d75b183cbd8e4daeb85801d5d8b6d3f5'),
  WIX('a34b56_0f40416a402e4011a78dba5f2849cf6f'),
  WIX('b58e91_dad899cd51f3465c824c5e51b98b9126'),
  WIX('a34b56_756da7d9c1614001b06a0f4a8307326f'),
];

export function InstagramFeed() {
  return (
    <section className="py-24 md:py-section bg-warm-white">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10">
        {/* Header */}
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
            Trame di Como su <em className="italic text-gold-primary">Instagram</em>
          </h2>
          <p className="text-sm md:text-base font-light text-soft-black/70 leading-relaxed">
            Il nostro mondo, raccontato un dettaglio alla volta. Seguici per anteprime, edizioni limitate e dietro le quinte.
          </p>
        </motion.div>

        {/* Grid 6 col desktop, 3 mobile */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-1.5 md:gap-2">
          {PHOTOS.map((src, i) => (
            <motion.a
              key={src}
              href="https://www.instagram.com/silkincom.official/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
              className="group relative block aspect-square overflow-hidden bg-ivory"
              aria-label={`SILKinCOM Instagram — foto ${i + 1}`}
            >
              <Image
                src={src}
                alt={`SILKinCOM Instagram ${i + 1}`}
                fill
                sizes="(max-width: 768px) 33vw, 16vw"
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
              />
              {/* Hover gold overlay */}
              <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/55 transition-all duration-500 flex items-center justify-center">
                <Instagram
                  strokeWidth={1.4}
                  className="w-7 h-7 text-warm-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500"
                />
              </div>
            </motion.a>
          ))}
        </div>

        {/* Follow us — multi-social */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-14"
        >
          <span className="block text-[10px] uppercase tracking-[0.5em] text-gold-primary mb-6">
            Seguici sui social
          </span>
          <div className="flex items-center justify-center gap-7">
            <a
              href="https://www.instagram.com/silkincom.official/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @silkincom.official"
              className="group inline-flex flex-col items-center gap-2 text-soft-black hover:text-gold-primary transition-colors"
            >
              <span className="w-12 h-12 flex items-center justify-center border border-soft-black/20 group-hover:border-gold-primary group-hover:bg-gold-primary/5 transition-all rounded-full">
                <Instagram className="w-[18px] h-[18px]" strokeWidth={1.4} />
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em]">Instagram</span>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61581900780447"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook SILKinCOM"
              className="group inline-flex flex-col items-center gap-2 text-soft-black hover:text-gold-primary transition-colors"
            >
              <span className="w-12 h-12 flex items-center justify-center border border-soft-black/20 group-hover:border-gold-primary group-hover:bg-gold-primary/5 transition-all rounded-full">
                <Facebook className="w-[18px] h-[18px]" strokeWidth={1.4} />
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em]">Facebook</span>
            </a>
            <a
              href="https://it.pinterest.com/silkincomofficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pinterest SILKinCOM"
              className="group inline-flex flex-col items-center gap-2 text-soft-black hover:text-gold-primary transition-colors"
            >
              <span className="w-12 h-12 flex items-center justify-center border border-soft-black/20 group-hover:border-gold-primary group-hover:bg-gold-primary/5 transition-all rounded-full">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em]">Pinterest</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
