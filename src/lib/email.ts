import { Resend } from 'resend';
// Canonical site URL — see src/lib/app-url.ts. Centralised so email links,
// sitemap, schema and llms.txt all agree even when NEXT_PUBLIC_APP_URL on
// Vercel still points at a vercel.app preview.
import { APP_URL } from './app-url';
import { signReviewToken } from './review-token';

function e(str: string | number): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function safeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      (parsed.hostname.endsWith('supabase.co') || parsed.hostname.endsWith('silkincom.com'));
  } catch {
    return false;
  }
}

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Centralised send wrapper. The Resend SDK returns `{ data, error }` rather than
// throwing on rejection — without this wrapper, every call site silently swallows
// validation errors (sandbox restriction, invalid API key, suppressed recipient,
// unverified domain). Here we promote `result.error` to a thrown Error so upstream
// `.catch()` actually fires, and we best-effort log the failure into the
// `error_logs` table so the admin can see deliverability problems instead of
// guessing.
type ResendSendArgs = Parameters<Resend['emails']['send']>[0];

async function sendEmail(opts: ResendSendArgs) {
  const result = await getResend().emails.send(opts);
  if (result.error) {
    const recipient = Array.isArray(opts.to) ? opts.to.join(',') : opts.to;
    const context = {
      recipient,
      subject: opts.subject,
      from: opts.from,
      resend_error: result.error,
    };
    // Fire-and-forget DB log. Dynamic import keeps the Supabase server client
    // out of edge bundles when email.ts is statically analysed.
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const sb = createServiceClient();
      await sb.from('error_logs').insert({
        level: 'error',
        message: `Resend send failed: ${result.error.name ?? 'unknown'}`,
        context,
      });
    } catch {
      // Logging failure must never block the throw — the upstream caller still
      // gets the original error.
    }
    throw new Error(`Resend send failed: ${JSON.stringify(result.error)}`);
  }
  return result;
}

// FROM addresses. When custom domain `silkincom.com` is verified on Resend
// (https://resend.com/domains), set RESEND_DOMAIN_VERIFIED=true in env to use
// branded addresses. Otherwise falls back to Resend's sandbox `onboarding@resend.dev`
// which works without DNS verification but shows the resend.dev address.
const DOMAIN_VERIFIED = process.env.RESEND_DOMAIN_VERIFIED === 'true';
const FROM_EMAIL = DOMAIN_VERIFIED
  ? 'SILKinCOM <orders@silkincom.com>'
  : 'SILKinCOM <onboarding@resend.dev>';
// Internal inbox that receives a notification on every paid order.
const OWNER_EMAIL =
  process.env.ORDER_NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL_TO || 'info@silkincom.com';

// Inbox that receives B2B enquiries. `b2b@silkincom.com` is the public-facing
// alias but the actual Gmail mailbox is `silkincom.business@gmail.com`. Override
// with B2B_NOTIFICATION_EMAIL once the silkincom.com MX is configured.
const B2B_EMAIL =
  process.env.B2B_NOTIFICATION_EMAIL || 'silkincom.business@gmail.com';

export type B2BInquiry = {
  nome: string;
  azienda?: string | null;
  email: string;
  telefono?: string | null;
  tipo?: string | null; // hospitality / gifting / white-label / altro
  volume?: string | null;
  messaggio: string;
};

// Owner notification: full B2B request payload, replyTo set to the client so the
// reply lands directly in their inbox.
export async function sendB2BNotification(data: B2BInquiry) {
  const tipoLabel = data.tipo ? `<p><strong>Tipologia:</strong> ${e(data.tipo)}</p>` : '';
  const volumeLabel = data.volume ? `<p><strong>Volume previsto:</strong> ${e(data.volume)}</p>` : '';
  const aziendaLabel = data.azienda ? `<p><strong>Azienda:</strong> ${e(data.azienda)}</p>` : '';
  const telefonoLabel = data.telefono ? `<p><strong>Telefono:</strong> ${e(data.telefono)}</p>` : '';

  return sendEmail({
    from: FROM_EMAIL,
    to: B2B_EMAIL,
    replyTo: data.email,
    subject: `Nuova richiesta B2B — ${data.nome}${data.azienda ? ` (${data.azienda})` : ''}`,
    html: `
      <div style="font-family:'Inter',-apple-system,sans-serif;color:#171717;max-width:560px;">
        <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;color:#1A1A1A;">Nuova richiesta B2B</h2>
        <p><strong>Nome:</strong> ${e(data.nome)}</p>
        ${aziendaLabel}
        <p><strong>Email:</strong> <a href="mailto:${e(data.email)}">${e(data.email)}</a></p>
        ${telefonoLabel}
        ${tipoLabel}
        ${volumeLabel}
        <p><strong>Messaggio:</strong></p>
        <p style="white-space:pre-wrap;background:#FAF7F2;padding:12px;border-left:3px solid #D4AF37;">${e(data.messaggio)}</p>
        <p style="font-size:11px;color:#6B6B6B;margin-top:24px;">Rispondi direttamente a questa email per replicare al cliente.</p>
      </div>
    `,
  });
}

