import { createServiceClient } from '@/lib/supabase/server';
import { isMerchantConfigured, merchantConfig } from '@/lib/google-merchant/client';
import { MerchantAdmin } from '@/components/admin/MerchantAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Google Merchant — Admin SILKinCOM', robots: { index: false } };

export default async function AdminMerchantPage() {
  const supabase = createServiceClient();

  const { data: rows, count } = await supabase
    .from('google_merchant_products')
    .select('rest_id, offer_id, content_language, title, destination_status, issues, availability, price, currency, synced_at', { count: 'exact' })
    .order('destination_status', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true })
    .limit(300);

  const counts = { total: count ?? 0, approved: 0, pending: 0, disapproved: 0 };
  let lastSync: string | null = null;
  for (const r of rows ?? []) {
    const s = (r.destination_status || '').toLowerCase();
    if (s === 'approved') counts.approved++;
    else if (s === 'disapproved') counts.disapproved++;
    else counts.pending++;
    if (!lastSync || (r.synced_at && r.synced_at > lastSync)) lastSync = r.synced_at;
  }

  return (
    <MerchantAdmin
      configured={isMerchantConfigured()}
      merchantId={merchantConfig().merchantId || null}
      counts={counts}
      lastSync={lastSync}
      products={(rows ?? []) as never[]}
    />
  );
}
