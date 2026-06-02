'use client';

/**
 * Warehouse cost editor — sits on the product-level row of the Giacenze table.
 * Edits the net purchase cost + purchase VAT and previews the gross landed
 * cost and the real margin against the (VAT-inclusive) sell price. Same premium
 * portal-popover language as InventoryAdjustForm.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Tag, X } from 'lucide-react';

const POPOVER_W = 360;
// Consumer sell price is stored VAT-inclusive (Italy, 22% on these goods).
// Used only to preview the margin — not persisted.
const SALE_VAT = 22;

const fmt = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

export function ProductCostForm({
  productId,
  productName,
  currentCost,
  currentVat,
  sellPrice,
}: {
  productId: string;
  productName?: string;
  currentCost: number | null;
  currentVat: number;
  sellPrice: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState(currentCost != null ? String(currentCost) : '');
  const [vat, setVat] = useState(String(currentVat ?? 22));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const right = Math.min(r.right, window.innerWidth - 12);
    setPos({ top: r.bottom + 8, left: right - POPOVER_W });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focus = requestAnimationFrame(() => inputRef.current?.focus());
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    function onScroll() { close(); }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(focus);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    setErr(null);
    setOk(false);
    setBusy(false);
    setCost(currentCost != null ? String(currentCost) : '');
    setVat(String(currentVat ?? 22));
  }

  const costN = useMemo(() => {
    const v = Number(cost);
    return Number.isFinite(v) && cost !== '' ? v : null;
  }, [cost]);
  const vatN = useMemo(() => {
    const v = Number(vat);
    return Number.isFinite(v) ? v : 0;
  }, [vat]);

  const costGross = costN != null ? costN * (1 + vatN / 100) : null;
  const sellNet = sellPrice / (1 + SALE_VAT / 100);
  const margin = costN != null ? sellNet - costN : null;
  const marginPct = margin != null && sellNet > 0 ? (margin / sellNet) * 100 : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (costN != null && costN < 0) {
      setErr('Costo non valido');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/inventory/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          cost_price: cost === '' ? null : costN,
          purchase_vat_rate: vatN,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setOk(true);
      setBusy(false);
      setTimeout(() => { router.refresh(); close(); }, 800);
    } catch (caught) {
      setErr((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] border border-pearl-grey hover:border-soft-black hover:bg-soft-black hover:text-warm-white transition-all duration-300"
      >
        <Tag className="w-3 h-3" />
        Costo
      </button>

      {mounted ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={popRef}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
              style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_W, zIndex: 60 }}
              className="bg-warm-white shadow-[0_20px_60px_-15px_rgba(20,20,20,0.25)] border border-pearl-grey"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-[3px] bg-gradient-to-r from-gold-primary via-gold-dark to-gold-primary" />

              <div className="flex items-start justify-between px-5 py-4 border-b border-pearl-grey/70">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gold-primary mb-1">Magazzino</p>
                  <h3 className="font-display text-xl font-light leading-none">Costo &amp; margine</h3>
                  {productName ? (
                    <p className="text-xs text-soft-grey mt-1.5 truncate max-w-[280px]">{productName}</p>
                  ) : null}
                </div>
                <button type="button" onClick={close} className="text-soft-grey hover:text-soft-black -mt-1 -mr-1 p-1" aria-label="Chiudi">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {ok ? (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.25 }}
                    className="px-5 py-10 flex flex-col items-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                      <Check className="w-7 h-7 text-green-700" />
                    </div>
                    <p className="font-display text-lg">Costo aggiornato</p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={submit}
                    className="px-5 py-4 space-y-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-[0.22em] text-soft-grey mb-2">
                          Costo netto €
                        </label>
                        <input
                          ref={inputRef}
                          type="number"
                          step="0.01"
                          min="0"
                          value={cost}
                          onChange={(e) => { setCost(e.target.value); setErr(null); }}
                          placeholder="es. 18,50"
                          className="w-full px-3 py-2.5 text-lg font-display border border-pearl-grey focus:outline-none focus:border-soft-black tabular-nums bg-white"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] uppercase tracking-[0.22em] text-soft-grey mb-2">IVA %</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={vat}
                          onChange={(e) => { setVat(e.target.value); setErr(null); }}
                          className="w-full px-3 py-2.5 text-lg font-display border border-pearl-grey focus:outline-none focus:border-soft-black tabular-nums bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Costo lordo" value={costGross != null ? fmt(costGross) : '—'} />
                      <Stat label="Vendita netta" value={fmt(sellNet)} />
                      <Stat
                        label="Margine"
                        value={margin != null ? fmt(margin) : '—'}
                        tone={margin == null ? 'mute' : margin >= 0 ? 'pos' : 'neg'}
                      />
                      <Stat
                        label="Marginalità"
                        value={marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
                        tone={marginPct == null ? 'mute' : marginPct >= 0 ? 'pos' : 'neg'}
                      />
                    </div>

                    <p className="text-[10px] text-soft-grey/70 leading-relaxed">
                      Margine = vendita netta (prezzo ÷ {1 + SALE_VAT / 100}) − costo netto. Lascia il costo vuoto per azzerarlo.
                    </p>

                    <AnimatePresence>
                      {err ? (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="border-l-2 border-red-600 bg-red-50 text-red-800 px-3 py-2 text-xs">{err}</div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-soft-black text-warm-white px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-50 transition-colors"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Salva costo
                      </button>
                      <button type="button" onClick={close} className="px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] border border-pearl-grey hover:border-soft-black transition-colors">
                        Annulla
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      ) : null}
    </>
  );
}

function Stat({ label, value, tone = 'mute' }: { label: string; value: string; tone?: 'pos' | 'neg' | 'mute' }) {
  const color = tone === 'pos' ? 'text-emerald-700' : tone === 'neg' ? 'text-red-700' : 'text-soft-black';
  return (
    <div className="bg-pearl-grey/20 border border-pearl-grey/40 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.2em] text-soft-grey">{label}</p>
      <p className={`font-display text-base tabular-nums leading-none mt-1 ${color}`}>{value}</p>
    </div>
  );
}
