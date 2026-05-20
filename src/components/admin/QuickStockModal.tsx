'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowDownCircle, ArrowUpCircle, Search, Loader2 } from 'lucide-react';

type InventoryItem = {
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string;
  size: string | null;
  available: number;
};

const SIZE_ORDER: Record<string, number> = {
  XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, XXXL: 6, UNI: 9,
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
  // pickedProductId = step 1 done (product chosen). selected = step 2 done
  // (variant chosen, or only-one-variant product auto-selected).
  const [pickedProductId, setPickedProductId] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [reasonOther, setReasonOther] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group inventory rows by product_id for the picker. One product = one
  // search hit; size selection happens after picking the product.
  const groups = useMemo(() => {
    const map = new Map<string, { product_id: string; name: string; sku: string; rows: InventoryItem[]; totalAvailable: number }>();
    inventory.forEach((i) => {
      const g = map.get(i.product_id);
      if (g) {
        g.rows.push(i);
        g.totalAvailable += i.available;
      } else {
        map.set(i.product_id, {
          product_id: i.product_id,
          name: i.name,
          sku: i.sku,
          rows: [i],
          totalAvailable: i.available,
        });
      }
    });
    map.forEach((g) => {
      g.rows.sort((a, b) => {
        const ao = a.size ? SIZE_ORDER[a.size] ?? 99 : 99;
        const bo = b.size ? SIZE_ORDER[b.size] ?? 99 : 99;
        return ao - bo;
      });
    });
    return Array.from(map.values());
  }, [inventory]);

  const pickedGroup = useMemo(
    () => (pickedProductId ? groups.find((g) => g.product_id === pickedProductId) ?? null : null),
    [pickedProductId, groups]
  );
  const hasSizes = !!pickedGroup && pickedGroup.rows.some((r) => r.size !== null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!query) return groups.slice(0, 8);
    const q = query.toLowerCase();
    return groups
      .filter((g) => g.name.toLowerCase().includes(q) || g.sku.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, groups]);

  function pickProduct(g: { product_id: string; name: string; sku: string; rows: InventoryItem[] }) {
    setPickedProductId(g.product_id);
    setErr(null);
    // If the product has a single variant row (sciarpe / accessori taglia
    // unica), skip the size step entirely.
    if (g.rows.length === 1) {
      setSelected(g.rows[0]);
    }
  }

  const reasonsList = mode === 'in' ? REASONS_IN : REASONS_OUT;
  const effectiveReason = reason === '__other__' ? reasonOther : reason;
  const movementType = mode === 'in' ? 'inbound' : 'outbound';
  const titleLabel = mode === 'in' ? 'Carico rapido' : 'Scarico rapido';
  const accentIcon = mode === 'in' ? ArrowDownCircle : ArrowUpCircle;
  const Icon = accentIcon;
  const accentColor = mode === 'in' ? 'text-green-700' : 'text-amber-700';

  async function submit() {
    if (!pickedGroup) { setErr('Seleziona un prodotto'); return; }
    if (!selected) {
      setErr(hasSizes ? 'Seleziona una taglia' : 'Seleziona un prodotto');
      return;
    }
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

          {/* STEP 1 — product picker */}
          {!pickedGroup ? (
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
                {results.map((g) => {
                  const sizedCount = g.rows.filter((r) => r.size !== null).length;
                  return (
                    <button
                      key={g.product_id}
                      type="button"
                      onClick={() => pickProduct(g)}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-pearl-grey/40 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{g.name}</p>
                        <p className="text-[10px] font-mono text-soft-grey">
                          {g.sku}
                          {sizedCount > 0 ? <span className="ml-2 normal-case font-sans text-soft-grey">· {sizedCount} taglie</span> : null}
                        </p>
                      </div>
                      <span className="text-xs text-soft-grey tabular-nums whitespace-nowrap">disp. {g.totalAvailable}</span>
                    </button>
                  );
                })}
                {!results.length ? (
                  <p className="px-3 py-6 text-center text-xs text-soft-grey">Nessun prodotto trovato</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-pearl-grey/30 px-4 py-3">
              <div>
                <p className="font-medium">
                  {pickedGroup.name}
                  {selected?.size ? (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 text-[9px] font-medium tracking-wider bg-soft-black text-warm-white uppercase">
                      {selected.size}
                    </span>
                  ) : null}
                </p>
                <p className="text-[10px] font-mono text-soft-grey">
                  {selected ? `${selected.sku} · disp. ${selected.available}` : `${pickedGroup.sku} · disp. ${pickedGroup.totalAvailable}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickedProductId(null);
                  setSelected(null);
                  setErr(null);
                }}
                className="text-xs text-soft-grey hover:text-soft-black underline"
              >
                cambia
              </button>
            </div>
          )}

          {/* STEP 2 — size selector (only when product has size variants) */}
          {pickedGroup && hasSizes && !selected ? (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">Taglia</label>
              <div className="grid grid-cols-5 gap-2">
                {pickedGroup.rows.filter((r) => r.size !== null).map((r) => {
                  const disabled = mode === 'out' && r.available <= 0;
                  return (
                    <button
                      key={r.variant_id ?? r.size!}
                      type="button"
                      disabled={disabled}
                      onClick={() => { setSelected(r); setErr(null); }}
                      className={`flex flex-col items-center justify-center border px-2 py-3 transition-colors ${
                        disabled
                          ? 'border-pearl-grey/60 text-soft-grey/50 line-through cursor-not-allowed'
                          : 'border-pearl-grey hover:border-soft-black hover:bg-pearl-grey/20'
                      }`}
                    >
                      <span className="font-display text-base font-light leading-none">{r.size}</span>
                      <span className="text-[9px] uppercase tracking-[0.18em] text-soft-grey mt-1 tabular-nums">
                        {r.available} disp.
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-soft-grey mt-2">Seleziona la taglia su cui registrare il movimento.</p>
            </div>
          ) : null}

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
                  onChange={(e) => { setQty(e.target.value); setErr(null); }}
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
                        onChange={(e) => { setReason(e.target.value); setErr(null); }}
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
                      onChange={(e) => { setReasonOther(e.target.value); setErr(null); }}
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
