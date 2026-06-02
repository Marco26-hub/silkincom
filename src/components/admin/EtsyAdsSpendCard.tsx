'use client';

/**
 * Etsy Ads spend — month-by-month, with PDF export.
 *
 * Etsy has no public Ads API, but the ad charges flow through the
 * payment-account ledger into financial_records (source=etsy). This card reads
 * the ad-only slice per month and links the PDF report
 * (/api/admin/financial/export?adsOnly=1).
 */
import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Download, Loader2 } from 'lucide-react';

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

export function EtsyAdsSpendCard() {
  const months = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  }, []);

  const [month, setMonth] = useState(months[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ count: number; totals: { net: number; fee: number } } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/financial/export?adsOnly=1&format=json&month=${month}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month]);

  const spend = data ? Math.abs(data.totals?.net ?? 0) : 0;

  return (
    <div className="border border-pearl-grey bg-white p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#F1641E]" /> Etsy Ads — spesa mensile
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-pearl-grey px-3 py-1.5 text-xs bg-white"
          >
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button
            onClick={() => window.open(`/api/admin/financial/export?adsOnly=1&format=pdf&month=${month}`, '_blank')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-pearl-grey hover:border-soft-black text-[10px] uppercase tracking-[0.2em] transition-colors"
          >
            <Download className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-soft-grey text-sm flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> …</p>
      ) : (
        <div className="flex items-baseline gap-3">
          <p className="font-display text-3xl text-[#F1641E]">€{spend.toFixed(2)}</p>
          <p className="text-xs text-soft-grey">{data?.count ?? 0} addebiti Ads · {monthLabel(month)}</p>
        </div>
      )}
      <p className="text-[11px] text-soft-grey mt-3 leading-relaxed">
        Etsy non ha API Ads pubblica: la spesa arriva dal ledger Etsy (sezione Fatture). Se è 0 ma hai speso,
        fai «Sincronizza ora» su Fatture. Il PDF è scaricabile per il commercialista.
      </p>
    </div>
  );
}
