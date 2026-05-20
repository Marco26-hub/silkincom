'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowDownCircle, ArrowUpCircle, Search, Loader2 } from 'lucide-react';

type InventoryItem = {
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string;
  available: number;
};

const REASONS_IN = [
  'Riassortimento da fornitore',
  'Reso accettato e rimesso a scaffale',
  'Trasferimento da altro magazzino',
  'Conteggio inventario (positivo)',
  'Correzione manuale',
];

const REASONS_OUT = [
  'Vendita manuale (non da ordine)',
  'Danno / Difetto',
  'Campionario / Press loan',
  'Trasferimento ad altro magazzino',
  'Conteggio inventario (negativo)',
  'Correzione manuale',
];

export function QuickStockModal({
  mode,
  inventory,
  onClose,
  onDone,
}: {
  mode: 'in' | 'out';
  inventory: InventoryItem[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [reasonOther, setReasonOther] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query) return inventory.slice(0, 8);
    const q = query.toLowerCase();
    return inventory
      .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, inventory]);

  const reasonsList = mode === 'in' ? REASONS_IN : REASONS_OUT;
  const effectiveReason = reason === '__other__' ? reasonOther : reason;
  const movementType = mode === 'in' ? 'inbound' : 'outbound';
  const titleLabel = mode === 'in' ? 'Carico rapido' : 'Scarico rapido';
  const accentIcon = mode === 'in' ? ArrowDownCircle : ArrowUpCircle;
  const Icon = accentIcon;
  const accentColor = mode === 'in' ? 'text-green-700' : 'text-amber-700';

  async function submit() {
    if (!selected) { setErr('Seleziona un prodotto'); return; }
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) { setErr('Quantità non valida'); return; }
    if (!effectiveReason.trim()) { setErr('Inserisci un motivo'); return; }

    setBusy(true);
    setErr(null);

    const delta = mode === 'in' ? n : -n;

    try {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selected.product_id,
          variant_id: selected.variant_id,
          quantity_change: delta,
          reason: effectiveReason,
          movement_type: movementType,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-soft-black/55 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="bg-warm-white border border-pearl-grey w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-grey">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${accentColor}`} />
            <h2 className="font-display text-xl font-light">{titleLabel}</h2>
          </div>
          <button onClick={onClose} className="text-soft-grey hover:text-soft-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {err ? (
            <div className="border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">{err}</div>
          ) : null}

          {/* Product picker */}
          {!selected ? (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Prodotto</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-grey" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca per nome o SKU..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-pearl-grey focus:outline-none focus:border-soft-black"
                />
              </div>
              <div className="border border-pearl-grey divide-y divide-pearl-grey/60 max-h-64 overflow-y-auto bg-white">
                {results.map((r) => (
                  <button
                    key={`${r.product_id}-${r.variant_id ?? ''}`}
                    type="button"
                    onClick={() => setSelected(r)}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-pearl-grey/40 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-[10px] font-mono text-soft-grey">{r.sku}</p>
                    </div>
                    <span className="text-xs text-soft-grey tabular-nums whitespace-nowrap">disp. {r.available}</span>
                  </button>
                ))}
                {!results.length ? (
                  <p className="px-3 py-6 text-center text-xs text-soft-grey">Nessun prodotto trovato</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-pearl-grey/30 px-4 py-3">
              <div>
                <p className="font-medium">{selected.name}</p>
                <p className="text-[10px] font-mono text-soft-grey">
                  {selected.sku} · disp. {selected.available}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-soft-grey hover:text-soft-black underline">
                cambia
              </button>
            </div>
          )}

          {/* Quantity + reason */}
          {selected ? (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">
                  Quantità ({mode === 'in' ? 'in entrata' : 'in uscita'})
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-32 px-3 py-2.5 text-sm border border-pearl-grey focus:outline-none focus:border-soft-black tabular-nums"
                />
                <p className="text-[11px] text-soft-grey mt-1.5">
                  Disponibile dopo: <strong className="tabular-nums">{selected.available + (mode === 'in' ? Number(qty || 0) : -Number(qty || 0))}</strong>
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Motivo</label>
                <div className="space-y-1.5">
                  {reasonsList.map((r) => (
                    <label key={r} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-0.5"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value="__other__"
                      checked={reason === '__other__'}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-0.5"
                    />
                    <span>Altro:</span>
                  </label>
                  {reason === '__other__' ? (
                    <input
                      type="text"
                      value={reasonOther}
                      onChange={(e) => setReasonOther(e.target.value)}
                      placeholder="Specifica il motivo"
                      className="w-full ml-6 px-3 py-2 text-sm border border-pearl-grey focus:outline-none focus:border-soft-black"
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-pearl-grey">
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-5 py-2.5 text-xs uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  Conferma {mode === 'in' ? 'carico' : 'scarico'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs uppercase tracking-[0.25em] border border-pearl-grey hover:border-soft-black"
                >
                  Annulla
                </button>
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
