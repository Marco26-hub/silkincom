import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { antibotGate } from '@/lib/antibot';
import { sendB2BNotification, sendB2BClientConfirmation, type B2BInquiry } from '@/lib/email';
import { verifyLeadPublicToken } from '@/lib/lead-public-links';

export const runtime = 'nodejs';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TIPI = ['hospitality', 'gifting', 'white-label', 'altro'] as const;

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export async function POST(req: NextRequest) {
  // 5 requests/minute — same threshold used by the rest of the public forms.
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));

    // Anti-bot: honeypot + signed timing token (see src/lib/antibot.ts).
    const gate = antibotGate(body);
    if (gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const nome = trimOrNull(body?.nome);
    const azienda = trimOrNull(body?.azienda);
    const email = (body?.email || '').toString().trim().toLowerCase();
    const telefono = trimOrNull(body?.telefono);
    const tipoRaw = trimOrNull(body?.tipo);
    const tipo =
      tipoRaw && (ALLOWED_TIPI as readonly string[]).includes(tipoRaw) ? tipoRaw : null;
    const volume = trimOrNull(body?.volume);
    const messaggio = trimOrNull(body?.messaggio);
    const leadId = trimOrNull(body?.leadId);
    const leadToken = trimOrNull(body?.leadToken);
    const hasVerifiedLead = Boolean(
      leadId &&
        leadToken &&
        verifyLeadPublicToken(leadId, 'proposal', leadToken),
    );

    if (!nome) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }
    if (!email || !EMAIL_RX.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }
    if (!messaggio) {
      return NextResponse.json({ error: 'Messaggio obbligatorio' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Persist in shared `contacts` table. B2B-specific fields live in the
    // `metadata` JSONB column so we don't need a schema migration.
    const { error: dbError } = await supabase.from('contacts').insert({
      nome,
      cognome: null,
      email,
      telefono,
      messaggio,
      metadata: {
        source: 'b2b',
        azienda,
        tipo,
        volume,
        lead_id: hasVerifiedLead ? leadId : null,
      },
    });

    if (dbError) {
      console.error('B2B insert error:', dbError);
      return NextResponse.json(
        { error: 'Errore nel salvataggio della richiesta' },
        { status: 500 }
      );
    }

    // Send the owner notification + the client confirmation. The wrapper in
    // `sendEmail` now promotes Resend errors to thrown exceptions and logs them
    // to `error_logs`, so a failed send no longer disappears silently.
    //
    // IMPORTANT: we must `await` these sends instead of firing them and
    // forgetting. Vercel serverless functions freeze the execution context the
    // moment the response is returned — any in-flight HTTP request (including
    // the Resend POST /emails call) gets cancelled, so the mail never leaves.
    // We still don't fail the user-facing request: if a send rejects we
    // swallow the error here (it has already been written to `error_logs` by
    // the wrapper) and return 201, because the contact row is already saved.
    const payload: B2BInquiry = {
      nome,
      azienda,
      email,
      telefono,
      tipo,
      volume,
      messaggio,
    };

    const [ownerResult, clientResult] = await Promise.allSettled([
      sendB2BNotification(payload),
      sendB2BClientConfirmation(email, nome),
    ]);
    if (ownerResult.status === 'rejected') {
      console.error('B2B owner notification failed:', ownerResult.reason);
    }
    if (clientResult.status === 'rejected') {
      console.error('B2B client confirmation failed:', clientResult.reason);
    }

    if (hasVerifiedLead && leadId) {
      const serviceClient = createServiceClient();
      const { data: lead } = await serviceClient
        .from('lead_accounts')
        .select('reply_count, do_not_contact')
        .eq('id', leadId)
        .maybeSingle();

      if (lead) {
        const now = new Date().toISOString();
        const { error: leadUpdateError } = await serviceClient
          .from('lead_accounts')
          .update({
            status: lead.do_not_contact ? 'do_not_contact' : 'replied',
            last_reply_at: now,
            reply_count: Number(lead.reply_count || 0) + 1,
            last_reply_excerpt: messaggio.slice(0, 700),
            updated_at: now,
          })
          .eq('id', leadId);

        if (leadUpdateError) {
          console.error('B2B lead reply tracking update failed:', leadUpdateError);
        }

        const { error: inboundInsertError } = await serviceClient
          .from('lead_inbound_messages')
          .insert({
          lead_id: leadId,
          from_email: email,
          to_email: 'b2b@silkincom.com',
          subject: 'Approfondimento tramite form SILKinCOM',
          message_excerpt: messaggio.slice(0, 700),
          raw_payload: { source: 'public_b2b_form' },
          intent: 'reply',
          matched_newsletter: false,
          received_at: now,
        });

        if (inboundInsertError) {
          console.error('B2B lead reply tracking insert failed:', inboundInsertError);
        }
      }
    }

    return NextResponse.json(
      { success: true, message: 'Richiesta ricevuta. La ricontatteremo entro 24 ore.' },
      { status: 201 }
    );
  } catch (err) {
    console.error('B2B API error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
