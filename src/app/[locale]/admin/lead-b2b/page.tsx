import { createServiceClient } from '@/lib/supabase/server';
import { LeadB2BPanel } from '@/components/admin/LeadB2BPanel';

export const dynamic = 'force-dynamic';

export default async function AdminLeadB2BPage() {
  const supabase = createServiceClient();
  const { data: leads } = await supabase
    .from('lead_accounts')
    .select('*')
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  const { data: replies } = await supabase
    .from('lead_inbound_messages')
    .select('id, from_email, subject, message_excerpt, intent, received_at, lead_accounts(company_name)')
    .order('received_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Lead B2B</h1>
        <p className="text-soft-grey text-sm">
          Scansione di siti pubblici, qualificazione manuale e invio di offerte di collaborazione tracciate.
        </p>
      </div>

      <LeadB2BPanel initialLeads={(leads ?? []) as any[]} initialReplies={(replies ?? []) as any[]} />
    </div>
  );
}
