'use client';

/**
 * One-click SEO fix button for /admin/etsy/catalogo (write mode).
 * Pushes derived materials to every listing missing them, via the
 * confirm-gated /api/etsy/fix-materials endpoint.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, Loader2 } from 'lucide-react';

export function EtsyFixMaterialsButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (count === 0) return null;

  async function run() {
    if (!confirm(
      `Completo i materiali su ${count} inserzioni Etsy (derivati dal titolo: ` +
      `seta / cashmere / lana / lino / cotone).\n\nScrive su Etsy. Continuare?`,
    )) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/etsy/fix-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`✓ ${data.fixed} completati${data.failed ? `, ${data.failed} falliti` : ''}.`);
        router.refresh();
      } else {
        setMsg(data.error || 'Errore');
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-soft-grey">{msg}</span>}
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2 text-[10px] uppercase tracking-[0.2em] border border-gold-primary bg-gold-primary/10 text-gold-dark hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
        Completa materiali ({count})
      </button>
    </div>
  );
}
