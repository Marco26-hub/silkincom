'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Package, ShoppingBag, Undo2, Star } from 'lucide-react';
import { Link } from '@/i18n/navigation';

type Counts = {
  newReturns: number;
  lowStock: number;
  pendingOrders: number;
  pendingReviews: number;
  total: number;
};

export function AdminNotificationBell() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCounts(d); });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!counts) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-soft-black/60 hover:text-soft-black transition-colors"
        aria-label="Notifiche"
      >
        <Bell className="w-5 h-5" />
        {counts.total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center font-medium">
            {counts.total > 9 ? '9+' : counts.total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white border border-pearl-grey shadow-xl z-50">
          <div className="px-4 py-3 border-b border-pearl-grey">
            <p className="text-[11px] uppercase tracking-[0.2em] font-medium">Notifiche</p>
          </div>
          <div className="divide-y divide-pearl-grey/60">
            {counts.pendingOrders > 0 && (
              <Link href="/admin/ordini?status=pending" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-warm-white transition-colors">
                <ShoppingBag className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm flex-1">Ordini pending</span>
                <span className="text-sm font-semibold text-amber-600">{counts.pendingOrders}</span>
              </Link>
            )}
            {counts.newReturns > 0 && (
              <Link href="/admin/resi" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-warm-white transition-colors">
                <Undo2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm flex-1">Nuovi resi</span>
                <span className="text-sm font-semibold text-blue-600">{counts.newReturns}</span>
              </Link>
            )}
            {counts.lowStock > 0 && (
              <Link href="/admin/magazzino" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-warm-white transition-colors">
                <Package className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm flex-1">Scorta critica</span>
                <span className="text-sm font-semibold text-red-600">{counts.lowStock}</span>
              </Link>
            )}
            {counts.pendingReviews > 0 && (
              <Link href="/admin/recensioni" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-warm-white transition-colors">
                <Star className="w-4 h-4 text-gold-primary flex-shrink-0" />
                <span className="text-sm flex-1">Recensioni da approvare</span>
                <span className="text-sm font-semibold text-gold-primary">{counts.pendingReviews}</span>
              </Link>
            )}
            {counts.total === 0 && (
              <p className="px-4 py-6 text-sm text-soft-grey text-center">Nessuna notifica</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
