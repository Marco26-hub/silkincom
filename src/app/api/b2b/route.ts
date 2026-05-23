import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { sendB2BNotification, sendB2BClientConfirmation, type B2BInquiry } from '@/lib/email';

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

    const nome = trimOrNull(body?.nome);
    const azienda = trimOrNull(body?.azienda);
    const email = (body?.email || '').toString().trim().toLowerCase();
    const telefono = trimOrNull(body?.telefono);
    const tipoRaw = trimOrNull(body?.tipo);
    const tipo =
      tipoRaw && (ALLOWED_TIPI as readonly string[]).includes(tipoRaw) ? tipoRaw : null;
    const volume = trimOrNull(body?.volume);
    const messaggio = trimOrNull(body?.messaggio);

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
    // to `error_logs`, so a failed send no longer disappears silently. We still
    // don't fail the user-facing request — the row is already saved.
    const payload: B2BInquiry = {
      nome,
      azienda,
      email,
      telefono,
      tipo,
      volume,
      messaggio,
    };

    sendB2BNotification(payload).catch((err) =>
      console.error('B2B owner notification failed:', err)
    );
    sendB2BClientConfirmation(email, nome).catch((err) =>
      console.error('B2B client confirmation failed:', err)
    );

    return NextResponse.json(
      { success: true, message: 'Richiesta ricevuta. La ricontatteremo entro 24 ore.' },
      { status: 201 }
    );
  } catch (err) {
    console.error('B2B API error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
