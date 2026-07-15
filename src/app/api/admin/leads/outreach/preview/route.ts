import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireAdminApi } from '@/lib/admin-api';
import {
  buildLeadOutreachCopy,
  LEAD_OUTREACH_FALLBACK_IMAGES,
  composeLeadTargetingNotes,
  getLeadOutreachProductSlugs,
  getLeadOutreachDeliveryMetrics,
  isLeadFocusCoherent,
  isMeaningfulLeadOutreachImage,
  isSafeLeadOutreachLink,
  isTargetingNoteSpecific,
  resolveLeadOutreachImage,
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
    const originalRecipientEmail = lead.contact_email || null;
    const overrideRecipientEmail =
      parsed.data.recipientEmailOverrides?.[lead.id]?.trim() || null;
    const recipientEmail = overrideRecipientEmail || originalRecipientEmail;
    const isManualRecipient = Boolean(
      overrideRecipientEmail &&
        overrideRecipientEmail.toLowerCase() !==
          (originalRecipientEmail || '').toLowerCase(),
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
    const placeholderProductImages = getLeadOutreachProductSlugs(
      parsed.data.focus,
    ).filter((slug) =>
      !isMeaningfulLeadOutreachImage(
        resolveLeadOutreachImage(
          parsed.data.productImageOverrides?.[slug],
          productImages[slug],
          LEAD_OUTREACH_FALLBACK_IMAGES[slug],
        ),
      ),
    );
    const invalidLinks = copy.links.filter(
      (link) =>
        !isSafeLeadOutreachLink(link.url) ||
        !copy.html.includes(link.url.replaceAll('&', '&amp;')),
    );
    const deliveryMetrics = getLeadOutreachDeliveryMetrics(copy);
    const checks: ValidationCheck[] = [
      {
        label: isManualRecipient
          ? 'Email di recapito manuale presente'
          : 'Destinatario email presente',
        ok: Boolean(recipientEmail),
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
        label:
          missingProductImages.length === 0
            ? 'Foto prodotto guida presente da DB o override manuale'
            : `Foto mancanti: ${missingProductImages.join(', ')}`,
        ok: missingProductImages.length === 0,
      },
      {
        label:
          placeholderProductImages.length === 0
            ? 'Nessun placeholder logo al posto delle foto'
            : `Placeholder da sostituire: ${placeholderProductImages.join(', ')}`,
        ok: placeholderProductImages.length === 0,
      },
      {
        label:
          invalidLinks.length === 0
            ? 'Link di approfondimento e risposta validi'
            : `Link non validi: ${invalidLinks.map((link) => link.label).join(', ')}`,
        ok: invalidLinks.length === 0,
      },
      {
        label: 'Approfondimento pubblico presente',
        ok: copy.html.includes('Approfondisci la proposta'),
      },
      {
        label: 'Risposta diretta a Marco presente',
        ok: copy.html.includes('Risponda a Marco') && copy.html.includes('mailto:'),
      },
      {
        label: `Testo breve e leggibile (${deliveryMetrics.textWords} parole)`,
        ok: deliveryMetrics.textWords <= 210,
      },
      {
        label: `HTML leggero (${Math.ceil(deliveryMetrics.htmlBytes / 1024)} KB)`,
        ok: deliveryMetrics.htmlBytes <= 25_000,
      },
      {
        label: `Immagini essenziali (${deliveryMetrics.imageCount})`,
        ok: deliveryMetrics.imageCount <= 2,
      },
      {
        label: `Link essenziali (${deliveryMetrics.linkCount})`,
        ok: deliveryMetrics.linkCount <= 2,
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
        recipientEmail,
        originalRecipientEmail,
        isManualRecipient,
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
