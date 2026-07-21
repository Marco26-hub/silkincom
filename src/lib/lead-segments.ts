// Settori usati dall'outreach B2B. Vivono qui, in un modulo di soli dati senza
// import, perché li usano sia il client (menu admin) sia gli schemi zod: se
// stessero in lead-discovery.ts trascinerebbero node:dns nel bundle client.
export const LEAD_OUTREACH_FOCUS_VALUES = [
  "hospitality",
  "bed_breakfast",
  "hotel_boutique",
  "resort_beach_club",
  "spa_wellness",
  "wedding_events",
  "corporate_gifting",
  "concept_store",
  "museum_bookshop",
  "yacht_golf_club",
  "boat_charter",
  "chauffeur_ncc",
  "luxury_car_rental",
  "personal_shopper",
  "interior_architect",
  "tour_operator_luxury",
  "retail",
  "gifting",
  "wholesale",
] as const;

export type LeadOutreachFocus = (typeof LEAD_OUTREACH_FOCUS_VALUES)[number];

export type LeadSegment = {
  id: string;
  label: string;
  query: string;
  focus: string;
};

export type LeadSegmentGroup = {
  id: string;
  label: string;
  description: string;
  segments: LeadSegment[];
};

export const MAX_LEAD_SEGMENTS_PER_SEARCH = 6;

