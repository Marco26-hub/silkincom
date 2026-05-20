'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Loader2, Check, Pencil, X } from 'lucide-react';

const PRESETS = [
  'Inventario fisico',
  'Errore conteggio',
  'Danno / Difetto',
  'Furto / Smarrimento',
  'Campionario / Press loan',
  'Correzione manuale',
];

export function InventoryAdjustForm({
  productId,
  currentAvailable,
  currentTotal,
}: {
  productId: string;
  currentAvailable: number;
  currentTotal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(() => inputRef.current?.focus());
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(r);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
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
      setErr('Seleziona un motivo');
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
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border border-pearl-grey hover:border-soft-black transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Rettifica
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1 z-30 w-80 bg-white border border-pearl-grey shadow-xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-pearl-grey bg-warm-white">
            <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">Rettifica giacenza</p>
            <button type="button" onClick={close} className="text-soft-grey hover:text-soft-black">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {ok ? (
            <div className="p-8 flex flex-col items-center gap-2 text-green-700">
              <Check className="w-9 h-9" />
              <p className="text-sm">Giacenza aggiornata</p>
            </div>
          ) : (
            <form onSubmit={submit} className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-soft-grey mb-1">
                  Variazione (±N)
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  value={delta}
                  onChange={(e) => { setDelta(e.target.value); setErr(null); }}
                  placeholder="es: 5 oppure -3"
                  className="w-full px-3 py-2 text-sm border border-pearl-grey focus:outline-none focus:border-soft-black tabular-nums"
                />
                {n !== 0 ? (
                  <p className="text-[11px] text-soft-grey mt-1.5">
                    Disponibile: <span className="tabular-nums">{currentAvailable}</span> →{' '}
                    <strong className={`tabular-nums ${newAvailable < 0 ? 'text-red-700' : 'text-soft-black'}`}>
                      {newAvailable}
                    </strong>
                    {currentTotal !== currentAvailable ? (
                      <>
                        {' '}· Totale: <span className="tabular-nums">{currentTotal}</span> →{' '}
                        <strong className="tabular-nums">{newTotal}</strong>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-soft-grey mb-1.5">
                  Motivo
                </label>
                <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1 border border-pearl-grey/50 rounded-sm">
                  {PRESETS.map((r) => (
                    <label key={r} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-pearl-grey/30 px-2 py-1">
                      <input
                        type="radio"
                        name={`adj-${productId}`}
                        value={r}
                        checked={reason === r}
                        onChange={(e) => { setReason(e.target.value); setErr(null); }}
                        className="mt-1"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                  <label className="flex items-start gap-2 text-sm cursor-pointer hover:bg-pearl-grey/30 px-2 py-1">
                    <input
                      type="radio"
                      name={`adj-${productId}`}
                      value="__other__"
                      checked={reason === '__other__'}
                      onChange={(e) => { setReason(e.target.value); setErr(null); }}
                      className="mt-1"
                    />
                    <span>Altro</span>
                  </label>
                </div>
                {reason === '__other__' ? (
                  <input
                    type="text"
                    value={reasonOther}
                    onChange={(e) => { setReasonOther(e.target.value); setErr(null); }}
                    placeholder="Specifica il motivo"
                    className="mt-2 w-full px-3 py-1.5 text-sm border border-pearl-grey focus:outline-none focus:border-soft-black"
                  />
                ) : null}
              </div>

              {err ? (
                <div className="border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-xs">
                  {err}
                </div>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-soft-black text-warm-white px-3 py-2 text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-50 transition-colors"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Conferma
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] border border-pearl-grey hover:border-soft-black transition-colors"
                >
                  Annulla
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
