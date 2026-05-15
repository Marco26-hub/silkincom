import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

type ContactData = {
  nome?: string;
  cognome?: string;
  email: string;
  telefono?: string;
  numero_ordine?: string;
  messaggio: string;
};

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 3, 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { nome, cognome, email, telefono, numero_ordine, messaggio } = body;

    // Validate required fields
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'Email è obbligatoria' },
        { status: 400 }
      );
    }

    if (!messaggio?.trim()) {
      return NextResponse.json(
        { error: 'Messaggio è obbligatorio' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email non valida' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Insert into contacts table — no .select() (anon non ha SELECT policy)
    const { error } = await supabase
      .from('contacts')
      .insert({
        nome: nome?.trim() || null,
        cognome: cognome?.trim() || null,
        email: email.trim().toLowerCase(),
        telefono: telefono?.trim() || null,
        numero_ordine: numero_ordine?.trim() || null,
        messaggio: messaggio.trim(),
      });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Errore nell\'invio del messaggio' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Messaggio inviato con successo' },
      { status: 201 }
    );
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