export const LEAD_SEGMENT_GROUPS: LeadSegmentGroup[] = [
  {
    id: "hospitality",
    label: "Hospitality & soggiorni",
    description: "Strutture ricettive, resort e ospitalità di charme.",
    segments: [
      {
        id: "bed_breakfast",
        label: "B&B di charme",
        query: "b&b charme luxury",
        focus: "bed_breakfast",
      },
      {
        id: "relais_dimore",
        label: "Relais & dimore storiche",
        query: "relais dimora storica luxury",
        focus: "bed_breakfast",
      },
      {
        id: "boutique_hotel",
        label: "Boutique hotel",
        query: "boutique hotel luxury",
        focus: "hotel_boutique",
      },
      {
        id: "hotel_luxury",
        label: "Hotel 4–5 stelle",
        query: "hotel 5 stelle luxury",
        focus: "hospitality",
      },
      {
        id: "resort",
        label: "Resort",
        query: "luxury resort",
        focus: "resort_beach_club",
      },
      {
        id: "agriturismo_premium",
        label: "Agriturismi premium",
        query: "agriturismo luxury charme",
        focus: "hospitality",
      },
      {
        id: "ville_aparthotel",
        label: "Ville & aparthotel",
        query: "luxury villa aparthotel",
        focus: "hospitality",
      },
      {
        id: "resort_shop",
        label: "Resort shop",
        query: "hotel resort boutique shop",
        focus: "hotel_boutique",
      },
    ],
  },
  {
    id: "wellness_club",
    label: "Wellness & club",
    description: "Spa, centri premium e club privati.",
    segments: [
      {
        id: "spa_hotel",
        label: "Spa hotel",
        query: "luxury spa hotel",
        focus: "spa_wellness",
      },
      {
        id: "medical_spa",
        label: "Medical spa",
        query: "medical spa premium",
        focus: "spa_wellness",
      },
      {
        id: "wellness_club",
        label: "Wellness club",
        query: "premium wellness club",
        focus: "spa_wellness",
      },
      {
        id: "beach_club",
        label: "Beach club",
        query: "luxury beach club",
        focus: "resort_beach_club",
      },
      {
        id: "yacht_club",
        label: "Yacht club",
        query: "private yacht club",
        focus: "yacht_golf_club",
      },
      {
        id: "golf_club",
        label: "Golf club",
        query: "private golf club pro shop",
        focus: "yacht_golf_club",
      },
      {
        id: "private_club",
        label: "Private members club",
        query: "private members club luxury",
        focus: "yacht_golf_club",
      },
    ],
  },
  {
    id: "retail",
    label: "Retail & moda",
    description: "Negozi curati, buyer e punti vendita premium.",
    segments: [
      {
        id: "concept_store",
        label: "Concept store",
        query: "luxury concept store",
        focus: "concept_store",
      },
      {
        id: "multibrand_boutique",
        label: "Boutique multimarca",
        query: "luxury multibrand boutique",
        focus: "retail",
      },
      {
        id: "department_store",
        label: "Department store",
        query: "luxury department store buyer",
        focus: "wholesale",
      },
      {
        id: "fashion_showroom",
        label: "Showroom moda",
        query: "fashion showroom accessories",
        focus: "wholesale",
      },
      {
        id: "museum_shop",
        label: "Museum & bookshop",
        query: "museum shop design gift",
        focus: "museum_bookshop",
      },
      {
        id: "design_store",
        label: "Design & lifestyle store",
        query: "design lifestyle store luxury",
        focus: "concept_store",
      },
      {
        id: "personal_shopper",
        label: "Personal shopper",
        query: "personal shopper luxury fashion",
        focus: "personal_shopper",
      },
      {
        id: "stylist_private_client",
        label: "Stylist & private client",
        query: "fashion stylist private client advisor",
        focus: "personal_shopper",
      },
    ],
  },
  {
    id: "events_gifting",
    label: "Eventi & gifting",
    description: "Regali premium, eventi e occasioni speciali.",
    segments: [
      {
        id: "wedding_planner",
        label: "Wedding planner",
        query: "luxury wedding planner",
        focus: "wedding_events",
      },
      {
        id: "event_venue",
        label: "Venue & location eventi",
        query: "luxury event venue",
        focus: "wedding_events",
      },
      {
        id: "event_agency",
        label: "Agenzie eventi",
        query: "luxury event agency",
        focus: "wedding_events",
      },
      {
        id: "corporate_gifting",
        label: "Corporate gifting",
        query: "corporate gifting luxury clients",
        focus: "corporate_gifting",
      },
      {
        id: "executive_gifting",
        label: "Executive & board gifting",
        query: "executive board premium gifts",
        focus: "corporate_gifting",
      },
      {
        id: "luxury_gift_shop",
        label: "Luxury gift shop",
        query: "luxury gift shop",
        focus: "gifting",
      },
      {
        id: "hospitality_amenities",
        label: "Amenities & welcome gift",
        query: "hotel amenities welcome gift supplier",
        focus: "gifting",
      },
    ],
  },
  {
    id: "travel_services",
    label: "Travel & professionisti",
    description: "Partner che lavorano con clientela internazionale e VIP.",
    segments: [
      {
        id: "luxury_travel",
        label: "Luxury travel advisor",
        query: "luxury travel advisor VIP clients",
        focus: "tour_operator_luxury",
      },
      {
        id: "dmc",
        label: "DMC & incoming",
        query: "luxury DMC destination management company",
        focus: "tour_operator_luxury",
      },
      {
        id: "concierge",
        label: "Concierge service",
        query: "luxury concierge service",
        focus: "tour_operator_luxury",
      },
      {
        id: "tour_operator",
        label: "Tour operator luxury",
        query: "luxury tour operator",
        focus: "tour_operator_luxury",
      },
      {
        id: "interior_hospitality",
        label: "Interior hospitality",
        query: "hospitality interior designer luxury hotel",
        focus: "interior_architect",
      },
      {
        id: "hotel_procurement",
        label: "Procurement hotel",
        query: "hotel procurement luxury hospitality",
        focus: "interior_architect",
      },
      {
        id: "architect_studio",
        label: "Studi di architettura",
        query: "architecture studio luxury hospitality",
        focus: "interior_architect",
      },
    ],
  },
  {
    id: "luxury_mobility",
    label: "Nautica & mobilità luxury",
    description:
      "Charter, chauffeur e servizi di mobilità per clientela premium.",
    segments: [
      {
        id: "boat_rental",
        label: "Noleggio barche & yacht charter",
        query:
          "luxury boat rental yacht charter private boat tour noleggio barche premium",
        focus: "boat_charter",
      },
      {
        id: "chauffeur_ncc",
        label: "NCC, chauffeur & transfer VIP",
        query: "NCC chauffeur limousine luxury VIP private transfer",
        focus: "chauffeur_ncc",
      },
      {
        id: "luxury_car_rental",
        label: "Noleggio auto luxury",
        query: "luxury car rental prestige supercar",
        focus: "luxury_car_rental",
      },
    ],
  },
  {
    id: "wholesale",
    label: "Wholesale & distribuzione",
    description:
      "Canali commerciali per ordini, distribuzione e private label.",
    segments: [
      {
        id: "distributor",
        label: "Distributori",
        query: "luxury fashion accessories distributor",
        focus: "wholesale",
      },
      {
        id: "importer",
        label: "Importatori",
        query: "fashion accessories importer",
        focus: "wholesale",
      },
      {
        id: "sales_agent",
        label: "Agenti commerciali",
        query: "fashion sales agent luxury accessories",
        focus: "wholesale",
      },
      {
        id: "wholesale_showroom",
        label: "Showroom wholesale",
        query: "wholesale showroom luxury fashion",
        focus: "wholesale",
      },
      {
        id: "premium_marketplace",
        label: "Marketplace premium",
        query: "premium fashion marketplace seller",
        focus: "retail",
      },
      {
        id: "private_label",
        label: "Private label",
        query: "private label silk accessories",
        focus: "wholesale",
      },
      {
        id: "corporate_supplier",
        label: "Fornitori corporate",
        query: "corporate gift supplier premium",
        focus: "corporate_gifting",
      },
    ],
  },
];

