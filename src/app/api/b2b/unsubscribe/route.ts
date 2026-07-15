import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyLeadPublicToken } from '@/lib/lead-public-links';
import { APP_URL } from '@/lib/app-url';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function redirect(status: 'done' | 'error') {
  return NextResponse.redirect(`${APP_URL}/it/b2b/stop?${status}=1`, 303);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 6, 60_000);
  if (limited) return limited;

  const formData = await req.formData().catch(() => null);
  const leadId = String(formData?.get('lead') || '').trim();
  const token = String(formData?.get('token') || '').trim();

  if (!leadId || !token || !verifyLeadPublicToken(leadId, 'stop', token)) {
    return redirect('error');
  }

  const supabase = createServiceClient();
  const { data: lead } = await supabase
    .from('lead_accounts')
    .select('id, contact_email, do_not_contact')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return redirect('error');
  if (lead.do_not_contact) return redirect('done');

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('lead_accounts')
    .update({
      status: 'do_not_contact',
      do_not_contact: true,
      stop_requested_at: now,
      updated_at: now,
    })
    .eq('id', leadId);

  if (error) return redirect('error');

  const { error: inboundInsertError } = await supabase
    .from('lead_inbound_messages')
    .insert({
      lead_id: leadId,
      from_email: lead.contact_email || `lead-${leadId}@stop.silkincom.com`,
      to_email: 'b2b@silkincom.com',
      subject: 'STOP via pagina SILKinCOM',
      message_excerpt: 'Il contatto ha confermato la richiesta STOP dalla pagina pubblica.',
      raw_payload: { source: 'public_stop_confirmation' },
      intent: 'stop',
      matched_newsletter: false,
      received_at: now,
    });

  if (inboundInsertError) {
    console.error('B2B STOP tracking insert failed:', inboundInsertError);
  }

  return redirect('done');
}
