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
