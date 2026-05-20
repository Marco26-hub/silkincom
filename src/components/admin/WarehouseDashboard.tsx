'use client';

import { useState, useTransition } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import {
  Package, AlertTriangle, XCircle, Activity, RotateCcw, Truck,
  ArrowDownCircle, ArrowUpCircle, Download, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InventoryAdjustForm } from '@/components/admin/InventoryAdjustForm';
import { QuickStockModal } from '@/components/admin/QuickStockModal';

type Kpis = {
  products: number;
  unitsAvailable: number;
  unitsReserved: number;
  value: number;
  lowStock: number;
  outStock: number;
  movementsToday: number;
  openReturns: number;
  openPO: number;
};

type InventoryRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity_total: number;
  quantity_available: number;
  quantity_reserved: number;
  warehouse_location: string | null;
  last_restocked_at: string | null;
  reorder_threshold: number | null;
  reorder_quantity: number | null;
  supplier_name: string | null;
  supplier_sku: string | null;
  products: { name: string; slug: string; sku: string; status: string; price: number } | null;
  product_variants: { id: string; variant_sku: string; size: string | null } | null;
};

type Movement = {
  id: string;
  movement_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  performed_at: string;
  reference_order_id: string | null;
  products: { name: string; sku: string; slug: string } | null;
};

type ReturnRow = {
  id: string;
  return_number: string;
  status: string;
  reason: string;
  refund_amount: number | null;
  refund_method: string | null;
  refunded_at: string | null;
  created_at: string;
  order_id: string;
  customer_id: string;
};

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_name: string;
  status: string;
  total_cost: number | null;
  expected_delivery: string | null;
  received_at: string | null;
  created_at: string;
};

const TABS = [
  { key: 'giacenze', label: 'Giacenze', icon: Package },
  { key: 'movimenti', label: 'Movimenti', icon: Activity },
  { key: 'fornitori', label: 'Fornitori', icon: Truck },
  { key: 'resi', label: 'Resi', icon: RotateCcw },
] as const;

function eur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function num(n: number) {
  return new Intl.NumberFormat('it-IT').format(n);
}

