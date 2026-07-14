import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import { buildLeadOutreachCopy } from '@/lib/lead-discovery';
import { sendB2BLeadOutreachEmail } from '@/lib/email';
import { leadOutreachSchema } from '@/lib/validations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const body = await req.json();
  const parsed = leadOutreachSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dati non validi' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: leads, error: leadError } = await supabase
    .from('lead_accounts')
    .select('*')
    .in('id', parsed.data.leadIds);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const results: Array<{ leadId: string; ok: boolean; email?: string; error?: string }> = [];

  for (const lead of leads ?? []) {
    if (lead.do_not_contact || lead.status === 'do_not_contact') {
      results.push({ leadId: lead.id, ok: false, error: 'Skipped: do not contact' });
      continue;
    }
    if (!lead.contact_email) {
      results.push({ leadId: lead.id, ok: false, error: 'Manca email di contatto' });
      continue;
    }

    const copy = buildLeadOutreachCopy(
      {
        company_name: lead.company_name,
        city: lead.city,
        country: lead.country,
        contact_name: lead.contact_name,
        website_url: lead.website_url,
      },
      parsed.data.focus,
      parsed.data.notes
    );

    try {
      const { data: job, error: jobError } = await supabase.from('lead_outreach_jobs').insert({
        lead_id: lead.id,
        recipient_email: lead.contact_email,
        subject: copy.subject,
        html_body: copy.html,
        text_body: copy.text,
        focus: parsed.data.focus,
        status: 'queued',
        created_by: auth.userId,
        campaign_name: 'b2b_collaboration',
      }).select('id').single();

      if (jobError || !job) {
        throw new Error(jobError?.message || 'Impossibile creare il job');
      }

      await sendB2BLeadOutreachEmail({
        to: lead.contact_email,
        subject: copy.subject,
        html: copy.html,
        text: copy.text,
      });

      await supabase
        .from('lead_accounts')
        .update({
          status: 'contacted',
          last_contacted_at: new Date().toISOString(),
          email_sent_count: Number(lead.email_sent_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      await supabase
        .from('lead_outreach_jobs')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', job.id);

      results.push({ leadId: lead.id, ok: true, email: lead.contact_email });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore invio';
      const { data: failedJob } = await supabase
        .from('lead_outreach_jobs')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('recipient_email', lead.contact_email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (failedJob) {
        await supabase
          .from('lead_outreach_jobs')
          .update({ status: 'failed', last_error: message, updated_at: new Date().toISOString() })
          .eq('id', failedJob.id);
      }
      results.push({ leadId: lead.id, ok: false, error: message });
    }
  }

  await logAdminAction(auth.userId, 'send_lead_outreach', 'lead_account', 'bulk', {
    leadIds: parsed.data.leadIds,
    focus: parsed.data.focus,
    notes: parsed.data.notes,
  });

  return NextResponse.json({ ok: true, results });
}
