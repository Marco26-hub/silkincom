import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import { antibotGate } from '@/lib/antibot';
import { sendNewsletterConfirmationEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 5, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();

    // Anti-bot: honeypot + signed timing token (see src/lib/antibot.ts).
    const gate = antibotGate(body);
    if (gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const email = (body?.email || '').toString().trim().toLowerCase();
    const fullName = body?.fullName ? String(body.fullName).trim() : null;
    const source = body?.source ? String(body.source).slice(0, 50) : 'website';

    if (!email) {
      return NextResponse.json({ error: 'Email è obbligatoria' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const confirmToken = randomBytes(24).toString('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Insert into newsletter_subscribers (existing schema)
    const { error: subError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        full_name: fullName,
        is_subscribed: true,
        is_confirmed: false,
        subscribed_at: new Date().toISOString(),
        source,
        consent_gdpr: true,
        confirm_token: confirmToken,
        confirm_token_expires_at: tokenExpiry,
      });

    const isDuplicate = subError?.code === '23505';
    if (subError && !isDuplicate) {
      console.error('Newsletter insert error:', subError);
      return NextResponse.json(
        { error: 'Errore nell\'iscrizione' },
        { status: 500 }
      );
    }

    // For new subscribers: send confirmation email (double opt-in).
    // Welcome + lifecycle scheduling moved to /api/newsletter/confirm after token verification.
    //
    // IMPORTANT: must `await` — Vercel serverless freezes the function as soon
    // as the response is returned, cancelling any in-flight HTTP request
    // (including the Resend POST /emails call). We swallow the rejection here
    // because the row is already saved and the wrapper has already logged the
    // failure into `error_logs`.
    if (!isDuplicate) {
      try {
        await sendNewsletterConfirmationEmail(email, confirmToken);
      } catch (e) {
        console.error('Confirmation email failed:', e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: isDuplicate
          ? 'Già iscritto alla newsletter'
          : 'Controlla la tua email per confermare l\'iscrizione',
      },
      { status: isDuplicate ? 200 : 201 }
    );
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