export function WarehouseDashboard({
  kpis,
  activeTab,
  activeFilter,
  inventory,
  movements,
  returns,
  purchaseOrders,
}: {
  kpis: Kpis;
  activeTab: 'giacenze' | 'movimenti' | 'fornitori' | 'resi';
  activeFilter: 'all' | 'low' | 'out';
  inventory: InventoryRow[];
  movements: Movement[];
  returns: ReturnRow[];
  purchaseOrders: PurchaseOrder[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [quickMode, setQuickMode] = useState<'in' | 'out' | null>(null);
  const [search, setSearch] = useState('');

  function navTab(tab: string) {
    startTransition(() => router.push(`/admin/magazzino?tab=${tab}`));
  }

  function navFilter(filter: string) {
    startTransition(() => router.push(`/admin/magazzino?tab=giacenze&filter=${filter}`));
  }

  const filteredInventory = search
    ? inventory.filter((i) => {
        const q = search.toLowerCase();
        return (
          i.products?.name?.toLowerCase().includes(q) ||
          i.products?.sku?.toLowerCase().includes(q) ||
          i.products?.slug?.toLowerCase().includes(q) ||
          i.product_variants?.variant_sku?.toLowerCase().includes(q) ||
          i.product_variants?.size?.toLowerCase().includes(q)
        );
      })
    : inventory;

  return (
    <div className="space-y-8 max-w-[1500px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-light mb-1">Magazzino</h1>
          <p className="text-sm text-soft-grey">
            Giacenze, movimenti carico/scarico, ordini fornitori e resi in un unico pannello.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQuickMode('in')}
            className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Carico rapido
          </button>
          <button
            type="button"
            onClick={() => setQuickMode('out')}
            className="inline-flex items-center gap-2 border border-soft-black text-soft-black px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-soft-black hover:text-warm-white transition-all duration-300"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Scarico rapido
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Prodotti" value={num(kpis.products)} icon={Package} />
        <KpiCard label="Valore magazzino" value={eur(kpis.value)} icon={Package} accent />
        <KpiCard label="Scorta bassa" value={num(kpis.lowStock)} icon={AlertTriangle} tone={kpis.lowStock > 0 ? 'amber' : 'neutral'} />
        <KpiCard label="Esauriti" value={num(kpis.outStock)} icon={XCircle} tone={kpis.outStock > 0 ? 'red' : 'neutral'} />
        <KpiCard label="Movimenti oggi" value={num(kpis.movementsToday)} icon={Activity} />
        <KpiCard label="Resi aperti" value={num(kpis.openReturns)} icon={RotateCcw} tone={kpis.openReturns > 0 ? 'amber' : 'neutral'} />
      </div>

      {/* Tabs */}
      <div className="border-b border-pearl-grey">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navTab(tab.key)}
                className={`relative inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.2em] transition-colors ${
                  active ? 'text-soft-black' : 'text-soft-grey hover:text-soft-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {active ? (
                  <motion.span
                    layoutId="warehouse-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-gold-primary"
                    transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          {activeTab === 'giacenze' ? (
            <GiacenzeTab
              rows={filteredInventory}
              search={search}
              setSearch={setSearch}
              activeFilter={activeFilter}
              onFilter={navFilter}
            />
          ) : null}
          {activeTab === 'movimenti' ? <MovimentiTab rows={movements} /> : null}
          {activeTab === 'fornitori' ? <FornitoriTab rows={purchaseOrders} /> : null}
          {activeTab === 'resi' ? <ResiTab rows={returns} /> : null}
        </motion.div>
      </AnimatePresence>

      {/* Quick stock modal */}
      <AnimatePresence>
        {quickMode ? (
          <QuickStockModal
            mode={quickMode}
            inventory={inventory.map((i) => ({
              product_id: i.product_id,
              variant_id: i.variant_id,
              name: i.products?.name ?? '—',
              sku: i.product_variants?.variant_sku ?? i.products?.sku ?? '',
              size: i.product_variants?.size ?? null,
              available: i.quantity_available,
            }))}
            onClose={() => setQuickMode(null)}
            onDone={() => {
              setQuickMode(null);
              startTransition(() => router.refresh());
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, accent, tone,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  accent?: boolean;
  tone?: 'neutral' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-700' : accent ? 'text-gold-dark' : 'text-soft-black';
  const accentBorder =
    accent ? 'before:bg-gold-primary' : tone === 'red' ? 'before:bg-red-600' : tone === 'amber' ? 'before:bg-amber-500' : 'before:bg-transparent';
  return (
    <div
      className={`relative border border-pearl-grey bg-white px-5 py-4 flex flex-col gap-1 transition-all duration-300 hover:border-soft-black/30 hover:shadow-[0_6px_20px_-12px_rgba(20,20,20,0.18)] hover:-translate-y-px before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] ${accentBorder}`}
    >
      <div className="flex items-center justify-between text-soft-grey">
        <span className="text-[10px] uppercase tracking-[0.22em]">{label}</span>
        <Icon className="w-3.5 h-3.5 opacity-50" />
      </div>
      <p className={`font-display text-[28px] font-light tabular-nums leading-none ${toneClass}`}>{value}</p>
    </div>
  );
}

function GiacenzeTab({
  rows, search, setSearch, activeFilter, onFilter,
}: {
  rows: InventoryRow[];
  search: string;
  setSearch: (s: string) => void;
  activeFilter: 'all' | 'low' | 'out';
  onFilter: (f: string) => void;
}) {
  function exportCsv() {
    const header = ['SKU', 'Prodotto', 'Taglia', 'Disponibile', 'Riservato', 'Totale', 'Soglia riordino', 'Fornitore', 'Ultima ricarica'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        r.product_variants?.variant_sku ?? r.products?.sku ?? '',
        `"${(r.products?.name ?? '').replace(/"/g, '""')}"`,
        r.product_variants?.size ?? '',
        r.quantity_available,
        r.quantity_reserved,
        r.quantity_total,
        r.reorder_threshold ?? '',
        `"${(r.supplier_name ?? '').replace(/"/g, '""')}"`,
        r.last_restocked_at ? new Date(r.last_restocked_at).toISOString().slice(0, 10) : '',
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magazzino-giacenze-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-0 text-xs uppercase tracking-[0.22em] border-b border-pearl-grey">
          {[['all', 'Tutti'], ['low', 'Scorta bassa'], ['out', 'Esauriti']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => onFilter(k)}
              className={`relative px-4 py-2.5 transition-colors ${
                activeFilter === k
                  ? 'text-soft-black'
                  : 'text-soft-grey hover:text-soft-black'
              }`}
            >
              {label}
              {activeFilter === k ? (
                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-gold-primary" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soft-grey" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca SKU o nome..."
              className="pl-8 pr-3 py-2 text-xs border border-pearl-grey w-64 focus:outline-none focus:border-soft-black"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-pearl-grey hover:border-soft-black"
            title="Esporta CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.22em] text-soft-grey">
              <th className="px-5 py-3.5 font-medium">Prodotto</th>
              <th className="px-5 py-3.5 font-medium">Taglia</th>
              <th className="px-5 py-3.5 font-medium">SKU</th>
              <th className="px-5 py-3.5 font-medium text-right">Disponibile</th>
              <th className="px-5 py-3.5 font-medium text-right">Riservato</th>
              <th className="px-5 py-3.5 font-medium text-right">Totale</th>
              <th className="px-5 py-3.5 font-medium text-right">Soglia</th>
              <th className="px-5 py-3.5 font-medium">Fornitore</th>
              <th className="px-5 py-3.5 font-medium text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/50">
            {rows.map((r, idx) => {
              const low = r.quantity_available > 0 && r.quantity_available < (r.reorder_threshold ?? 5);
              const out = r.quantity_available === 0;
              const prev = idx > 0 ? rows[idx - 1] : null;
              const isFirstOfGroup = !prev || prev.product_id !== r.product_id;
              const sku = r.product_variants?.variant_sku ?? r.products?.sku ?? '';
              const isVariant = r.variant_id !== null;
              return (
                <tr
                  key={r.id}
                  className={`group transition-colors hover:bg-pearl-grey/20 ${
                    out ? 'bg-red-50/30' : low ? 'bg-amber-50/25' : ''
                  } ${isFirstOfGroup && idx > 0 ? 'border-t-2 border-pearl-grey' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium relative">
                    {out ? (
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-600" />
                    ) : low ? (
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500" />
                    ) : (
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-gold-primary transition-colors" />
                    )}
                    {isFirstOfGroup ? (
                      r.products?.name ?? '—'
                    ) : (
                      <span className="pl-5 text-soft-grey/50 text-xs">↳</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {r.product_variants?.size ? (
                      <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 text-[10px] font-medium tracking-wider bg-soft-black text-warm-white uppercase">
                        {r.product_variants.size}
                      </span>
                    ) : isVariant ? (
                      <span className="text-xs text-soft-grey">—</span>
                    ) : (
                      <span className="text-xs text-soft-grey/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-soft-grey">{sku}</td>
                  <td className={`px-5 py-3.5 text-right font-medium tabular-nums ${out ? 'text-red-700' : low ? 'text-amber-700' : ''}`}>
                    {r.quantity_available}
                  </td>
                  <td className="px-5 py-3.5 text-right text-soft-grey tabular-nums">{r.quantity_reserved}</td>
                  <td className="px-5 py-3.5 text-right text-soft-grey tabular-nums">{r.quantity_total}</td>
                  <td className="px-5 py-3.5 text-right text-soft-grey tabular-nums">{r.reorder_threshold ?? '–'}</td>
                  <td className="px-5 py-3.5 text-xs text-soft-grey">{r.supplier_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <InventoryAdjustForm
                      productId={r.product_id}
                      variantId={r.variant_id}
                      currentAvailable={r.quantity_available}
                      currentTotal={r.quantity_total}
                      productName={r.products?.name ?? undefined}
                      sizeLabel={r.product_variants?.size ?? null}
                    />
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={9} className="px-5 py-16">
                  <EmptyState icon={Package} title="Nessun prodotto in giacenza" hint="Aggiungi prodotti dal catalogo o esegui un carico rapido per popolare le scorte." />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Package;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-6">
      <div className="w-12 h-12 rounded-full bg-pearl-grey/30 border border-pearl-grey flex items-center justify-center text-soft-grey">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-display text-lg text-soft-black font-light">{title}</p>
        {hint ? <p className="text-xs text-soft-grey mt-1 max-w-sm">{hint}</p> : null}
      </div>
    </div>
  );
}

const MOVEMENT_LABEL: Record<string, { label: string; color: string }> = {
  inbound: { label: 'Carico', color: 'bg-green-100 text-green-700' },
  outbound: { label: 'Scarico', color: 'bg-amber-100 text-amber-800' },
  sale: { label: 'Vendita', color: 'bg-blue-100 text-blue-700' },
  return: { label: 'Reso', color: 'bg-purple-100 text-purple-700' },
  adjustment: { label: 'Rettifica', color: 'bg-gray-100 text-gray-700' },
  cancellation: { label: 'Cancellazione', color: 'bg-red-100 text-red-700' },
  damage: { label: 'Danno', color: 'bg-red-100 text-red-700' },
  inventory_count: { label: 'Inventario', color: 'bg-gray-100 text-gray-700' },
};

function MovimentiTab({ rows }: { rows: Movement[] }) {
  return (
    <div className="border border-pearl-grey bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-warm-white border-b border-pearl-grey">
          <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
            <th className="px-5 py-3 font-medium">Quando</th>
            <th className="px-5 py-3 font-medium">Prodotto</th>
            <th className="px-5 py-3 font-medium">Tipo</th>
            <th className="px-5 py-3 font-medium text-right">Δ</th>
            <th className="px-5 py-3 font-medium text-right">Prima → Dopo</th>
            <th className="px-5 py-3 font-medium">Motivo</th>
            <th className="px-5 py-3 font-medium">Ordine</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pearl-grey/60">
          {rows.map((m) => {
            const meta = MOVEMENT_LABEL[m.movement_type] ?? { label: m.movement_type, color: 'bg-gray-100 text-gray-700' };
            return (
              <tr key={m.id} className="transition-colors hover:bg-pearl-grey/20">
                <td className="px-5 py-3.5 text-xs text-soft-grey whitespace-nowrap tabular-nums">
                  {new Date(m.performed_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-5 py-3.5 font-medium">{m.products?.name ?? '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center text-[9px] uppercase tracking-[0.2em] px-2 py-1 ${meta.color}`}>
                    {meta.label}
                  </span>
                </td>
                <td className={`px-5 py-3.5 text-right font-display text-base tabular-nums ${m.quantity_change > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                </td>
                <td className="px-5 py-3.5 text-right text-soft-grey tabular-nums text-xs">
                  {m.quantity_before} <span className="text-gold-primary mx-0.5">→</span> {m.quantity_after}
                </td>
                <td className="px-5 py-3.5 text-xs">{m.reason ?? '—'}</td>
                <td className="px-5 py-3.5 text-xs">
                  {m.reference_order_id ? (
                    <Link href={`/admin/ordini/${m.reference_order_id}`} className="text-gold-primary hover:underline">vedi</Link>
                  ) : '—'}
                </td>
              </tr>
            );
          })}
          {!rows.length ? (
            <tr>
              <td colSpan={7} className="px-5 py-16">
                <EmptyState icon={Activity} title="Nessun movimento registrato" hint="Vendite, carichi, scarichi e rettifiche compaiono qui in tempo reale." />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function FornitoriTab({ rows }: { rows: PurchaseOrder[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin/ordini-fornitori"
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
        >
          Gestione completa fornitori
        </Link>
      </div>
      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">PO #</th>
              <th className="px-5 py-3 font-medium">Fornitore</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Totale</th>
              <th className="px-5 py-3 font-medium">Consegna prevista</th>
              <th className="px-5 py-3 font-medium">Ricevuto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/50">
            {rows.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-pearl-grey/20">
                <td className="px-5 py-3.5 font-mono text-xs">{p.po_number}</td>
                <td className="px-5 py-3.5 font-medium">{p.supplier_name}</td>
                <td className="px-5 py-3.5 text-[10px] uppercase tracking-[0.2em] text-soft-grey">{p.status}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">{p.total_cost != null ? eur(p.total_cost) : '–'}</td>
                <td className="px-5 py-3.5 text-xs text-soft-grey">{p.expected_delivery ?? '–'}</td>
                <td className="px-5 py-3.5 text-xs text-soft-grey">{p.received_at ? new Date(p.received_at).toLocaleDateString('it-IT') : '–'}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-16">
                  <EmptyState icon={Truck} title="Nessun ordine fornitore aperto" hint="Crea un PO dalla pagina Gestione completa per riassortire le scorte." />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RETURN_STATUS: Record<string, { label: string; color: string }> = {
  requested: { label: 'Richiesto', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approvato', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Rifiutato', color: 'bg-red-100 text-red-700' },
  received: { label: 'Ricevuto', color: 'bg-purple-100 text-purple-700' },
  refunded: { label: 'Rimborsato', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annullato', color: 'bg-gray-100 text-gray-700' },
};

function ResiTab({ rows }: { rows: ReturnRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin/resi"
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300"
        >
          Gestione completa resi
        </Link>
      </div>
      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Reso #</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium">Motivo</th>
              <th className="px-5 py-3 font-medium text-right">Rimborso</th>
              <th className="px-5 py-3 font-medium">Aperto il</th>
              <th className="px-5 py-3 font-medium">Rimborsato il</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/50">
            {rows.map((r) => {
              const s = RETURN_STATUS[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-700' };
              return (
                <tr key={r.id} className="transition-colors hover:bg-pearl-grey/20">
                  <td className="px-5 py-3.5 font-mono text-xs">{r.return_number}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center text-[9px] uppercase tracking-[0.2em] px-2 py-1 ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-soft-grey">{r.reason}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{r.refund_amount != null ? eur(r.refund_amount) : '–'}</td>
                  <td className="px-5 py-3.5 text-xs text-soft-grey">{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
                  <td className="px-5 py-3.5 text-xs text-soft-grey">{r.refunded_at ? new Date(r.refunded_at).toLocaleDateString('it-IT') : '–'}</td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-16">
                  <EmptyState icon={RotateCcw} title="Nessun reso aperto" hint="I resi avviati dai clienti compaiono qui con stato e importo rimborso." />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
