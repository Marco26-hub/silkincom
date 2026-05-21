'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { HomeSectionLocalized } from '@/data/home-content';

export function AnnouncementBar({ section }: { section?: HomeSectionLocalized | null }) {
  const t = useTranslations('announcement');
  const c = section?.content || {};
  // Up to 4 admin-editable messages (msg1..msg4). Strip empty ones so admins
  // can disable a slot by clearing the field. Falls back to messages.json
  // legacy `announcement.messages` array if the DB row isn't populated.
  const dbMessages = ['msg1', 'msg2', 'msg3', 'msg4']
    .map((k) => c[k])
    .filter((s): s is string => Boolean(s && s.trim()));
  const fallback = (t.raw('messages') as string[]) || [];
  const messages = dbMessages.length > 0 ? dbMessages : fallback;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="bg-soft-black text-warm-white text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.4em] py-2.5 overflow-hidden h-9 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-center h-full">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-center"
          >
            {messages[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
