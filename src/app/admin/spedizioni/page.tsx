'use client';

import { useEffect, useRef, useState } from 'react';
import { Truck, Download, Upload, AlertTriangle } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type ReorderAlert = {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_available: number;
  reorder_threshold: number;
  reorder_quantity: number;
  supplier_name: string | null;
  cost_price: number | null;
  estimated_cost: number | null;
};

export default function SpedizioniPage() {
  const [pendingShipments, setPendingShipments] = useState(0);
  const [reorderAlerts, setReorderAlerts] = useState<ReorderAlert[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ updated: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'processing'])
      .is('tracking_number', null);
    setPendingShipments(count || 0);

    const { data: alerts } = await supabase.from('reorder_alerts').select('*').limit(50);
    setReorderAlerts((alerts as ReorderAlert[]) || []);
  }

  useEffect(() => { load(); }, []);

  async function importTracking(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/admin/orders/import-tracking', { method: 'POST', body: fd });
    const data = await res.json();
    setImportResult(data);
    if (fileRef.current) fileRef.current.value = '';
    setImporting(false);
    load();
  }

  return (
    <div className="space-y-8 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <Truck className="w-6 h-6 text-gold-primary" />
        <div>
          <h1 className="font-display text-4xl">Spedizioni & Riordini</h1>
          <p className="text-soft-grey text-sm">Packlink PRO + alert magazzino</p>
        </div>
      </div>

      <div className="border border-pearl-grey bg-white p-6 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.15em]">Packlink PRO</h2>
        <p className="text-xs text-soft-grey">
          {pendingShipments} ordini da spedire. Esporta CSV → carica su pro.packlink.it → genera etichette → importa tracking.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/orders/export-packlink"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Esporta CSV ({pendingShipments})
          </a>
          <label className={`inline-flex items-center gap-2 px-6 py-2.5 cursor-pointer text-[10px] uppercase tracking-[0.2em] border transition-colors ${importing ? 'opacity-50' : 'border-soft-black hover:bg-soft-black hover:text-warm-white'}`}>
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importazione...' : 'Importa tracking CSV'}
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={importTracking} disabled={importing} className="hidden" />
          </label>
        </div>
        {importResult && (
          <div className={`text-xs px-3 py-2 ${importResult.errors?.length ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {importResult.updated} ordini aggiornati. {importResult.errors?.length ? `${importResult.errors.length} errori.` : ''}
            {importResult.errors?.length > 0 && (
              <ul className="mt-1 list-disc list-inside">
                {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="bg-ivory border border-pearl-grey/60 p-3 text-xs text-soft-grey">
          <strong>Setup Packlink:</strong> 1) Login pro.packlink.it · 2) Importa CSV · 3) Genera etichette · 4) Esporta tracking · 5) Carica qui.
        </div>
      </div>

      <div className="border border-pearl-grey bg-white">
        <div className="px-6 py-4 border-b border-pearl-grey flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <h2 className="text-sm font-medium uppercase tracking-[0.15em]">Riordini necessari ({reorderAlerts.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Prodotto</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium text-right">Stock</th>
              <th className="px-5 py-3 font-medium text-right">Soglia</th>
              <th className="px-5 py-3 font-medium text-right">Riordino</th>
              <th className="px-5 py-3 font-medium">Fornitore</th>
              <th className="px-5 py-3 font-medium text-right">Costo stimato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {reorderAlerts.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-soft-grey text-sm">Tutti i prodotti hanno stock sufficiente.</td></tr>
            ) : reorderAlerts.map((a) => (
              <tr key={a.product_id}>
                <td className="px-5 py-3">{a.product_name}</td>
                <td className="px-5 py-3 text-xs font-mono">{a.sku}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`px-2 py-0.5 text-xs ${a.quantity_available === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {a.quantity_available}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-soft-grey">{a.reorder_threshold}</td>
                <td className="px-5 py-3 text-right">{a.reorder_quantity}</td>
                <td className="px-5 py-3 text-xs">{a.supplier_name || '—'}</td>
                <td className="px-5 py-3 text-right">{a.estimated_cost ? `€${Number(a.estimated_cost).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