export const LEAD_SEGMENTS = LEAD_SEGMENT_GROUPS.flatMap(
  (group) => group.segments,
);

export function getLeadSegments(ids: string[]): LeadSegment[] {
  const selected = new Set(ids);
  return LEAD_SEGMENTS.filter((segment) => selected.has(segment.id));
}

export function buildLeadSegmentQuery(
  segments: LeadSegment[],
  customQuery: string,
): string {
  const segmentQuery = segments
    .map((segment) => `(${segment.query})`)
    .join(" OR ");
  return [segmentQuery, customQuery.trim()].filter(Boolean).join(" ");
}

export type LeadReasonPreset = {
  id: string;
  label: string;
  note: string;
};

// Motivi di contatto pronti, tre angoli commerciali per settore:
// "uso"      = il prodotto vive dentro la struttura
// "gifting"  = il prodotto è il ricordo/dono per il cliente finale
// "vendita"  = il prodotto viene rivenduto dal lead
// Sono formulati come collocazioni possibili e non affermano dotazioni che il
// lead potrebbe non avere: finiscono in una email a un'attività reale, quindi
// non devono contenere fatti inventati sulla struttura.
export const LEAD_REASON_PRESETS: Record<string, LeadReasonPreset[]> = {
  hospitality: [
    { id: "hospitality_uso", label: "Uso in struttura", note: "hall, suite e piscina, dove un tessile Made in Como resta sotto gli occhi dell'ospite per tutto il soggiorno" },
    { id: "hospitality_gifting", label: "Gifting ospite VIP", note: "gifting per ospiti VIP e clienti abituali, con un ricordo del Lago al posto del solito omaggio" },
    { id: "hospitality_vendita", label: "Vendita interna", note: "corner o boutique interna, per trasformare il racconto del Lago in un acquisto prima della partenza" },
  ],
  bed_breakfast: [
    { id: "bb_uso", label: "Uso in struttura", note: "camere e spazi comuni, dove pochi pezzi curati cambiano la percezione dell'accoglienza" },
    { id: "bb_gifting", label: "Ricordo ospite", note: "un ricordo del Lago da lasciare all'ospite, che resta molto dopo il soggiorno" },
    { id: "bb_vendita", label: "Acquisto in reception", note: "acquisto in reception, per gli ospiti che chiedono dove trovare un prodotto del territorio" },
  ],
  hotel_boutique: [
    { id: "hb_uso", label: "Hall e suite", note: "hall, suite e concierge, dove il dettaglio tessile pesa quanto arredo e servizio" },
    { id: "hb_gifting", label: "Gifting e amenities", note: "amenities e gifting per gli ospiti che tornano, con una provenienza dichiarata" },
    { id: "hb_vendita", label: "Boutique interna", note: "boutique interna e resort shop, con una capsule locale accanto ai brand già presenti" },
  ],
  resort_beach_club: [
    { id: "rb_uso", label: "Pool e beach", note: "pool e beach, dove il telo è il primo oggetto che il cliente tocca e fotografa" },
    { id: "rb_gifting", label: "Gifting membership", note: "gifting per soci e clienti stagionali, con un pezzo che porta la firma del Lago" },
    { id: "rb_vendita", label: "Resort shop", note: "resort shop, per intercettare la voglia di ricordo nel momento in cui è più forte" },
  ],
  spa_wellness: [
    { id: "spa_uso", label: "Percorso spa", note: "il percorso benessere, dove telo e tessuti fanno parte dell'esperienza tanto quanto il trattamento" },
    { id: "spa_gifting", label: "Gift corner", note: "gift corner e pacchetti regalo, con un prodotto che prolunga il benessere a casa" },
    { id: "spa_vendita", label: "Retail e membership", note: "retail interno e rinnovo membership, con una selezione riservata ai soci" },
  ],
  wedding_events: [
    { id: "we_uso", label: "Allestimento evento", note: "allestimento e welcome desk, dove il tessile dà continuità all'immagine dell'evento" },
    { id: "we_gifting", label: "Cadeau ospiti", note: "cadeau per gli ospiti, con un oggetto che sopravvive alla giornata invece di finire in un cassetto" },
    { id: "we_vendita", label: "Proposta agli sposi", note: "proposta agli sposi come parte del progetto, con personalizzazione dedicata" },
  ],
  corporate_gifting: [
    { id: "cg_uso", label: "Relazioni istituzionali", note: "relazioni istituzionali e board, dove il dono dice da dove viene chi lo fa" },
    { id: "cg_gifting", label: "Regalistica clienti", note: "regalistica clienti di fine anno, con una provenienza vera al posto di un logo applicato" },
    { id: "cg_vendita", label: "Progetto su misura", note: "progetto su misura con confezione e consegna curate, anche in quantità contenute" },
  ],
  concept_store: [
    { id: "cs_uso", label: "Racconto in negozio", note: "il racconto in negozio, dove una capsule territoriale regge una vetrina da sola" },
    { id: "cs_gifting", label: "Regalo per clienti", note: "l'area regalo, dove il cliente cerca qualcosa di riconoscibile ma non industriale" },
    { id: "cs_vendita", label: "Assortimento", note: "assortimento e riordino selettivo, partendo da poche referenze per testare la risposta" },
  ],
  museum_bookshop: [
    { id: "mb_uso", label: "Racconto culturale", note: "il racconto del distretto serico, che qui trova un pubblico già interessato" },
    { id: "mb_gifting", label: "Souvenir di valore", note: "souvenir di valore, alternativo al merchandising generico da bookshop" },
    { id: "mb_vendita", label: "Retail bookshop", note: "retail del bookshop, con un margine più alto di gran parte del catalogo attuale" },
  ],
  yacht_golf_club: [
    { id: "yg_uso", label: "Vita del club", note: "gli spazi del club, dove i soci riconoscono subito ciò che è fatto bene" },
    { id: "yg_gifting", label: "Member gifting", note: "member gifting e premi di gara, con un oggetto che i soci tengono davvero" },
    { id: "yg_vendita", label: "Club shop", note: "club shop, con una selezione riservata ai soci e possibile doppia firma" },
  ],
  boat_charter: [
    { id: "bc_uso", label: "Esperienza a bordo", note: "l'esperienza a bordo, dove teli e accessori fanno parte del comfort percepito" },
    { id: "bc_gifting", label: "Guest gifting", note: "guest gifting a fine charter, con un ricordo del Lago consegnato al momento giusto" },
    { id: "bc_vendita", label: "Vendita a bordo", note: "vendita a bordo o su richiesta, per chi chiede dove acquistare ciò che ha usato" },
  ],
  chauffeur_ncc: [
    { id: "nc_uso", label: "Accoglienza a bordo", note: "l'accoglienza a bordo, dove i dettagli sono l'unica cosa che distingue un servizio dall'altro" },
    { id: "nc_gifting", label: "Welcome gift VIP", note: "welcome gift per il cliente VIP, consegnato al primo transfer" },
    { id: "nc_vendita", label: "Pacchetti dedicati", note: "pacchetti dedicati per clienti corporate e agenzie partner" },
  ],
  luxury_car_rental: [
    { id: "lc_uso", label: "Consegna vettura", note: "il momento della consegna vettura, dove l'attenzione del cliente è al massimo" },
    { id: "lc_gifting", label: "Travel kit", note: "travel kit e client gifting, con un pezzo coerente con il livello del noleggio" },
    { id: "lc_vendita", label: "Upsell noleggio", note: "upsell sui noleggi lunghi, come dotazione inclusa nel pacchetto premium" },
  ],
  personal_shopper: [
    { id: "ps_uso", label: "Styling cliente", note: "lo styling della clientela seguita, dove serve un pezzo che nessun altro propone" },
    { id: "ps_gifting", label: "Regalo per clienti", note: "il regalo alla cliente affezionata, con una selezione fuori dai circuiti abituali" },
    { id: "ps_vendita", label: "Private edit", note: "un private edit riservato, con ordine dedicato e riservatezza sui pezzi" },
  ],
  interior_architect: [
    { id: "ia_uso", label: "Progetto suite", note: "i progetti di suite e residenze, dove il tessile chiude il racconto del materiale" },
    { id: "ia_gifting", label: "Consegna progetto", note: "la consegna del progetto al cliente, con un pezzo che porta la firma del territorio" },
    { id: "ia_vendita", label: "Material board", note: "material board e capitolati, con tessuti Made in Como tracciabili" },
  ],
  tour_operator_luxury: [
    { id: "tl_uso", label: "Itinerari privati", note: "gli itinerari privati sul Lago, dove il ricordo materiale manca quasi sempre" },
    { id: "tl_gifting", label: "Welcome kit", note: "welcome kit per gli ospiti in arrivo, con un oggetto legato al luogo che stanno visitando" },
    { id: "tl_vendita", label: "Pacchetti premium", note: "pacchetti premium, come elemento incluso che alza il valore percepito" },
  ],
  retail: [
    { id: "rt_uso", label: "Vetrina e racconto", note: "vetrina e racconto in negozio, dove una capsule locale si distingue dal resto dell'assortimento" },
    { id: "rt_gifting", label: "Area regalo", note: "l'area regalo, con un prodotto che si confeziona bene e si spiega in una frase" },
    { id: "rt_vendita", label: "Capsule boutique", note: "una capsule in boutique con riassortimento selettivo, senza impegni di magazzino" },
  ],
  gifting: [
    { id: "gf_uso", label: "Curatela", note: "la curatela della selezione, dove serve un fornitore che regga il racconto" },
    { id: "gf_gifting", label: "Progetti dono", note: "progetti dono su misura, con packaging e consegna coordinati" },
    { id: "gf_vendita", label: "Catalogo", note: "il catalogo proposto ai clienti, con una referenza Made in Como verificabile" },
  ],
  wholesale: [
    { id: "wh_uso", label: "Campionario", note: "il campionario, per valutare mano e qualità prima di qualsiasi impegno" },
    { id: "wh_gifting", label: "Clienti chiave", note: "i clienti chiave, con una linea che si differenzia dal resto dell'offerta" },
    { id: "wh_vendita", label: "Primo ordine", note: "un primo ordine calibrato, con riassortimento in base alla risposta reale" },
  ],
};

export function getLeadReasonPresets(focus: string): LeadReasonPreset[] {
  return LEAD_REASON_PRESETS[focus] || [];
}

const ALL_LEAD_REASON_NOTES = new Set(
  Object.values(LEAD_REASON_PRESETS)
    .flat()
    .map((preset) => preset.note),
);

// Distingue un motivo scelto dal menu da uno scritto a mano: serve a decidere
// se il cambio di settore può sovrascrivere il campo o deve lasciarlo stare.
export function isLeadReasonPresetNote(note: string): boolean {
  return ALL_LEAD_REASON_NOTES.has(note.trim());
}
