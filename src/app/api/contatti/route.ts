import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { antibotGate } from "@/lib/antibot";
import { sendContactNotification } from "@/lib/email";
import { isExperiencePhone, tripPayloadSchema } from "@/lib/experience-trips";

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

    // Anti-bot: honeypot + signed timing token (see src/lib/antibot.ts).
    const gate = antibotGate(body);
    if (gate)
      return NextResponse.json({ error: gate.error }, { status: gate.status });

    const {
      nome,
      cognome,
      email,
      telefono,
      numero_ordine,
      messaggio,
      experiencePayload,
      experienceRequestKey,
      experienceTripId,
      experienceTripVersion,
    } = body;

    // Validate required fields
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email è obbligatoria" },
        { status: 400 },
      );
    }

    if (!messaggio?.trim()) {
      return NextResponse.json(
        { error: "Messaggio è obbligatorio" },
        { status: 400 },
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }

    const supabase = await createServerClient();

    let requestMessage = messaggio.trim();
    if (
      requestMessage.startsWith("SILKinCOM EXPERIENCE") &&
      (typeof nome !== "string" ||
        !nome.trim() ||
        nome.length > 120 ||
        typeof cognome !== "string" ||
        !cognome.trim() ||
        cognome.length > 120 ||
        ((experienceTripId === undefined || telefono) &&
          (typeof telefono !== "string" ||
            !isExperiencePhone(telefono.trim()))))
    ) {
      console.warn(
        "[contacts] Experience request rejected: invalid contact details.",
      );
      return NextResponse.json(
        { error: "Controlli nome, cognome e telefono." },
        { status: 400 },
      );
    }
    if (experienceTripId !== undefined) {
      if (
        !z.string().uuid().safeParse(experienceTripId).success ||
        !z.string().datetime({ offset: true }).safeParse(experienceTripVersion)
          .success
      ) {
        console.warn("[contacts] Invalid Experience trip reference rejected.");
        return NextResponse.json(
          { error: "Riferimento viaggio non valido" },
          { status: 400 },
        );
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user)
        return NextResponse.json(
          { error: "Acceda nuovamente per collegare il viaggio" },
          { status: 401 },
        );
      const { data: trip, error: tripError } = await supabase
        .from("experience_trips")
        .select("id,title,updated_at")
        .eq("id", experienceTripId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (tripError) {
        console.error(
          "[contacts] Experience reference lookup failed:",
          tripError.code,
        );
        return NextResponse.json(
          { error: "Verifica del viaggio non disponibile" },
          { status: 503 },
        );
      }
      if (!trip) {
        console.warn(
          "[contacts] Inaccessible Experience trip reference rejected.",
        );
        return NextResponse.json(
          { error: "Viaggio non disponibile" },
          { status: 404 },
        );
      }
      if (trip.updated_at !== experienceTripVersion) {
        console.warn("[contacts] Outdated Experience trip reference rejected.");
        return NextResponse.json(
          {
            error:
              "Il viaggio è stato modificato. Riveda nuovamente la richiesta.",
          },
          { status: 409 },
        );
      }
      requestMessage += `\n\nViaggio account verificato: ${trip.id}\nNome: ${trip.title}\nVersione: ${trip.updated_at}`;
    }

    const structured = experiencePayload === undefined ? null : tripPayloadSchema.safeParse(experiencePayload);
    if (structured && (!structured.success || !requestMessage.startsWith("SILKinCOM EXPERIENCE"))) {
      return NextResponse.json({ error: "Scelte Experience non valide." }, { status: 400 });
    }

    let error;
    if (structured?.success) {
      const key = z.string().uuid().safeParse(experienceRequestKey);
      if (!key.success) return NextResponse.json({ error: "Riapra il riepilogo e riprovi." }, { status: 400 });
      const user = experienceTripId ? (await supabase.auth.getUser()).data.user : null;
      if (experienceTripId && !user)
        return NextResponse.json({ error: "Acceda nuovamente per inviare la richiesta." }, { status: 401 });
      const result = await createServiceClient().rpc("intake_experience_request", {
        p_key: key.data, p_trip: experienceTripId ?? null, p_version: experienceTripVersion ?? null,
        p_user: user?.id ?? null, p_name: nome.trim(), p_surname: cognome.trim(),
        p_email: email.trim().toLowerCase(), p_phone: telefono?.trim() || null,
        p_message: requestMessage, p_payload: structured.data,
      });
      if (result.error?.code === "40001")
        return NextResponse.json({ error: "Il viaggio è cambiato. Riveda la richiesta." }, { status: 409 });
      error = result.error;
      if (!error && result.data === false) {
        console.info("[experience-intake] Duplicate request ignored.");
        return NextResponse.json({ success: true }, { status: 201 });
      }
    } else {
      // Anonymous contact requests keep the existing insert-only policy.
      ({ error } = await supabase.from("contacts").insert({
        nome: nome?.trim() || null, cognome: cognome?.trim() || null,
        email: email.trim().toLowerCase(), telefono: telefono?.trim() || null,
        numero_ordine: numero_ordine?.trim() || null, messaggio: requestMessage,
      }));
    }

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Errore nell'invio del messaggio" },
        { status: 500 },
      );
    }

    // Notify the customer-care inbox. Don't fail the request if the email
    // sending breaks — the message is already saved in the DB.
    await sendContactNotification({
      nome,
      cognome,
      email: email.trim().toLowerCase(),
      telefono,
      numero_ordine,
      messaggio: requestMessage,
    });

    return NextResponse.json(
      { success: true, message: "Messaggio inviato con successo" },
      { status: 201 },
    );
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 },
    );
  }
}
