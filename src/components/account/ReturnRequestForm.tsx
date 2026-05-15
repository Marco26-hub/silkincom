'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const REASONS: { value: string; label: string }[] = [
  { value: 'defective', label: 'Prodotto difettoso' },
  { value: 'wrong_item', label: 'Prodotto sbagliato' },
  { value: 'not_as_described', label: 'Non come descritto' },
  { value: 'damaged_shipping', label: 'Danneggiato in spedizione' },
  { value: 'too_small', label: 'Taglia troppo piccola' },
  { value: 'too_large', label: 'Taglia troppo grande' },
  { value: 'changed_mind', label: 'Ho cambiato idea' },
  { value: 'other', label: 'Altro motivo' },
];

export function ReturnRequestForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string; rn?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, reason, customer_notes: notes }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ type: 'success', text: data.message, rn: data.return_number });
      } else {
        setResult({ type: 'error', text: data.error || 'Errore' });
      }
    } catch {
      setResult({ type: 'error', text: 'Errore di rete' });
    } finally {
      setLoading(false);
    }
  }

  if (result?.type === 'success') {
    return (
      <div className="border border-gold-primary/40 bg-ivory p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark mb-2">
          Richiesta inviata
        </p>
        <p className="font-display text-lg mb-1">{result.rn}</p>
        <p className="text-sm font-light text-soft-black/70">{result.text}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-soft-black border-b border-pearl-grey hover:border-gold-primary hover:text-gold-primary pb-0.5 transition-colors"
      >
        Richiedi reso
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-pearl-grey/60 p-6 space-y-5 bg-warm-white">
      <div>
        <h3 className="font-display text-xl mb-1">Richiesta reso</h3>
        <p className="text-xs text-soft-black/60 font-light">
          Hai 14 giorni dalla consegna per richiedere un reso. Il reso è gratuito.
        </p>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/70 mb-2">
          Motivo del reso *
        </label>
        <select
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm focus:outline-none focus:border-gold-primary"
        >
          <option value="">Seleziona un motivo</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-soft-black/70 mb-2">
          Note aggiuntive (facoltativo)
        </label>
        <textarea
          rows={4}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Descrivi il motivo del reso o eventuali dettagli utili..."
          className="w-full px-4 py-3 border border-pearl-grey bg-warm-white text-sm leading-relaxed focus:outline-none focus:border-gold-primary resize-none"
        />
      </div>

      {result?.type === 'error' && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-4 py-3" role="alert">
          {result.text}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !reason}
          className="px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-60"
        >
          {loading ? 'Invio…' : 'Invia richiesta'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-8 py-3 border border-pearl-grey text-soft-black text-[10px] uppercase tracking-[0.3em] hover:border-gold-primary"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
