import { Resend } from 'resend';

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

// FROM addresses. When custom domain `silkincom.com` is verified on Resend
// (https://resend.com/domains), set RESEND_DOMAIN_VERIFIED=true in env to use
// branded addresses. Otherwise falls back to Resend's sandbox `onboarding@resend.dev`
// which works without DNS verification but shows the resend.dev address.
const DOMAIN_VERIFIED = process.env.RESEND_DOMAIN_VERIFIED === 'true';
const FROM_EMAIL = DOMAIN_VERIFIED
  ? 'SILKinCOM <orders@silkincom.com>'
  : 'SILKinCOM <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

// Internal inbox that receives a notification on every paid order.
const OWNER_EMAIL =
  process.env.ORDER_NOTIFICATION_EMAIL || process.env.CONTACT_EMAIL_TO || 'info@silkincom.com';

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderNumber: string,
  totalAmount: number
) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Conferma ordine ${e(orderNumber)} - SILKinCOM`,
    html: `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; color: #171717; background: #F7F2EA; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #FFFDF8; padding: 40px; }
          h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 32px; }
          .order-number { background: #F7F2EA; padding: 16px; margin: 24px 0; }
          .button { display: inline-block; padding: 14px 28px; background: #171717; color: #FFFDF8; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #D8D5CF; font-size: 12px; color: #A9A6A0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Grazie per il tuo ordine</h1>
          <p>Abbiamo ricevuto il tuo ordine e lo stiamo preparando con cura.</p>
          <div class="order-number">
            <strong>Numero ordine:</strong> ${e(orderNumber)}<br>
            <strong>Totale:</strong> €${e(totalAmount.toFixed(2))}
          </div>
          <p>Riceverai una notifica appena il tuo ordine sarà spedito.</p>
          <a href="${APP_URL}/account/ordini" class="button">Visualizza ordine</a>
          <div class="footer">
            <p>SILKinCOM — 100% Made in Como</p>
            <p>Se hai domande, contattaci a info@silkincom.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Internal sale alert — sent to the shop, not the customer. Lets the owner
// know a paid order came in without checking the admin dashboard.
export async function sendOwnerOrderNotificationEmail(
  orderNumber: string,
  totalAmount: number,
  customerEmail: string
) {
  return getResend().emails.send({
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
  return getResend().emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Il tuo ordine è in viaggio - ${orderNumber}`,
    html: `
      <h1>Il tuo ordine è in viaggio!</h1>
      <p>Ordine: <strong>${e(orderNumber)}</strong></p>
      <p>Corriere: <strong>${e(carrier)}</strong></p>
      <p>Numero tracciamento: <strong>${e(trackingNumber)}</strong></p>
      <a href="${APP_URL}/account/ordini">Traccia il tuo pacco</a>
    `,
  });
}

export async function sendNewsletterConfirmationEmail(
  email: string,
  confirmToken: string
) {
  const link = `${APP_URL}/newsletter/confirm?token=${confirmToken}`;
  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Un passo per iniziare</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 16px 0;">Conferma la sua <em style="color:#D4AF37; font-style:italic;">iscrizione</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Per attivare la sua iscrizione alla nostra Maison clicchi il pulsante qui sotto. Le invieremo eventi, anteprime e racconti dal Lago di Como — sempre con misura.</p>
    ${luxuryButton(link, 'Conferma iscrizione')}
    <p style="font-size:11px; color:#A9A6A0; line-height:1.7; margin-top:24px;">Il link è valido per 7 giorni. Se non ha richiesto lei l'iscrizione, può ignorare questa email.</p>
  `;
  return getResend().emails.send({
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
  return getResend().emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `Rimborso elaborato - ${orderNumber}`,
    html: `
      <h1>Rimborso elaborato</h1>
      <p>Il rimborso per l'ordine <strong>${e(orderNumber)}</strong> è stato elaborato.</p>
      <p>Importo rimborsato: <strong>€${e(refundAmount.toFixed(2))}</strong></p>
      <p>L'accredito sulla tua carta avverrà entro 5-10 giorni lavorativi.</p>
    `,
  });
}

export async function sendReturnStatusEmail(
  customerEmail: string,
  orderNumber: string,
  status: 'approved' | 'refunded' | 'rejected',
  refundAmount?: number
) {
  const subjects: Record<typeof status, string> = {
    approved: `Reso approvato - Ordine ${orderNumber}`,
    refunded: `Rimborso elaborato - Ordine ${orderNumber}`,
    rejected: `Aggiornamento richiesta reso - Ordine ${orderNumber}`,
  };
  const bodies: Record<typeof status, string> = {
    approved: `
      <p>La tua richiesta di reso per l'ordine <strong>${e(orderNumber)}</strong> è stata <strong>approvata</strong>.</p>
      <p>Riceverai a breve le istruzioni per la restituzione del prodotto.</p>
    `,
    refunded: `
      <p>Il rimborso per l'ordine <strong>${e(orderNumber)}</strong> è stato elaborato.</p>
      ${refundAmount ? `<p>Importo rimborsato: <strong>€${e(refundAmount.toFixed(2))}</strong></p>` : ''}
      <p>L'accredito sulla tua carta avverrà entro 5-10 giorni lavorativi.</p>
    `,
    rejected: `
      <p>Purtroppo la tua richiesta di reso per l'ordine <strong>${e(orderNumber)}</strong> non può essere accettata.</p>
      <p>Per ulteriori informazioni contatta il nostro servizio clienti.</p>
    `,
  };

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: subjects[status],
    html: `<p>${bodies[status]}</p><p style="font-size:12px;color:#999;">— SILKinCOM</p>`,
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
  return getResend().emails.send({
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
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Oggi la zona produce oltre il 70% della seta italiana. Ogni telaio porta con sé generazioni di mestiere — e ogni capo SILKinCOM nasce da queste mani.</p>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">La nostra missione è semplice: portare quel patrimonio direttamente al suo guardaroba, senza intermediari.</p>
    ${luxuryButton(`${APP_URL}/la-nostra-storia`, 'Scopri la nostra storia')}
    <p style="font-size:12px; color:#A9A6A0; margin-top:32px; font-style:italic;">Tra qualche giorno, un piccolo gesto di benvenuto.</p>
  `;
  return getResend().emails.send({
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
  return getResend().emails.send({
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
              <a href="${APP_URL}/prodotto/${encodeURIComponent(it.slug)}#review" style="display:inline-block; padding:8px 16px; background:#1A1A1A; color:#FFFDF8; text-decoration:none; text-transform:uppercase; letter-spacing:0.2em; font-size:10px;">Lascia recensione</a>
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
  return getResend().emails.send({
    from: NEWSLETTER_FROM,
    to: email,
    subject: 'La sua opinione su SILKinCOM',
    html: luxuryShell(inner, 'Bastano poche parole sincere.'),
  });
}

export async function sendAbandonedCartEmail(
  email: string,
  items: AbandonedItem[],
  resumeUrl?: string
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

  const inner = `
    <p style="font-size:9px; letter-spacing:0.5em; color:#A87F1E; text-transform:uppercase; margin:0 0 16px 0;">Il suo carrello la attende</p>
    <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:300; font-size:32px; line-height:1.25; margin:0 0 16px 0;">Riprenda <em style="color:#D4AF37; font-style:italic;">dove ha lasciato</em></h1>
    <p style="font-size:14px; line-height:1.75; color:#4A4A4A; margin:16px 0;">Ha selezionato pezzi della nostra Maison ma non ha completato l'acquisto. I suoi articoli sono ancora disponibili — riprenda quando preferisce.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">${itemsHtml}</table>
    ${luxuryButton(resumeUrl || `${APP_URL}/cart`, 'Riprendi acquisto')}
    <p style="font-size:12px; line-height:1.7; color:#A9A6A0; margin-top:24px; font-style:italic;">Per qualsiasi domanda, scriva a <a href="mailto:info@silkincom.com" style="color:#A87F1E; text-decoration:none;">info@silkincom.com</a>.</p>
  `;
  return getResend().emails.send({
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
    await getResend().emails.send({
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
