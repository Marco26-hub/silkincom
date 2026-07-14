import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const STOP_RE = /(?:^|\s)(stop|unsubscribe|disiscrivimi|cancellami|basta)(?:\s|$|[.!?])/i;

function authorized(req: NextRequest): boolean {
  const expected = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  if (!expected) return false;
  const header = req.headers.get('x-webhook-secret');
  const auth = req.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  return header === expected || bearer === expected;
}

function textFromPayload(payload: any): string {
  return [
    payload.text,
    payload.text_body,
    payload.plain,
    payload.html,
    payload.body,
    payload.subject,
  ]
    .filter(Boolean)
    .map((value) => String(value))
    .join('\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function emailFromPayload(payload: any): string | null {
  const candidates = [
    payload.from,
    payload.from?.email,
    payload.from_email,
    payload.sender,
    payload.sender?.email,
    payload.email,
    payload.reply_from,
    payload.reply_from?.email,
    payload.headers?.from,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const match = String(candidate).match(EMAIL_RE);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function toEmailFromPayload(payload: any): string | null {
  const candidates = [
    payload.to,
    Array.isArray(payload.to) ? payload.to.map((item: any) => item?.email || item).join(',') : null,
    payload.recipient,
    payload.recipient?.email,
    payload.to_email,
    payload.headers?.to,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const match = String(candidate).match(EMAIL_RE);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function excerpt(text: string): string {
  return text.slice(0, 700);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized inbound email webhook' }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  const fromEmail = emailFromPayload(payload);
  if (!fromEmail) {
    return NextResponse.json({ error: 'Mittente non riconosciuto' }, { status: 400 });
  }

  const toEmail = toEmailFromPayload(payload);
  const subject = payload.subject ? String(payload.subject).slice(0, 240) : null;
  const text = textFromPayload(payload);
  const isStop = STOP_RE.test(text);
  const intent = isStop ? 'stop' : 'reply';
  const now = new Date().toISOString();
  const supabase = createServiceClient();

  const { data: lead } = await supabase
    .from('lead_accounts')
    .select('id, reply_count')
    .eq('contact_email', fromEmail)
    .maybeSingle();

  const { data: newsletter } = await supabase
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', fromEmail)
    .maybeSingle();

  await supabase.from('lead_inbound_messages').insert({
    lead_id: lead?.id || null,
    from_email: fromEmail,
    to_email: toEmail,
    subject,
    message_excerpt: excerpt(text),
    raw_payload: payload,
    intent,
    matched_newsletter: Boolean(newsletter),
    received_at: now,
  });

  if (lead) {
    const leadUpdate: Record<string, unknown> = {
      status: isStop ? 'do_not_contact' : 'replied',
      last_reply_at: now,
      reply_count: Number(lead.reply_count || 0) + 1,
      last_reply_excerpt: excerpt(text),
      updated_at: now,
    };
    if (isStop) {
      leadUpdate.do_not_contact = true;
      leadUpdate.stop_requested_at = now;
    }

    await supabase
      .from('lead_accounts')
      .update(leadUpdate)
      .eq('id', lead.id);
  }

  if (newsletter && isStop) {
    await supabase
      .from('newsletter_subscribers')
      .update({
        is_subscribed: false,
        unsubscribed_at: now,
        metadata: { unsubscribed_via: 'email_stop', inbound_to: toEmail },
        updated_at: now,
      })
      .eq('id', newsletter.id);

    await supabase
      .from('email_lifecycle_jobs')
      .update({ status: 'cancelled', updated_at: now })
      .eq('recipient_email', fromEmail)
      .eq('status', 'pending');
  }

  return NextResponse.json({
    ok: true,
    fromEmail,
    intent,
    leadMatched: Boolean(lead),
    newsletterMatched: Boolean(newsletter),
    stopped: isStop,
  });
}
