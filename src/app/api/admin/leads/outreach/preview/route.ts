import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import {
  buildLeadOutreachCopy,
  composeLeadTargetingNotes,
  isLeadFocusCoherent,
  isTargetingNoteSpecific,
} from '@/lib/lead-discovery';
import { loadLeadOutreachProductImages } from '@/lib/lead-outreach-images';
import { createServiceClient } from '@/lib/supabase/server';
import { leadOutreachPreviewSchema } from '@/lib/validations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ValidationCheck = {
  label: string;
  ok: boolean;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const body = await req.json();
  const parsed = leadOutreachPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Dati non validi' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const productImages = await loadLeadOutreachProductImages(supabase);
  const { data: leads, error: leadError } = await supabase
    .from('lead_accounts')
    .select('*')
    .in('id', parsed.data.leadIds);

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));
  const previews = parsed.data.leadIds.flatMap((leadId) => {
    const lead = leadById.get(leadId);
    if (!lead) return [];

    const targetingNotes = composeLeadTargetingNotes(
      lead.notes,
      parsed.data.notes,
    );
    const copy = buildLeadOutreachCopy(
      {
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
      },
    );
    const checks: ValidationCheck[] = [
      {
        label: 'Destinatario email presente',
        ok: Boolean(lead.contact_email),
      },
      {
        label: 'Contatto autorizzato e senza richiesta STOP',
        ok: !lead.do_not_contact && lead.status !== 'do_not_contact',
      },
      {
        label: 'Oggetto personalizzato',
        ok: copy.subject.includes(lead.company_name),
      },
      {
        label: 'Focus coerente con il settore del lead',
        ok: isLeadFocusCoherent(lead.industry, parsed.data.focus),
      },
      {
        label: 'Motivo reale e specifico inserito',
        ok: isTargetingNoteSpecific(targetingNotes),
      },
      {
        label: 'Logo ufficiale SILKinCOM presente',
        ok: copy.html.includes('/logo-official.png'),
      },
      {
        label: 'Foto prodotto presenti da DB o override manuale',
        ok: copy.html.includes('<img class="product-image"'),
      },
      {
        label: 'Call to action riservata presente',
        ok: copy.html.includes('Richiedi il concept riservato'),
      },
      {
        label: 'Istruzione STOP presente',
        ok: copy.text.toLowerCase().includes('stop'),
      },
    ];

    return [
      {
        leadId: lead.id,
        companyName: lead.company_name,
        recipientEmail: lead.contact_email,
        subject: copy.subject,
        html: copy.html,
        text: copy.text,
        valid: checks.every((check) => check.ok),
        checks,
      },
    ];
  });

  return NextResponse.json({
    ok: true,
    previews,
    requestedCount: parsed.data.leadIds.length,
  });
}
