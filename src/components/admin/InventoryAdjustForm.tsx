'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, Pencil, X, ArrowRight } from 'lucide-react';

const PRESETS = [
  'Inventario fisico',
  'Errore conteggio',
  'Danno / Difetto',
  'Furto / Smarrimento',
  'Campionario / Press loan',
  'Correzione manuale',
];

const POPOVER_W = 360;

export function InventoryAdjustForm({
  productId,
  currentAvailable,
  currentTotal,
  productName,
}: {
  productId: string;
  currentAvailable: number;
  currentTotal: number;
  productName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
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
    const top = r.bottom + 8;
    setPos({ top, left: right - POPOVER_W });
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
    // Close only on page-level scroll (window event, not capture) — inner
    // overflow-y-auto containers inside the popover do NOT bubble scroll
    // to window, so the popover stays open while the user scrolls the
    // radio list.
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
    setDelta('');
    setReason('');
    setReasonOther('');
    setErr(null);
    setOk(false);
    setBusy(false);
  }

  const n = useMemo(() => {
    const v = Number(delta);
    return Number.isFinite(v) ? v : 0;
  }, [delta]);
  const newTotal = currentTotal + n;
  const newAvailable = currentAvailable + n;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (n === 0) {
      setErr('Inserisci una quantità diversa da 0');
      return;
    }
    const effective = reason === '__other__' ? reasonOther.trim() : reason;
    if (!effective) {
      setErr('Seleziona un motivo per la rettifica');
      return;
    }
    if (newAvailable < 0) {
      setErr(`Il nuovo disponibile sarebbe ${newAvailable}, impossibile scendere sotto 0`);
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          quantity_change: n,
          reason: effective,
          movement_type: 'adjustment',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setOk(true);
      setBusy(false);
      setTimeout(() => {
        router.refresh();
        close();
      }, 900);
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
        <Pencil className="w-3 h-3 transition-transform group-hover:rotate-[-8deg]" />
        Rettifica
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
                  <h3 className="font-display text-xl font-light leading-none">Rettifica giacenza</h3>
                  {productName ? (
                    <p className="text-xs text-soft-grey mt-1.5 truncate max-w-[280px]">{productName}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="text-soft-grey hover:text-soft-black -mt-1 -mr-1 p-1"
                  aria-label="Chiudi"
                >
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
                    <div className="text-center">
                      <p className="font-display text-lg">Giacenza aggiornata</p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-soft-grey mt-1">
                        Nuovo disponibile: <span className="text-soft-black tabular-nums">{newAvailable}</span>
                      </p>
                    </div>
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
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.22em] text-soft-grey mb-2">
                        Variazione
                      </label>
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="number"
                          value={delta}
                          onChange={(e) => { setDelta(e.target.value); setErr(null); }}
                          placeholder="es. 5  oppure  -3"
                          className="w-full px-4 py-3 text-lg font-display border border-pearl-grey focus:outline-none focus:border-soft-black tabular-nums bg-white transition-colors"
                        />
                        {n !== 0 ? (
                          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] ${n > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                            {n > 0 ? 'Carico' : 'Scarico'}
                          </span>
                        ) : null}
                      </div>

                      {n !== 0 ? (
                        <div className="mt-3 flex items-center gap-3 text-xs px-3 py-2 bg-pearl-grey/25 border border-pearl-grey/40">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.22em] text-soft-grey">Disponibile</p>
                            <p className="font-display text-base tabular-nums leading-none mt-0.5">{currentAvailable}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-gold-primary" />
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.22em] text-soft-grey">Nuovo</p>
                            <p className={`font-display text-base tabular-nums leading-none mt-0.5 ${newAvailable < 0 ? 'text-red-700' : 'text-soft-black'}`}>
                              {newAvailable}
                            </p>
                          </div>
                          {currentTotal !== currentAvailable ? (
                            <div className="ml-auto text-right">
                              <p className="text-[9px] uppercase tracking-[0.22em] text-soft-grey">Totale</p>
                              <p className="text-[11px] tabular-nums leading-none mt-0.5">
                                {currentTotal} → <strong>{newTotal}</strong>
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.22em] text-soft-grey mb-2">
                        Motivo
                      </label>
                      <div className="border border-pearl-grey divide-y divide-pearl-grey/50 max-h-44 overflow-y-auto bg-white">
                        {PRESETS.map((r) => (
                          <label
                            key={r}
                            className={`flex items-center gap-2.5 text-sm cursor-pointer px-3 py-2 transition-colors ${
                              reason === r ? 'bg-pearl-grey/40' : 'hover:bg-pearl-grey/25'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`adj-${productId}`}
                              value={r}
                              checked={reason === r}
                              onChange={(e) => { setReason(e.target.value); setErr(null); }}
                              className="accent-gold-primary"
                            />
                            <span className="text-soft-black">{r}</span>
                          </label>
                        ))}
                        <label
                          className={`flex items-center gap-2.5 text-sm cursor-pointer px-3 py-2 transition-colors ${
                            reason === '__other__' ? 'bg-pearl-grey/40' : 'hover:bg-pearl-grey/25'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`adj-${productId}`}
                            value="__other__"
                            checked={reason === '__other__'}
                            onChange={(e) => { setReason(e.target.value); setErr(null); }}
                            className="accent-gold-primary"
                          />
                          <span className="text-soft-black italic">Altro motivo…</span>
                        </label>
                      </div>
                      {reason === '__other__' ? (
                        <input
                          type="text"
                          value={reasonOther}
                          onChange={(e) => { setReasonOther(e.target.value); setErr(null); }}
                          placeholder="Specifica il motivo"
                          autoFocus
                          className="mt-2 w-full px-3 py-2 text-sm border border-pearl-grey focus:outline-none focus:border-soft-black"
                        />
                      ) : null}
                    </div>

                    <AnimatePresence>
                      {err ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-l-2 border-red-600 bg-red-50 text-red-800 px-3 py-2 text-xs">
                            {err}
                          </div>
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
                        Conferma rettifica
                      </button>
                      <button
                        type="button"
                        onClick={close}
                        className="px-4 py-2.5 text-[10px] uppercase tracking-[0.25em] border border-pearl-grey hover:border-soft-black transition-colors"
                      >
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
