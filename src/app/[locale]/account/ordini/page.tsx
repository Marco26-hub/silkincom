'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { Package, ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { AccountShell } from '@/components/account/AccountShell';
import { createBrowserClient } from '@/lib/supabase/client';

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
};

export default function OrdiniPage() {
  const t = useTranslations('account.orders');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, currency, created_at')
        .order('created_at', { ascending: false });
      setOrders((data as OrderRow[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <AccountShell title={t('title')}>
      {loading ? (
        <p className="text-sm text-soft-black/60 font-light">{tc('loading')}</p>
      ) : orders.length === 0 ? (
        <div className="bg-ivory border border-pearl-grey/60 px-8 py-14 text-center">
          <Package className="w-10 h-10 text-gold-primary stroke-1 mx-auto mb-5" />
          <p className="font-display font-light text-xl mb-3">{t('empty')}</p>
          <p className="text-sm text-soft-black/60 font-light mb-7 max-w-md mx-auto">
            {t('emptySuggestion')}
          </p>
          <Link
            href="/collezioni"
            className="inline-flex items-center gap-2 px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-all duration-500"
          >
            {tn('collections')}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-pearl-grey/40 border border-pearl-grey/60">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/ordini/${o.id}`}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-4 sm:items-center px-6 py-5 hover:bg-ivory transition-colors group"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold-primary mb-1">
                  {t('orderNumber')} {o.order_number || `#${o.id.slice(0, 8)}`}
                </p>
                <p className="text-sm text-soft-black/70 font-light">
                  {new Date(o.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] px-3 py-1 border border-pearl-grey">
                {t(`status.${o.status}` as any)}
              </span>
              <span className="font-display text-lg">€ {o.total_amount.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4 text-soft-black/40 group-hover:text-gold-primary group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
