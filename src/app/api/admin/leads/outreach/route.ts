import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import {
  buildLeadOutreachCopy,
  LEAD_OUTREACH_FALLBACK_IMAGES,
  composeLeadTargetingNotes,
  getLeadOutreachProductSlugs,
  getLeadOutreachDeliveryMetrics,
  isLeadFocusCoherent,
  isSafeLeadOutreachLink,
  isTargetingNoteSpecific,
  resolveLeadOutreachImage,
} from '@/lib/lead-discovery';
import { loadLeadOutreachProductImages } from '@/lib/lead-outreach-images';
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
  let productImages;
  try {
    productImages = await loadLeadOutreachProductImages(supabase);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Catalogo immagini B2B non disponibile',
      },
      { status: 503 },
    );
  }
  const missingProductImages = getLeadOutreachProductSlugs(
    parsed.data.focus,
  ).filter(
    (slug) =>
      !resolveLeadOutreachImage(
        parsed.data.productImageOverrides?.[slug],
        productImages[slug],
        LEAD_OUTREACH_FALLBACK_IMAGES[slug],
      ),
  );
  if (missingProductImages.length > 0) {
    return NextResponse.json(
      {
        error: `Invio bloccato: mancano le foto DB o manuali per ${missingProductImages.join(', ')}.`,
      },
      { status: 409 },
    );
  }
  const { data: leads, error: leadError } = await supabase
    .from('lead_accounts')
    .select('*')
    .in('id', parsed.data.leadIds);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const results: Array<{
    leadId: string;
    ok: boolean;
    email?: string;
    jobId?: string;
    manualRecipient?: boolean;
    error?: string;
  }> = [];

  for (const lead of leads ?? []) {
    if (lead.do_not_contact || lead.status === 'do_not_contact') {
      results.push({ leadId: lead.id, ok: false, error: 'Skipped: do not contact' });
      continue;
    }
    const originalRecipientEmail = lead.contact_email || null;
    const overrideRecipientEmail =
      parsed.data.recipientEmailOverrides?.[lead.id]?.trim() || null;
    const recipientEmail = overrideRecipientEmail || originalRecipientEmail;
    const isManualRecipient = Boolean(
      overrideRecipientEmail &&
        overrideRecipientEmail.toLowerCase() !==
          (originalRecipientEmail || '').toLowerCase(),
    );

    if (!recipientEmail) {
      results.push({ leadId: lead.id, ok: false, error: 'Manca email di contatto' });
      continue;
    }
    const targetingNotes = composeLeadTargetingNotes(
      lead.notes,
      parsed.data.notes
    );
    if (!isLeadFocusCoherent(lead.industry, parsed.data.focus)) {
      results.push({ leadId: lead.id, ok: false, error: 'Focus non coerente con il settore del lead' });
      continue;
    }
    if (!isTargetingNoteSpecific(targetingNotes)) {
      results.push({ leadId: lead.id, ok: false, error: 'Manca un motivo specifico per il contatto' });
      continue;
    }

    const copy = buildLeadOutreachCopy(
      {
        id: lead.id,
        company_name: lead.company_name,
        city: lead.city,
        country: lead.country,
        contact_name: lead.contact_name,
        website_url: lead.website_url,
      },
      parsed.data.focus,
      targetingNotes,
      {
        productImages,
        productImageOverrides: parsed.data.productImageOverrides,
        isTestRecipient: isManualRecipient,
      },
    );
    const invalidLinks = copy.links.filter(
      (link) => !isSafeLeadOutreachLink(link.url),
    );
    if (invalidLinks.length > 0) {
      results.push({
        leadId: lead.id,
        ok: false,
        error: `Invio bloccato: link non validi (${invalidLinks.map((link) => link.label).join(', ')}).`,
      });
      continue;
    }
    const deliveryMetrics = getLeadOutreachDeliveryMetrics(copy);
    if (
      deliveryMetrics.textWords > 210 ||
      deliveryMetrics.htmlBytes > 25_000 ||
      deliveryMetrics.imageCount > 2 ||
      deliveryMetrics.linkCount > 2
    ) {
      results.push({
        leadId: lead.id,
        ok: false,
        error:
          'Invio bloccato: il messaggio supera i limiti del primo contatto (210 parole, 25 KB, 2 immagini, 2 link).',
      });
      continue;
    }

    try {
      const { data: job, error: jobError } = await supabase.from('lead_outreach_jobs').insert({
        lead_id: lead.id,
        recipient_email: recipientEmail,
        subject: copy.subject,
        html_body: copy.html,
        text_body: copy.text,
        focus: parsed.data.focus,
        status: 'queued',
        created_by: auth.userId,
        campaign_name: isManualRecipient
          ? 'b2b_collaboration_manual_preview'
          : 'b2b_collaboration',
      }).select('id').single();

      if (jobError || !job) {
        throw new Error(jobError?.message || 'Impossibile creare il job');
      }

      await sendB2BLeadOutreachEmail({
        to: recipientEmail,
        subject: copy.subject,
        html: copy.html,
        text: copy.text,
        isTest: isManualRecipient,
      });

      if (!isManualRecipient) {
        await supabase
          .from('lead_accounts')
          .update({
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
            email_sent_count: Number(lead.email_sent_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
      }

      await supabase
        .from('lead_outreach_jobs')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', job.id);

      results.push({
        leadId: lead.id,
        ok: true,
        email: recipientEmail,
        jobId: job.id,
        manualRecipient: isManualRecipient,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore invio';
      const { data: failedJob } = await supabase
        .from('lead_outreach_jobs')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('recipient_email', recipientEmail)
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
    previewConfirmed: parsed.data.previewConfirmed,
    productImageOverrides: parsed.data.productImageOverrides,
    recipientEmailOverrides: parsed.data.recipientEmailOverrides,
    manualRecipientCount: results.filter((result) => result.manualRecipient).length,
  });

  return NextResponse.json({ ok: true, results });
}
