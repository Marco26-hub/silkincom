'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Ruler } from 'lucide-react';

type SizeGuideMode = 'scarves' | 'apparel';

const SCARVES_SIZES = [
  { key: 'foulardSmall', dimensions: '65 × 65 cm' },
  { key: 'foulardMedium', dimensions: '90 × 90 cm' },
  { key: 'scarfLong', dimensions: '45 × 180 cm' },
  { key: 'shawlLarge', dimensions: '140 × 140 cm' },
  { key: 'stole', dimensions: '70 × 200 cm' },
];

// Apparel measurements are universal (cm), so we hard-code them rather than
// pushing five rows × seven locales into the i18n bundle. The column labels
// are localised via the existing sizeGuide.apparel namespace; numeric values
// stay as-is in every language.
const APPAREL_SIZES = [
  { size: 'S', bust: '88-92 cm', length: '66-68 cm' },
  { size: 'M', bust: '96-100 cm', length: '68-70 cm' },
  { size: 'L', bust: '100-104 cm', length: '70-72 cm' },
  { size: 'XL', bust: '108-112 cm', length: '72-74 cm' },
  { size: 'XXL', bust: '116-120 cm', length: '74-76 cm' },
];

export function SizeGuideModal({ mode = 'scarves' }: { mode?: SizeGuideMode } = {}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('sizeGuide');

  // Lock body scroll while the modal is open. Without this, on iOS Safari the
  // page behind the backdrop scrolls under the modal whenever the user drags
  // — extra-irritating for the size-guide table which itself scrolls.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape (keyboards) + the explicit close button (mouse/touch).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <div
            className="absolute inset-0 bg-soft-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-warm-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-soft-black/60 hover:text-soft-black transition-colors"
              aria-label={t('close')}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display font-light text-2xl mb-1 pr-8">
              {mode === 'apparel' ? t('apparel.heading') : t('heading')}
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-6">SILKinCOM · Como</p>
            <div className="overflow-x-auto">
              {mode === 'apparel' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pearl-grey">
                      <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('apparel.colSize')}</th>
                      <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('apparel.colBust')}</th>
                      <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('apparel.colLength')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {APPAREL_SIZES.map((s) => (
                      <tr key={s.size} className="border-b border-pearl-grey/40">
                        <td className="py-3 font-light">{s.size}</td>
                        <td className="py-3 font-light text-soft-black/70">{s.bust}</td>
                        <td className="py-3 font-light text-soft-black/70">{s.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pearl-grey">
                      <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('colFormat')}</th>
                      <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('colDimensions')}</th>
                      <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">{t('colUsage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCARVES_SIZES.map((s) => (
                      <tr key={s.key} className="border-b border-pearl-grey/40">
                        <td className="py-3 font-light">{t(`sizes.${s.key}.name`)}</td>
                        <td className="py-3 font-light text-soft-black/70">{s.dimensions}</td>
                        <td className="py-3 font-light text-soft-black/60 text-xs">{t(`sizes.${s.key}.usage`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-soft-black/50 mt-6 font-light">
              {mode === 'apparel' ? t('apparel.note') : t('note')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
