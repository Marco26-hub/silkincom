/**
 * Salvataggio di un lead trovato da una scansione, senza distruggere quello
 * che si sa già di lui.
 *
 * Prima ricerca e scansione facevano un upsert che riscriveva ogni campo, fra
 * cui `status`. Un lead già contattato tornava quindi a "qualified" appena una
 * nuova ricerca ne incrociava di nuovo il sito: spariva dal conteggio dei
 * contattati, rientrava fra i selezionabili e nulla segnalava che gli era già
 * stata scritta una email. Con `last_contacted_at` ed `email_sent_count` che
 * invece sopravvivevano, la riga restava pure incoerente.
 *
 * Regola: una nuova scansione può solo ARRICCHIRE un lead esistente. Non
 * riporta mai indietro lo stato della relazione e non sovrascrive quello che
 * una persona ha scritto a mano.
 */

/** Stati che rappresentano una relazione già avviata: mai retrocedere. */
const RELATIONSHIP_STATUSES = new Set(['contacted', 'replied', 'do_not_contact']);

export type ScannedLeadPayload = {
  company_name: string;
  website_url: string;
  industry: string;
  city: string | null;
  country: string;
  contact_email: string | null;
  contact_phone: string | null;
  source_url: string | null;
  public_contact_page: string | null;
  discovery_query: string | null;
  notes: string;
  status: string;
  score: number;
};

export type UpsertScannedLeadResult = {
  data: any;
  /** Il lead era già in archivio. */
  existed: boolean;
  /** Era già stato contattato (o ha risposto, o ha chiesto STOP). */
  alreadyContacted: boolean;
  /** Stato conservato perché la relazione era già avviata. */
  keptStatus: string | null;
};

export async function upsertScannedLead(
  supabase: any,
  payload: ScannedLeadPayload,
): Promise<UpsertScannedLeadResult> {
  const { data: existing, error: lookupError } = await supabase
    .from('lead_accounts')
    .select(
      'id, status, notes, company_name, city, country, industry, contact_email, contact_phone, public_contact_page, do_not_contact',
    )
    .eq('website_url', payload.website_url)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  if (!existing) {
    const { data, error } = await supabase
      .from('lead_accounts')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { data, existed: false, alreadyContacted: false, keptStatus: null };
  }

  const relationshipStarted =
    RELATIONSHIP_STATUSES.has(existing.status) || Boolean(existing.do_not_contact);

  // Aggiornamento conservativo: si toccano solo i campi che una nuova
  // scansione può davvero migliorare, e mai azzerando un valore già presente
  // con un null perché stavolta il sito non lo esponeva.
  const update: Record<string, unknown> = {
    discovery_query: payload.discovery_query,
    score: payload.score,
    source_url: payload.source_url,
    last_scanned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (payload.contact_email) update.contact_email = payload.contact_email;
  if (payload.contact_phone) update.contact_phone = payload.contact_phone;
  if (payload.public_contact_page) {
    update.public_contact_page = payload.public_contact_page;
  }
  if (!existing.city && payload.city) update.city = payload.city;
  if (!existing.country && payload.country) update.country = payload.country;
  // Nome e note restano quelli in archivio: possono essere stati corretti a
  // mano, e il titolo estratto da una pagina è spesso peggiore (capita di
  // leggere cose come "Hotel familiare in centro città").
  if (!existing.company_name && payload.company_name) {
    update.company_name = payload.company_name;
  }
  if (!existing.notes && payload.notes) update.notes = payload.notes;
  // Anche il settore resta quello salvato: cambiarlo sotto banco sposterebbe
  // il lead in un altro focus e la coerenza settore/offerta è un controllo di
  // invio.
  if (!existing.industry && payload.industry) update.industry = payload.industry;
  // Lo stato avanza soltanto: da 'new'/'scanned' può salire a 'qualified'
  // quando si trova una email, ma 'contacted' e successivi non si toccano.
  if (!relationshipStarted) update.status = payload.status;

  const { data, error } = await supabase
    .from('lead_accounts')
    .update(update)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    data,
    existed: true,
    alreadyContacted: relationshipStarted,
    keptStatus: relationshipStarted ? existing.status : null,
  };
}
