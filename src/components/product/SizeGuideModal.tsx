'use client';

import { useState } from 'react';
import { X, Ruler } from 'lucide-react';

const SIZES = [
  { name: 'Foulard piccolo', dimensions: '65 × 65 cm', usage: 'Da collo, tasca, capelli' },
  { name: 'Foulard medio', dimensions: '90 × 90 cm', usage: 'Classico da collo o spalle' },
  { name: 'Sciarpa lunga', dimensions: '45 × 180 cm', usage: 'Avvolgente, invernale' },
  { name: 'Scialle grande', dimensions: '140 × 140 cm', usage: 'Mantella, coprispalle' },
  { name: 'Stola', dimensions: '70 × 200 cm', usage: 'Spiaggia, cerimonie' },
];

export function SizeGuideModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-gold-primary border-b border-gold-primary/40 hover:border-gold-primary pb-0.5 transition-colors"
      >
        <Ruler className="w-3 h-3" />
        Guida alle misure
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
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display font-light text-2xl mb-1">Guida alle misure</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-6">SILKinCOM · Como</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pearl-grey">
                    <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">Formato</th>
                    <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">Dimensioni</th>
                    <th className="text-left pb-3 text-[10px] uppercase tracking-[0.2em] text-soft-black/60 font-normal">Uso ideale</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZES.map((s, i) => (
                    <tr key={i} className="border-b border-pearl-grey/40">
                      <td className="py-3 font-light">{s.name}</td>
                      <td className="py-3 font-light text-soft-black/70">{s.dimensions}</td>
                      <td className="py-3 font-light text-soft-black/60 text-xs">{s.usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-soft-black/50 mt-6 font-light">
              Le misure sono indicative ±2 cm. Ogni pezzo è lavorato a mano nei nostri atelier di Como.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
