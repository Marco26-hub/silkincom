'use client';

/**
 * Batch English-translation button for /admin/etsy/catalogo (write mode).
 *
 * Loops over the given listing IDs CLIENT-SIDE, calling the confirm-gated
 * /api/etsy/translate-en endpoint once per listing (one listing per request so
 * no serverless timeout). Shows live progress and surfaces per-listing errors.
 * Each listing's Italian master is translated to an SEO/GEO-optimised English
 * `en` translation on Etsy — the master is never overwritten.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Languages, Loader2 } from 'lucide-react';

export function EtsyTranslateAllButton({
  listingIds,
  lang = 'en',
  label = 'EN',
}: { listingIds: number[]; lang?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (listingIds.length === 0) return null;

  async function run() {
    if (!confirm(
      `Genero e pubblico la traduzione ${label} (AI) per ${listingIds.length} inserzioni Etsy.\n\n` +
      `Ogni traduzione viene aggiunta come traduzione Etsy "${lang}" — NON sovrascrive ` +
      `il listing italiano. Operazione lunga (~10s per inserzione). Continuare?`,
    )) return;

    setBusy(true);
    setMsg(null);
    let done = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of listingIds) {
      try {
        const res = await fetch('/api/etsy/translate-en', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: true, listingId: id, lang }),
        });
        const data = await res.json();
        if (res.ok && data.ok) done++;
        else { failed++; errors.push(`${id}: ${data.error || res.status}`); }
      } catch (e) {
        failed++; errors.push(`${id}: ${(e as Error).message}`);
      }
      setProgress({ done, total: listingIds.length, failed });
    }

    setBusy(false);
    setMsg(
      `✓ ${done} traduzioni pubblicate${failed ? `, ${failed} fallite — ${errors[0] ?? ''}` : ''}.`,
    );
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {busy && progress && (
        <span className="text-xs text-soft-grey">{progress.done}/{progress.total}{progress.failed ? ` · ${progress.failed} err` : ''}…</span>
      )}
      {msg && !busy && <span className="text-xs text-soft-grey max-w-[280px] truncate">{msg}</span>}
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2 text-[10px] uppercase tracking-[0.2em] border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
        Traduci tutti in {label} ({listingIds.length})
      </button>
    </div>
  );
}
