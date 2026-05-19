'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Ruler } from 'lucide-react';

const SIZES = [
  { key: 'foulardSmall', dimensions: '65 × 65 cm' },
  { key: 'foulardMedium', dimensions: '90 × 90 cm' },
  { key: 'scarfLong', dimensions: '45 × 180 cm' },
  { key: 'shawlLarge', dimensions: '140 × 140 cm' },
  { key: 'stole', dimensions: '70 × 200 cm' },
];

export function SizeGuideModal() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('sizeGuide');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-gold-primary border-b border-gold-primary/40 hover:border-gold-primary pb-0.5 transition-colors"
      >
        <Ruler className="w-3 h-3" />
        {t('buttonLabel')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-soft-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-warm-white max-w-lg w-full p-8 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-soft-black/40 hover:text-soft-black transition-colors"
              aria-label={t('close')}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display font-light text-2xl mb-1">{t('heading')}</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-6">SILKinCOM · Como</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pearl-grey">
                    <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('colFormat')}</th>
                    <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('colDimensions')}</th>
                    <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('colUsage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZES.map((s) => (
                    <tr key={s.key} className="border-b border-pearl-grey/40">
                      <td className="py-3 font-light">{t(`sizes.${s.key}.name`)}</td>
                      <td className="py-3 font-light text-soft-black/70">{s.dimensions}</td>
                      <td className="py-3 font-light text-soft-black/60 text-xs">{t(`sizes.${s.key}.usage`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-soft-black/50 mt-6 font-light">
              {t('note')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