// Client confirmation: branded acknowledgment so the prospect knows the
// request was received and what to expect next. Uses the same luxury editorial
// shell as the lifecycle emails so the touchpoint matches the Maison voice.
export async function sendB2BClientConfirmation(clientEmail: string, clientName: string) {
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Maison · Programma B2B</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 24px 0;">Grazie, <em style="color:#D4AF37; font-style:italic;">${e(clientName)}</em>.</h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Abbiamo ricevuto la sua richiesta per il programma B2B di SILKinCOM.</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Il nostro team le risponderà entro 24 ore lavorative con un listino dedicato e i prossimi passi della collaborazione.</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Per richieste urgenti può scriverci a <a href="mailto:b2b@silkincom.com" style="color:#A87F1E; text-decoration:none;">b2b@silkincom.com</a>.</p>
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">— La Maison SILKinCOM, Como</p>
  `;
  return sendEmail({
    from: FROM_EMAIL,
    to: clientEmail,
    subject: 'Abbiamo ricevuto la sua richiesta — SILKinCOM B2B',
    html: luxuryShell(inner, 'Richiesta B2B ricevuta. Le risponderemo entro 24 ore con un listino dedicato.'),
  });
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderNumber: string,
  totalAmount: number
) {
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Ordine confermato</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 20px 0;">Grazie per il suo <em style="color:#D4AF37; font-style:italic;">ordine</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Abbiamo ricevuto il suo ordine e lo stiamo preparando con cura, capo per capo, nel nostro atelier sul Lago di Como.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0; width:100%;">
      <tr>
        <td style="background:#F5F0E8; padding:22px 26px; border-left:3px solid #D4AF37;">
          <p style="margin:0 0 6px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">Numero ordine</p>
          <p style="margin:0 0 14px 0; font-family:'Cormorant Garamond', Georgia, serif; font-size:24px; font-weight:300; color:#1A1A1A; letter-spacing:0.04em;">${e(orderNumber)}</p>
          <p style="margin:0; font-size:13px; color:#4A4A4A;"><strong style="color:#1A1A1A; font-weight:500;">Totale</strong> &nbsp;·&nbsp; €${e(totalAmount.toFixed(2))}</p>
        </td>
      </tr>
    </table>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Le invieremo una notifica appena il pacco lascerà il nostro atelier.</p>
    ${luxuryButton(`${APP_URL}/account/ordini`, 'Visualizza ordine')}
    <p style="font-size:12px; color:#A9A6A0; margin-top:28px; line-height:1.7;">Diritto di recesso: ha 14 giorni per recedere dal contratto senza motivazione. <a href="${APP_URL}/recesso" style="color:#A87F1E; text-decoration:none;">Esercita il recesso qui</a>.</p>
    <p style="font-size:12px; color:#A9A6A0; margin-top:16px; font-style:italic;">Per qualsiasi domanda, scriva a <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>.</p>
  `;
  return sendEmail({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Conferma ordine ${e(orderNumber)} — SILKinCOM`,
    html: luxuryShell(inner, `Il suo ordine ${orderNumber} è confermato e in lavorazione a Como.`),
  });
}

// Internal sale alert — sent to the shop, not the customer. Lets the owner
// know a paid order came in without checking the admin dashboard.
export async function sendOwnerOrderNotificationEmail(
  orderNumber: string,
  totalAmount: number,
  customerEmail: string
) {
  return sendEmail({
    from: FROM_EMAIL,
    to: OWNER_EMAIL,
    replyTo: customerEmail,
    subject: `Nuovo ordine ${e(orderNumber)} — €${e(totalAmount.toFixed(2))}`,
    html: `
      <div style="font-family:'Inter',-apple-system,sans-serif;color:#171717;max-width:520px;">
        <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;">Nuovo ordine ricevuto</h2>
        <p><strong>Numero ordine:</strong> ${e(orderNumber)}</p>
        <p><strong>Totale:</strong> €${e(totalAmount.toFixed(2))}</p>
        <p><strong>Cliente:</strong> <a href="mailto:${e(customerEmail)}">${e(customerEmail)}</a></p>
        <p style="margin-top:24px;">
          <a href="${APP_URL}/admin/ordini" style="display:inline-block;padding:12px 24px;background:#171717;color:#FFFDF8;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;font-size:12px;">Apri in amministrazione</a>
        </p>
        <p style="font-size:11px;color:#6B6B6B;margin-top:24px;">SILKinCOM — notifica automatica ordini</p>
      </div>
    `,
  });
}

export async function sendShippingNotificationEmail(
  customerEmail: string,
  orderNumber: string,
  trackingNumber: string,
  carrier: string = 'DHL'
) {
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">In viaggio · ${e(carrier)}</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 20px 0;">Il suo ordine è <em style="color:#D4AF37; font-style:italic;">partito</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Il suo pacco ha lasciato il nostro atelier ed è ora in viaggio verso di lei.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0; width:100%;">
      <tr>
        <td style="background:#F5F0E8; padding:22px 26px; border-left:3px solid #D4AF37;">
          <p style="margin:0 0 6px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">Ordine</p>
          <p style="margin:0 0 14px 0; font-family:'Cormorant Garamond', Georgia, serif; font-size:22px; font-weight:300; color:#1A1A1A; letter-spacing:0.04em;">${e(orderNumber)}</p>
          <p style="margin:0 0 6px 0; font-size:12px; color:#4A4A4A;"><strong style="color:#1A1A1A; font-weight:500;">Corriere</strong> &nbsp;·&nbsp; ${e(carrier)}</p>
          <p style="margin:0; font-size:12px; color:#4A4A4A;"><strong style="color:#1A1A1A; font-weight:500;">Tracking</strong> &nbsp;·&nbsp; ${e(trackingNumber)}</p>
        </td>
      </tr>
    </table>
    ${luxuryButton(`${APP_URL}/account/ordini`, 'Traccia il pacco')}
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">Buon arrivo. — La Maison SILKinCOM</p>
  `;
  return sendEmail({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Il suo ordine è in viaggio — ${orderNumber}`,
    html: luxuryShell(inner, `Ordine ${orderNumber} spedito da Como con ${carrier}.`),
  });
}

export async function sendNewsletterConfirmationEmail(
  email: string,
  confirmToken: string
) {
  // NB: the GET handler lives at /api/newsletter/confirm (it marks the
  // subscriber confirmed then redirects to /newsletter/confirmed or
  // /newsletter/expired). Without the /api prefix the click 404s.
  const link = `${APP_URL}/api/newsletter/confirm?token=${confirmToken}`;
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Un passo per iniziare</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 16px 0;">Conferma la sua <em style="color:#D4AF37; font-style:italic;">iscrizione</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Per attivare la sua iscrizione alla nostra Maison clicchi il pulsante qui sotto. Le invieremo eventi, anteprime e racconti dal Lago di Como — sempre con misura.</p>
    ${luxuryButton(link, 'Conferma iscrizione')}
    <p style="font-size:11px; color:#A9A6A0; line-height:1.7; margin-top:24px;">Il link è valido per 7 giorni. Se non ha richiesto lei l'iscrizione, può ignorare questa email.</p>
  `;
  return sendEmail({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'Conferma la sua iscrizione — SILKinCOM',
    html: luxuryShell(inner, 'Un click per ricevere le nostre comunicazioni.'),
  });
}

export async function sendRefundConfirmationEmail(
  customerEmail: string,
  orderNumber: string,
  refundAmount: number
) {
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Rimborso elaborato</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 20px 0;">Il suo rimborso è <em style="color:#D4AF37; font-style:italic;">in arrivo</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Abbiamo elaborato il rimborso per l'ordine <strong style="color:#1A1A1A;">${e(orderNumber)}</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0; width:100%;">
      <tr>
        <td style="background:#F5F0E8; padding:22px 26px; border-left:3px solid #D4AF37;">
          <p style="margin:0 0 6px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">Importo rimborsato</p>
          <p style="margin:0; font-family:'Cormorant Garamond', Georgia, serif; font-size:28px; font-weight:300; color:#1A1A1A; letter-spacing:0.04em;">€${e(refundAmount.toFixed(2))}</p>
        </td>
      </tr>
    </table>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">L'accredito sulla sua carta avverrà entro 5-10 giorni lavorativi, in funzione dell'istituto bancario.</p>
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">Per qualsiasi domanda, scriva a <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>.</p>
  `;
  return sendEmail({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Rimborso elaborato — Ordine ${orderNumber}`,
    html: luxuryShell(inner, `Rimborso di €${refundAmount.toFixed(2)} per l'ordine ${orderNumber} elaborato.`),
  });
}

export async function sendReturnStatusEmail(
  customerEmail: string,
  orderNumber: string,
  status: 'approved' | 'refunded' | 'rejected',
  refundAmount?: number
) {
  const subjects: Record<typeof status, string> = {
    approved: `Reso approvato — Ordine ${orderNumber}`,
    refunded: `Rimborso elaborato — Ordine ${orderNumber}`,
    rejected: `Aggiornamento richiesta reso — Ordine ${orderNumber}`,
  };

  // Per-status copy: eyebrow + headline + body paragraph(s).
  const variants: Record<typeof status, { eyebrow: string; titlePlain: string; titleAccent: string; body: string; preheader: string }> = {
    approved: {
      eyebrow: 'Reso approvato',
      titlePlain: 'La sua richiesta è stata',
      titleAccent: 'approvata',
      body: `
        <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">La sua richiesta di reso per l'ordine <strong style="color:#1A1A1A;">${e(orderNumber)}</strong> è stata approvata.</p>
        <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">A breve riceverà le istruzioni per la restituzione del prodotto.</p>
      `,
      preheader: `Reso ordine ${orderNumber} approvato.`,
    },
    refunded: {
      eyebrow: 'Rimborso elaborato',
      titlePlain: 'Il suo rimborso è',
      titleAccent: 'in arrivo',
      body: `
        <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Il rimborso per l'ordine <strong style="color:#1A1A1A;">${e(orderNumber)}</strong> è stato elaborato.</p>
        ${refundAmount ? `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0; width:100%;">
            <tr>
              <td style="background:#F5F0E8; padding:20px 24px; border-left:3px solid #D4AF37;">
                <p style="margin:0 0 6px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">Importo rimborsato</p>
                <p style="margin:0; font-family:'Cormorant Garamond', Georgia, serif; font-size:26px; font-weight:300; color:#1A1A1A;">€${e(refundAmount.toFixed(2))}</p>
              </td>
            </tr>
          </table>
        ` : ''}
        <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">L'accredito sulla sua carta avverrà entro 5-10 giorni lavorativi.</p>
      `,
      preheader: `Rimborso ordine ${orderNumber} elaborato.`,
    },
    rejected: {
      eyebrow: 'Richiesta reso',
      titlePlain: 'Un aggiornamento sulla',
      titleAccent: 'sua richiesta',
      body: `
        <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">La sua richiesta di reso per l'ordine <strong style="color:#1A1A1A;">${e(orderNumber)}</strong> non può essere accettata.</p>
        <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Per maggiori informazioni o per discutere il suo caso, ci scriva a <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>. Saremo felici di trovare insieme una soluzione.</p>
      `,
      preheader: `Aggiornamento sulla sua richiesta di reso per l'ordine ${orderNumber}.`,
    },
  };

  const v = variants[status];
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">${v.eyebrow}</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 20px 0;">${v.titlePlain} <em style="color:#D4AF37; font-style:italic;">${v.titleAccent}</em></h1>
    ${v.body}
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">— La Maison SILKinCOM</p>
  `;

  return sendEmail({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: subjects[status],
    html: luxuryShell(inner, v.preheader),
  });
}

// Right-of-withdrawal acknowledgement — the legally mandated "avviso di
// ricevimento su supporto durevole" (art. 54-bis Codice del Consumo). It must
// echo the content of the withdrawal declaration and the date/time it was
// transmitted, so the consumer holds durable proof. Written in Italian (legal
// master language); the echoed declaration is in the consumer's own language.
export async function sendWithdrawalAcknowledgementEmail(args: {
  customerEmail: string;
  customerName?: string | null;
  orderNumber: string;
  withdrawalNumber: string;
  items: { name: string; quantity: number }[];
  declaration: string;
  submittedAt: Date;
}) {
  const when = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(args.submittedAt);

  const itemsHtml = (args.items || [])
    .map(
      (it) =>
        `<li style="font-size:13px; color:#4A4A4A; margin:0 0 4px 0;">${e(it.name)}${
          it.quantity > 1 ? ` &nbsp;·&nbsp; ×${e(it.quantity)}` : ''
        }</li>`,
    )
    .join('');

  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Recesso ricevuto</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 20px 0;">Abbiamo registrato il suo <em style="color:#D4AF37; font-style:italic;">recesso</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">${args.customerName ? `Gentile ${e(args.customerName)}, ` : ''}confermiamo la ricezione della sua dichiarazione di recesso ai sensi dell'art. 54-bis del Codice del Consumo. Questa email costituisce avviso di ricevimento su supporto durevole.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0; width:100%;">
      <tr>
        <td style="background:#F5F0E8; padding:22px 26px; border-left:3px solid #D4AF37;">
          <p style="margin:0 0 6px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">Riferimento recesso</p>
          <p style="margin:0 0 14px 0; font-family:'Cormorant Garamond', Georgia, serif; font-size:24px; font-weight:300; color:#1A1A1A; letter-spacing:0.04em;">${e(args.withdrawalNumber)}</p>
          <p style="margin:0 0 4px 0; font-size:13px; color:#4A4A4A;"><strong style="color:#1A1A1A; font-weight:500;">Ordine</strong> &nbsp;·&nbsp; ${e(args.orderNumber)}</p>
          <p style="margin:0; font-size:13px; color:#4A4A4A;"><strong style="color:#1A1A1A; font-weight:500;">Data e ora di trasmissione</strong> &nbsp;·&nbsp; ${e(when)}</p>
        </td>
      </tr>
    </table>
    ${
      itemsHtml
        ? `<p style="font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase; margin:0 0 8px 0;">Prodotti oggetto di recesso</p>
    <ul style="margin:0 0 20px 0; padding:0 0 0 18px;">${itemsHtml}</ul>`
        : ''
    }
    <p style="font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase; margin:0 0 8px 0;">Dichiarazione trasmessa</p>
    <p style="font-size:13px; line-height:1.7; color:#4A4A4A; margin:0 0 24px 0; padding:16px 18px; background:#FAFAF8; border:1px solid #ECE7DD; white-space:pre-wrap;">${e(args.declaration)}</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">La rimborseremo entro 14 giorni con lo stesso mezzo di pagamento usato per l'acquisto. Per i beni, il rimborso può essere trattenuto fino al ricevimento della merce resa o alla prova della spedizione. Le invieremo a breve le istruzioni per la restituzione.</p>
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">Per qualsiasi domanda, scriva a <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>.</p>
  `;

  return sendEmail({
    from: FROM_EMAIL,
    to: args.customerEmail,
    subject: `Recesso ricevuto ${e(args.withdrawalNumber)} — Ordine ${e(args.orderNumber)}`,
    html: luxuryShell(inner, `Avviso di ricevimento del recesso per l'ordine ${args.orderNumber} — ${when}.`),
  });
}

// Internal alert — tells the shop a withdrawal came in.
export async function sendOwnerWithdrawalNotificationEmail(args: {
  orderNumber: string;
  withdrawalNumber: string;
  customerEmail: string;
  customerName?: string | null;
  submittedAt: Date;
}) {
  const when = new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(args.submittedAt);
  return sendEmail({
    from: FROM_EMAIL,
    to: OWNER_EMAIL,
    replyTo: args.customerEmail,
    subject: `Recesso ${e(args.withdrawalNumber)} — Ordine ${e(args.orderNumber)}`,
    html: `
      <div style="font-family:'Inter',-apple-system,sans-serif;color:#171717;max-width:520px;">
        <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;">Nuova richiesta di recesso</h2>
        <p><strong>Riferimento:</strong> ${e(args.withdrawalNumber)}</p>
        <p><strong>Ordine:</strong> ${e(args.orderNumber)}</p>
        <p><strong>Cliente:</strong> ${args.customerName ? `${e(args.customerName)} · ` : ''}<a href="mailto:${e(args.customerEmail)}">${e(args.customerEmail)}</a></p>
        <p><strong>Trasmesso:</strong> ${e(when)}</p>
        <p style="margin-top:24px;">
          <a href="${APP_URL}/admin/recessi" style="display:inline-block;padding:12px 24px;background:#171717;color:#FFFDF8;text-decoration:none;text-transform:uppercase;letter-spacing:0.1em;font-size:12px;">Apri in amministrazione</a>
        </p>
        <p style="font-size:11px;color:#6B6B6B;margin-top:24px;">SILKinCOM — notifica automatica recessi · rimborso entro 14 giorni</p>
      </div>
    `,
  });
}

// Return instructions for a withdrawal — sent by the admin after a request comes
// in. Tells the customer how/where to ship the goods back, at their own expense
// (art. 57 Codice del Consumo). Localised IT/EN, falls back to EN.
const RETURN_ADDRESS = 'SILKinCOM, Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), Italia';

export async function sendWithdrawalInstructionsEmail(args: {
  customerEmail: string;
  customerName?: string | null;
  orderNumber: string;
  withdrawalNumber: string;
  locale?: string;
}) {
  type Strings = {
    eyebrow: string; titlePlain: string; titleAccent: string; intro: string;
    addressLabel: string; stepsLabel: string; steps: string[]; deadline: string;
    refund: string; subject: string; preheader: string; help: string;
  };
  const IT: Strings = {
    eyebrow: 'Istruzioni di reso',
    titlePlain: 'Come restituire i suoi',
    titleAccent: 'articoli',
    intro: `Abbiamo registrato il suo recesso (rif. ${e(args.withdrawalNumber)}, ordine ${e(args.orderNumber)}). Per completarlo, ci rispedisca gli articoli seguendo le indicazioni qui sotto.`,
    addressLabel: 'Indirizzo di reso',
    stepsLabel: 'Come procedere',
    steps: [
      'Imballi gli articoli con cura, possibilmente nella confezione originale.',
      `Includa un foglio con il riferimento ${e(args.withdrawalNumber)}.`,
      'Spedisca con un corriere a sua scelta. Le spese di restituzione sono a suo carico.',
      'Conservi la prova di spedizione.',
    ],
    deadline: 'La restituzione va effettuata entro 14 giorni dalla comunicazione di recesso.',
    refund: 'Riceverà il rimborso entro 14 giorni, dopo il ricevimento della merce o la prova della spedizione.',
    subject: `Istruzioni di reso — Recesso ${e(args.withdrawalNumber)}`,
    preheader: `Come restituire gli articoli dell'ordine ${args.orderNumber}.`,
    help: 'Per assistenza',
  };
  const EN: Strings = {
    eyebrow: 'Return instructions',
    titlePlain: 'How to return your',
    titleAccent: 'items',
    intro: `We have registered your withdrawal (ref. ${e(args.withdrawalNumber)}, order ${e(args.orderNumber)}). To complete it, please ship the items back following the steps below.`,
    addressLabel: 'Return address',
    stepsLabel: 'How to proceed',
    steps: [
      'Pack the items carefully, ideally in their original packaging.',
      `Include a note with the reference ${e(args.withdrawalNumber)}.`,
      'Ship with a carrier of your choice. Return costs are at your expense.',
      'Keep the proof of shipment.',
    ],
    deadline: 'The return must be made within 14 days of the withdrawal notice.',
    refund: 'You will be refunded within 14 days, after we receive the goods or proof of shipment.',
    subject: `Return instructions — Withdrawal ${e(args.withdrawalNumber)}`,
    preheader: `How to return the items from order ${args.orderNumber}.`,
    help: 'For assistance',
  };
  const L = args.locale === 'it' ? IT : EN;

  const stepsHtml = L.steps
    .map((s) => `<li style="font-size:13px; line-height:1.7; color:#4A4A4A; margin:0 0 6px 0;">${s}</li>`)
    .join('');

  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">${L.eyebrow}</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 20px 0;">${L.titlePlain} <em style="color:#D4AF37; font-style:italic;">${L.titleAccent}</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">${args.customerName ? `${e(args.customerName)}, ` : ''}${L.intro}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0; width:100%;">
      <tr>
        <td style="background:#F5F0E8; padding:20px 24px; border-left:3px solid #D4AF37;">
          <p style="margin:0 0 6px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">${L.addressLabel}</p>
          <p style="margin:0; font-size:14px; color:#1A1A1A; line-height:1.6;">${e(RETURN_ADDRESS)}</p>
        </td>
      </tr>
    </table>
    <p style="font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase; margin:0 0 8px 0;">${L.stepsLabel}</p>
    <ol style="margin:0 0 20px 0; padding:0 0 0 18px;">${stepsHtml}</ol>
    <p style="font-size:13px; line-height:1.7; color:#4A4A4A; margin:16px 0;">${L.deadline}</p>
    <p style="font-size:13px; line-height:1.7; color:#4A4A4A; margin:16px 0;">${L.refund}</p>
    <p style="font-size:12px; color:#A9A6A0; margin-top:28px; font-style:italic;">${L.help}: <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>.</p>
  `;

  return sendEmail({
    from: FROM_EMAIL,
    to: args.customerEmail,
    subject: L.subject,
    html: luxuryShell(inner, L.preheader),
  });
}

// ===== Lifecycle email templates (luxury editorial style) =====

const NEWSLETTER_FROM = DOMAIN_VERIFIED
  ? 'SILKinCOM Maison <maison@silkincom.com>'
  : 'SILKinCOM Maison <onboarding@resend.dev>';

function luxuryShell(innerHtml: string, preheader: string) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SILKinCOM</title>
</head>
<body style="margin:0; padding:0; background:#F5F0E8; font-family: 'Inter', -apple-system, sans-serif; color:#1A1A1A;">
  <span style="display:none; max-height:0; overflow:hidden; visibility:hidden;">${e(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; background:#FFFDF8;">
          <tr>
            <td style="padding:40px 40px 16px 40px; text-align:center; border-bottom:1px solid #E8E2D4;">
              <div style="font-family:'Cormorant Garamond', Georgia, serif; font-size:24px; font-weight:300; letter-spacing:0.18em; color:#1A1A1A;">SILKINCOM</div>
              <div style="font-size:9px; letter-spacing:0.4em; color:#A87F1E; text-transform:uppercase; margin-top:6px;">Maison · Como</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px; border-top:1px solid #E8E2D4; text-align:center; font-size:11px; color:#6B6B6B;">
              <p style="margin:0 0 8px 0;">SILKinCOM · Cermenate (CO) · Italia</p>
              <p style="margin:0;">
                <a href="${APP_URL}" style="color:#A87F1E; text-decoration:none;">silkincom.com</a> ·
                <a href="${APP_URL}/contatti" style="color:#A87F1E; text-decoration:none;">Contatti</a> ·
                <a href="${APP_URL}/account/preferenze" style="color:#A87F1E; text-decoration:none;">Disiscrizione</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function luxuryButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#1A1A1A;"><a href="${href}" style="display:inline-block; padding:16px 32px; color:#FFFDF8; text-decoration:none; text-transform:uppercase; letter-spacing:0.25em; font-size:11px; font-weight:500;">${label}</a></td></tr></table>`;
}

export async function sendWelcomeEmail(email: string) {
  const inner = `
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:36px; line-height:1.2; margin:0 0 16px 0;">Benvenuta in <em style="color:#D4AF37; font-style:italic;">Maison</em></h1>
    <p style="font-size:14px; line-height:1.7; color:#4A4A4A; margin:16px 0;">Grazie per esserti unita alla nostra comunità.</p>
    <p style="font-size:14px; line-height:1.7; color:#4A4A4A; margin:16px 0;">Da Como, distretto serico più antico d'Europa, le racconteremo materiali, artigiani e collezioni — sempre con misura.</p>
    <p style="font-size:14px; line-height:1.7; color:#4A4A4A; margin:16px 0;">Nei prossimi giorni riceverà il primo capitolo dedicato alla nostra eredità tessile.</p>
    ${luxuryButton(`${APP_URL}/collezioni`, 'Esplora le collezioni')}
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">— La Maison SILKinCOM</p>
  `;
  return sendEmail({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'Benvenuta in Maison SILKinCOM',
    html: luxuryShell(inner, 'Eredità tessile dal Lago di Como, ora nel suo guardaroba.'),
  });
}

export async function sendHeritageEmail(email: string) {
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Capitolo I · Heritage</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 24px 0;">Sei secoli di seta sul Lago di Como</h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Nel 1400 le prime filande comasche iniziavano a tessere la fibra che avrebbe reso il Lago di Como il distretto serico più importante d'Europa.</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Oggi la zona produce oltre il 70% della seta. Ogni telaio porta con sé generazioni di mestiere — e ogni capo SILKinCOM nasce da queste mani.</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">La nostra missione è semplice: portare quel patrimonio direttamente al suo guardaroba, senza intermediari.</p>
    ${luxuryButton(`${APP_URL}/la-nostra-storia`, 'Scopri la nostra storia')}
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">Tra qualche giorno, un piccolo gesto di benvenuto.</p>
  `;
  return sendEmail({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'Sei secoli di seta — il distretto di Como',
    html: luxuryShell(inner, 'L\'eredità tessile comasca: dal XV secolo a oggi.'),
  });
}

export async function sendFirstPurchaseDiscountEmail(email: string, code: string = 'BENVENUTA10') {
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Un gesto di benvenuto</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 24px 0;">Il suo primo acquisto, con <em style="color:#D4AF37; font-style:italic;">−10%</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Per ringraziarla della sua attenzione, le riserviamo uno sconto del 10% sul suo primo ordine.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0; width:100%;">
      <tr>
        <td style="background:#F5F0E8; padding:24px; text-align:center; border:1px dashed #D4AF37;">
          <p style="margin:0 0 8px 0; font-size:10px; letter-spacing:0.3em; color:#A87F1E; text-transform:uppercase;">Codice sconto</p>
          <p style="margin:0; font-family:'Cormorant Garamond', Georgia, serif; font-size:28px; font-weight:300; letter-spacing:0.2em; color:#1A1A1A;">${e(code)}</p>
        </td>
      </tr>
    </table>
    <p style="font-size:13px; line-height:1.7; color:#6B6B6B; margin:16px 0;">Valido 14 giorni dalla ricezione di questa email, su tutti i prodotti della collezione. Da inserire al checkout.</p>
    ${luxuryButton(`${APP_URL}/collezioni`, 'Inizia ora')}
  `;
  return sendEmail({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'Il suo benvenuto: −10% sul primo ordine',
    html: luxuryShell(inner, `Codice ${code} valido 14 giorni.`),
  });
}

type AbandonedItem = { name: string; image?: string; price: number; quantity: number; href?: string };

type ReviewItem = { name: string; slug: string; image?: string };

export async function sendReviewRequestEmail(
  email: string,
  orderNumber: string,
  items: ReviewItem[]
) {
  const itemsHtml = items.slice(0, 4).map((it) => `
    <tr>
      <td style="padding:14px 0; border-bottom:1px solid #E8E2D4;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${it.image && safeImageUrl(it.image) ? `<td width="80" style="padding-right:14px;"><img src="${e(it.image)}" alt="${e(it.name)}" width="80" style="display:block; border:1px solid #E8E2D4;"></td>` : ''}
            <td style="vertical-align:middle;">
              <div style="font-family:'Cormorant Garamond', Georgia, serif; font-size:18px; color:#1A1A1A; margin-bottom:8px;">${e(it.name)}</div>
              <a href="${APP_URL}/prodotto/${encodeURIComponent(it.slug)}?rt=${encodeURIComponent(signReviewToken(email, it.slug))}#review" style="display:inline-block; padding:8px 16px; background:#1A1A1A; color:#FFFDF8; text-decoration:none; text-transform:uppercase; letter-spacing:0.2em; font-size:10px;">Lascia recensione</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Ordine ${e(orderNumber)}</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 16px 0;">Come si è trovata con la <em style="color:#D4AF37; font-style:italic;">sua scelta</em>?</h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">La sua opinione conta — per noi e per chi cercherà un prodotto simile dopo di lei.</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Bastano poche parole sincere. Ogni recensione viene revisionata prima della pubblicazione.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">${itemsHtml}</table>
    <p style="font-size:12px; line-height:1.7; color:#A9A6A0; margin-top:24px; font-style:italic;">Grazie del tempo. — La Maison SILKinCOM</p>
  `;
  return sendEmail({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'La sua opinione su SILKinCOM',
    html: luxuryShell(inner, 'Bastano poche parole sincere.'),
  });
}

export async function sendAbandonedCartEmail(
  email: string,
  items: AbandonedItem[],
  resumeUrl?: string,
  couponCode?: string
) {
  const itemsHtml = items.slice(0, 4).map((it) => `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #E8E2D4;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${it.image && safeImageUrl(it.image) ? `<td width="80" style="padding-right:14px;"><img src="${e(it.image)}" alt="${e(it.name)}" width="80" style="display:block; border:1px solid #E8E2D4;"></td>` : ''}
            <td style="font-size:13px; color:#1A1A1A; line-height:1.5;">
              <div style="font-family:'Cormorant Garamond', Georgia, serif; font-size:18px;">${e(it.name)}</div>
              <div style="font-size:11px; color:#6B6B6B; margin-top:4px;">Quantità: ${e(it.quantity)}</div>
              <div style="font-size:13px; color:#A87F1E; margin-top:4px;">€${e(it.price.toFixed(0))}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const couponHtml = couponCode ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:#FAF7F2; border:1px solid #D4AF37; padding:20px 24px; text-align:center;">
          <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 10px 0;">Offerta esclusiva</p>
          <p style="font-family:'Cormorant Garamond', Georgia, serif; font-size:22px; font-weight:300; color:#1A1A1A; margin:0 0 10px 0;">25% di sconto sul suo ordine</p>
          <p style="font-size:11px; color:#6B6B6B; margin:0 0 14px 0;">Utilizzi il codice al momento del pagamento</p>
          <div style="display:inline-block; background:#1A1A1A; color:#D4AF37; font-family:'Courier New', monospace; font-size:20px; letter-spacing:0.15em; padding:10px 28px;">${e(couponCode)}</div>
          <p style="font-size:10px; color:#A9A6A0; margin:12px 0 0 0; font-style:italic;">Valido per un solo utilizzo</p>
        </td>
      </tr>
    </table>
  ` : '';

  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Il suo carrello la attende</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 16px 0;">Riprenda <em style="color:#D4AF37; font-style:italic;">dove ha lasciato</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Ha selezionato pezzi della nostra Maison ma non ha completato l'acquisto. I suoi articoli sono ancora disponibili — riprenda quando preferisce.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">${itemsHtml}</table>
    ${couponHtml}
    ${luxuryButton(resumeUrl || `${APP_URL}/cart`, 'Riprendi acquisto')}
    <p style="font-size:12px; line-height:1.7; color:#A9A6A0; margin-top:24px; font-style:italic;">Per qualsiasi domanda, scriva a <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>.</p>
  `;
  return sendEmail({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'Il suo carrello la attende — SILKinCOM',
    html: luxuryShell(inner, 'I suoi articoli sono ancora a disposizione.'),
  });
}

// Sends the contact-form payload to the customer-care inbox. Soft-fails if
// RESEND_API_KEY is missing so a misconfigured env doesn't break the form
// submission (the message is already persisted in the contacts table).
export async function sendContactNotification(data: {
  nome?: string | null;
  cognome?: string | null;
  email: string;
  telefono?: string | null;
  numero_ordine?: string | null;
  messaggio: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const to = process.env.CONTACT_EMAIL_TO || 'info@silkincom.com';
  const name = [data.nome, data.cognome].filter(Boolean).join(' ').trim() || '(non fornito)';
  const html = `
    <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;color:#1A1A1A;">Nuovo messaggio dal modulo contatti</h2>
    <p><strong>Nome:</strong> ${e(name)}</p>
    <p><strong>Email:</strong> <a href="mailto:${e(data.email)}">${e(data.email)}</a></p>
    ${data.telefono ? `<p><strong>Telefono:</strong> ${e(data.telefono)}</p>` : ''}
    ${data.numero_ordine ? `<p><strong>Numero ordine:</strong> ${e(data.numero_ordine)}</p>` : ''}
    <p><strong>Messaggio:</strong></p>
    <p style="white-space:pre-wrap;background:#FAF7F2;padding:12px;border-left:3px solid #D4AF37;">${e(data.messaggio)}</p>
    <p style="font-size:11px;color:#6B6B6B;margin-top:24px;">Rispondi direttamente a questa email per replicare al cliente.</p>
  `;
  try {
    await sendEmail({
      from: FROM_EMAIL,
      to,
      replyTo: data.email,
      subject: `Nuovo messaggio: ${name}`,
      html,
    });
  } catch (err) {
    console.error('sendContactNotification error:', err);
  }
}

// Accounting report for the commercialista: a clean entrate/uscite/saldo
// summary in the body + the full per-transaction detail attached as CSV.
export async function sendFinancialReport(opts: {
  to: string;
  periodLabel: string;
  totals: { income: number; expense: number; net: number; grossSales: number; bySource: Record<string, number> };
  count: number;
  csv: string;
  csvFilename: string;
  replyTo?: string;
}): Promise<void> {
  const eur = (n: number) => '€' + n.toFixed(2);
  const { totals } = opts;
  const channelRows = Object.entries(totals.bySource)
    .map(([s, v]) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${e(s.toUpperCase())}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:${v < 0 ? '#b91c1c' : '#15803d'};">${v < 0 ? '−' : '+'}${eur(Math.abs(v))}</td>
      </tr>`).join('');

  const html = `
    <div style="font-family:'Inter',-apple-system,sans-serif;color:#171717;max-width:640px;">
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;color:#1A1A1A;margin:0 0 4px;">SILKinCOM — Report contabile</h2>
      <p style="color:#6B6B6B;font-size:13px;margin:0 0 20px;">Periodo: <strong style="color:#1A1A1A;">${e(opts.periodLabel)}</strong> · ${opts.count} movimenti</p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 18px;">
        <tr>
          <td style="padding:10px 14px;background:#F5F0E8;border-left:3px solid #15803d;">
            <div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#A87F1E;">Entrate (vendite)</div>
            <div style="font-size:22px;color:#15803d;">${eur(totals.income)}</div>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:10px 14px;background:#F5F0E8;border-left:3px solid #b91c1c;">
            <div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#A87F1E;">Spese totali</div>
            <div style="font-size:22px;color:#b91c1c;">−${eur(totals.expense)}</div>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:10px 14px;background:#1A1A1A;">
            <div style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#D4AF37;">Saldo</div>
            <div style="font-size:22px;color:#FFFDF8;">${totals.net < 0 ? '−' : ''}${eur(Math.abs(totals.net))}</div>
          </td>
        </tr>
      </table>

      <p style="font-size:12px;color:#6B6B6B;margin:0 0 6px;">Vendite lorde (imponibile + IVA): <strong>${eur(totals.grossSales)}</strong></p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;margin:14px 0;">
        <thead><tr><th style="text-align:left;padding:6px 10px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#888;border-bottom:1px solid #ddd;">Canale</th><th style="text-align:right;padding:6px 10px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#888;border-bottom:1px solid #ddd;">Netto periodo</th></tr></thead>
        <tbody>${channelRows || '<tr><td colspan="2" style="padding:10px;color:#aaa;">Nessun movimento</td></tr>'}</tbody>
      </table>

      <p style="font-size:13px;line-height:1.7;color:#4A4A4A;">In allegato il dettaglio completo dei movimenti (Etsy + Stripe) in formato CSV, apribile con Excel: data, canale, cliente, imponibile, IVA, fee, totale, netto, link fattura.</p>
      <p style="font-size:11px;color:#A9A6A0;margin-top:24px;">SILKinCOM · P.IVA 03786790133 · report generato automaticamente dall'amministrazione.</p>
    </div>`;

  await sendEmail({
    from: FROM_EMAIL,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: `SILKinCOM — Report contabile ${opts.periodLabel}`,
    html,
    attachments: [{ filename: opts.csvFilename, content: Buffer.from(opts.csv, 'utf-8') }],
  });
}
