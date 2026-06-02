'use client';

/**
 * Quarterly accounting report for the commercialista. Pick a quarter, preview
 * the entrate / spese totali / saldo, then download (CSV/PDF) or email it with
 * the full per-transaction CSV attached. The recipient is remembered in
 * localStorage so it does not have to be retyped each quarter.
 */
import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Send, Loader2, CalendarRange } from 'lucide-react';

const EMAIL_KEY = 'silkincom_commercialista_email';

type Totals = { income: number; expense: number; net: number; grossSales: number; bySource: Record<string, number> };

const fmt = (v: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

function quarterOptions(): { value: string; label: string }[] {
  const now = new Date();
  const y0 = now.getFullYear();
  const q0 = Math.floor(now.getMonth() / 3) + 1; // 1..4
  const out: { value: string; label: string }[] = [];
  let y = y0, q = q0;
  for (let i = 0; i < 8; i++) {
    out.push({ value: `${y}-Q${q}`, label: `${q}º trimestre ${y}` });
    q -= 1;
    if (q < 1) { q = 4; y -= 1; }
  }
  return out;
}

export function QuarterlyReportPanel() {
  const quarters = useMemo(quarterOptions, []);
  const [quarter, setQuarter] = useState(quarters[0].value);
  const [email, setEmail] = useState('');
  const [summary, setSummary] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    try { const e = localStorage.getItem(EMAIL_KEY); if (e) setEmail(e); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/financial/export?quarter=${quarter}&format=json`)
      .then((r) => r.json())
      .then((j) => { if (alive) setSummary(j.totals ?? null); })
      .catch(() => { if (alive) setSummary(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [quarter]);

  function saveEmail(v: string) {
    setEmail(v);
    try { localStorage.setItem(EMAIL_KEY, v.trim()); } catch { /* ignore */ }
  }

  function download(format: 'csv' | 'pdf') {
    window.open(`/api/admin/financial/export?quarter=${quarter}&format=${format}`, '_blank');
  }

  async function send() {
    const to = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { setMsg({ kind: 'err', text: 'Inserisci una email valida del commercialista' }); return; }
    const qLabel = quarters.find((q) => q.value === quarter)?.label ?? quarter;
    if (!confirm(`Inviare il report del ${qLabel} a ${to}?`)) return;
    setSending(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/financial/email-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, quarter }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMsg({ kind: 'ok', text: `Report ${j.period} inviato a ${to} (${j.count} movimenti).` });
    } catch (e) { setMsg({ kind: 'err', text: (e as Error).message }); } finally { setSending(false); }
  }

  const saldo = summary?.net ?? 0;

  return (
    <div className="border border-gold-primary/40 bg-ivory/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarRange className="w-4 h-4 text-gold-primary" />
        <h3 className="text-[11px] uppercase tracking-[0.3em] text-soft-black font-medium">Report trimestrale — commercialista</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5">
        {/* Controls */}
        <div className="space-y-3 min-w-[260px]">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Trimestre</label>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="w-full border border-pearl-grey bg-white px-3 py-2 text-sm capitalize focus:outline-none focus:border-soft-black">
              {quarters.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Email commercialista</label>
            <input type="email" value={email} onChange={(e) => saveEmail(e.target.value)} placeholder="commercialista@studio.it" className="w-full border border-pearl-grey bg-white px-3 py-2 text-sm focus:outline-none focus:border-soft-black" />
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            <button onClick={() => download('csv')} className="inline-flex items-center gap-2 px-3 py-2 border border-pearl-grey hover:border-soft-black text-[10px] uppercase tracking-[0.2em] transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => download('pdf')} className="inline-flex items-center gap-2 px-3 py-2 border border-pearl-grey hover:border-soft-black text-[10px] uppercase tracking-[0.2em] transition-colors">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={send} disabled={sending} className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-40">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Invia
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="border-l border-pearl-grey/60 lg:pl-5">
          {loading ? (
            <p className="text-xs text-soft-grey">Calcolo…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Box label="Entrate (vendite)" value={`+${fmt(summary?.income ?? 0)}`} tone="pos" />
              <Box label="Spese totali" value={`−${fmt(summary?.expense ?? 0)}`} tone="neg" />
              <Box label="Saldo" value={`${saldo < 0 ? '−' : '+'}${fmt(Math.abs(saldo))}`} tone={saldo >= 0 ? 'pos' : 'neg'} strong />
            </div>
          )}
          {summary && (
            <p className="text-[11px] text-soft-grey/80 mt-3">
              Vendite lorde {fmt(summary.grossSales)} · canali:{' '}
              {Object.entries(summary.bySource).map(([s, v]) => `${s.toUpperCase()} ${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`).join(' · ') || '—'}
            </p>
          )}
          {msg && (
            <p className={`text-xs mt-3 ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Box({ label, value, tone, strong }: { label: string; value: string; tone: 'pos' | 'neg'; strong?: boolean }) {
  const color = tone === 'pos' ? 'text-emerald-700' : 'text-red-700';
  return (
    <div className={`border border-pearl-grey bg-white px-3 py-2.5 ${strong ? 'bg-ivory/60' : ''}`}>
      <p className="text-[9px] uppercase tracking-[0.2em] text-soft-grey">{label}</p>
      <p className={`font-display ${strong ? 'text-xl' : 'text-lg'} tabular-nums leading-none mt-1 ${color}`}>{value}</p>
    </div>
  );
}
