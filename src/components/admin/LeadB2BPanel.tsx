"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Send,
  ExternalLink,
  Trash2,
  Plus,
  RefreshCw,
  Mail,
  Building2,
  Globe,
  ShieldCheck,
  MapPin,
  Filter,
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Star,
  ChevronDown,
} from "lucide-react";
import {
  buildLeadSegmentQuery,
  getLeadReasonPresets,
  getLeadSegments,
  isLeadReasonPresetNote,
  LEAD_SEGMENT_GROUPS,
  MAX_LEAD_SEGMENTS_PER_SEARCH,
  type LeadSegment,
} from "@/lib/lead-segments";

const LEAD_ZONE_PRESETS = [
  "Lago di Como",
  "Milano",
  "Svizzera",
  "Costa Smeralda",
  "Capri",
  "Toscana",
  "Montecarlo",
] as const;

type Lead = {
  id: string;
  company_name: string;
  website_url: string;
  industry: string;
  city: string | null;
  country: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source_url: string | null;
  public_contact_page: string | null;
  discovery_query: string | null;
  notes: string | null;
  status: string;
  score: number;
  priority_high: boolean;
  do_not_contact: boolean;
  last_scanned_at: string | null;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  stop_requested_at: string | null;
  last_reply_excerpt: string | null;
  reply_count: number | null;
  email_sent_count: number | null;
  created_at: string;
};

type LeadReply = {
  id: string;
  from_email: string;
  subject: string | null;
  message_excerpt: string | null;
  intent: "reply" | "stop" | "bounce" | "unknown";
  received_at: string;
  lead_accounts?: { company_name?: string | null } | null;
};

type OutreachPreview = {
  leadId: string;
  companyName: string;
  recipientEmail: string | null;
  originalRecipientEmail: string | null;
  isManualRecipient: boolean;
  subject: string;
  html: string;
  text: string;
  valid: boolean;
  checks: Array<{
    label: string;
    ok: boolean;
  }>;
};

type OutreachSendReceipt = {
  status: "sent" | "failed" | "partial";
  mode: "test" | "customer";
  emails: string[];
  sentAt: string;
  subject?: string;
  jobIds: string[];
  failedCount?: number;
  detail?: string;
};

type ScanSummary = {
  mode: "live" | "url";
  status: "running" | "done" | "error";
  title: string;
  detail: string;
  requested: number;
  candidates: number;
  saved: number;
  created: number;
  updated: number;
  warnings: number;
  progress: number;
  provider?: string;
  createdLeadIds: string[];
  updatedLeadIds: string[];
  startedAt: string;
  completedAt?: string;
  error?: string;
  categoryBreakdown?: Array<{
    focus: string;
    label: string;
    candidates: number;
    saved: number;
    created: number;
    updated: number;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nuovo",
  scanned: "Scansionato",
  qualified: "Qualificato",
  contacted: "Contattato",
  replied: "Risposto",
  do_not_contact: "Do not contact",
};

const STATUS_BADGES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  scanned: "bg-amber-100 text-amber-800",
  qualified: "bg-emerald-100 text-emerald-800",
  contacted: "bg-violet-100 text-violet-800",
  replied: "bg-green-100 text-green-800",
  do_not_contact: "bg-red-100 text-red-700",
};

const FOCUS_OPTIONS = [
  { value: "hospitality", label: "Hotel / Hospitality" },
  { value: "bed_breakfast", label: "B&B / Relais charme" },
  { value: "hotel_boutique", label: "Boutique hotel / Resort shop" },
  { value: "resort_beach_club", label: "Beach club / Resort" },
  { value: "spa_wellness", label: "Spa / Wellness" },
  { value: "wedding_events", label: "Wedding / Eventi" },
  { value: "corporate_gifting", label: "Corporate gifting" },
  { value: "concept_store", label: "Concept store" },
  { value: "museum_bookshop", label: "Museum shop / Cultura" },
  { value: "yacht_golf_club", label: "Yacht / Golf club" },
  { value: "boat_charter", label: "Noleggio barche / Yacht charter" },
  { value: "chauffeur_ncc", label: "NCC / Chauffeur VIP" },
  { value: "luxury_car_rental", label: "Noleggio auto luxury" },
  { value: "personal_shopper", label: "Personal shopper" },
  { value: "interior_architect", label: "Interior / Architetti" },
  { value: "tour_operator_luxury", label: "Luxury travel" },
  { value: "retail", label: "Boutique retail" },
  { value: "gifting", label: "Gift e amenities" },
  { value: "wholesale", label: "Wholesale / B2B" },
];

const SALES_OUTLET_GUIDE = [
  "B&B charme, relais, boutique hotel e concierge",
  "Spa, wellness club e medical spa premium",
  "Beach club, yacht club e golf club",
  "Wedding planner, eventi e venue di fascia alta",
  "Concept store, boutique multimarca e department store",
  "Corporate gifting per HR, board e clienti VIP",
  "Museum shop, bookshop e fondazioni culturali",
  "Luxury travel advisor, DMC e personal shopper",
  "Noleggio barche, yacht charter e boat tour privati",
  "NCC, chauffeur, limousine e transfer VIP",
  "Noleggio auto luxury, prestige e supercar",
];

const RECOMMENDED_OUTREACH_BATCH_SIZE = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Upload con avanzamento reale. `fetch` non espone il progresso del corpo in
// uscita, quindi per mostrare una percentuale che significhi qualcosa serve
// XMLHttpRequest. Al 100% il file è arrivato ma il server deve ancora
// ottimizzarlo e salvarlo: quella fase viene mostrata come "elaborazione",
// altrimenti la barra resterebbe ferma su 100 sembrando bloccata.
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; data: any }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let data: any = {};
      try {
        data = request.responseText ? JSON.parse(request.responseText) : {};
      } catch {
        data = {
          error: `Risposta API non valida (${request.status} ${request.statusText || "errore"})`,
        };
      }
      resolve({ ok: request.status >= 200 && request.status < 300, data });
    };
    request.onerror = () =>
      reject(new Error("Errore di rete durante il caricamento"));
    request.onabort = () => reject(new Error("Caricamento annullato"));
    request.send(formData);
  });
}

async function readApiJson(response: Response): Promise<any> {
  const body = await response.text();
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {
      error: `Risposta API non valida (${response.status} ${response.statusText || "errore"})`,
    };
  }
}

const CONVERSION_PLAYBOOK = [
  "Batch piccoli: 5-10 strutture realmente coerenti, non invii massivi.",
  "Priorità a lead con email diretta, pagina contatti, note reali e score alto.",
  "CTA unica: concept riservato o call di 15 minuti con il referente corretto.",
  "Personalizzazione obbligatoria: canale, prodotto luxury, occasione d’uso e cliente finale.",
  "Follow-up solo manuale e solo su lead coerenti, mai su STOP o contatti freddi già sollecitati.",
];

const FOCUS_TARGETING_GUIDE: Record<string, string[]> = {
  hospitality: [
    "Hall, suite, spa, piscina o boutique interna",
    "Clientela internazionale, gifting VIP o guest experience",
    "Referente: direzione, procurement, concierge o retail",
  ],
  bed_breakfast: [
    "Relais, dimora di charme, terrazza o accesso al Lago",
    "Welcome gift, ricordo ospite o acquisto in reception",
    "Referente: owner, host o guest experience",
  ],
  hotel_boutique: [
    "Hall, suite, resort shop, concierge o boutique interna",
    "Telo Lago, Twilly, Darsena, Riva, Melzi e packaging Maison",
    "Referente: general manager, concierge o retail manager",
  ],
  resort_beach_club: [
    "Piscina, beach area, pontile, barca o resort shop",
    "Telo Lago, Darsena, Riva, Melzi, Twilly e riassortimento estivo",
    "Referente: club manager, retail o guest experience",
  ],
  spa_wellness: [
    "Spa, area relax, membership o gift corner",
    "Telo Lago, Twilly Como e pashmine per ospiti VIP",
    "Referente: spa manager, membership o retail",
  ],
  wedding_events: [
    "Wedding, welcome desk, cadeau ospiti o evento privato",
    "Palette, quantità, timing e packaging dedicato",
    "Referente: wedding planner, event director o venue manager",
  ],
  corporate_gifting: [
    "Clienti VIP, board, partner o ricorrenza aziendale",
    "Budget, quantità, packaging e messaggio dedicato",
    "Referente: marketing, HR, direzione o executive assistant",
  ],
  concept_store: [
    "Store curato, corner luxury, lifestyle o gifting",
    "Assortimento Twilly, cashmere, Darsena, Riva, Melzi e storytelling",
    "Referente: buyer, owner o store director",
  ],
  museum_bookshop: [
    "Bookshop, fondazione, mostra, territorio o pubblico internazionale",
    "Souvenir alto, capsule colore e racconto culturale",
    "Referente: retail manager, bookshop o curatela",
  ],
  yacht_golf_club: [
    "Club shop, soci, torneo, regata o evento privato",
    "Darsena, Riva, Melzi, gift discreto, pashmine e capsule soci",
    "Referente: club manager, pro shop o eventi",
  ],
  boat_charter: [
    "Charter privato, imbarco, concierge o itinerario sul Lago",
    "Darsena, Riva, Melzi, Twilly e capsule co-branded a bordo",
    "Referente: owner, charter manager o guest experience",
  ],
  chauffeur_ncc: [
    "Transfer hotel, aeroporto, evento o itinerario per clientela VIP",
    "Twilly Como, welcome gift e capsule co-branded per il passeggero",
    "Referente: owner, operations manager o partnership manager",
  ],
  luxury_car_rental: [
    "Consegna vettura, hotel partner, tour privato o evento automotive",
    "Darsena, Twilly Como e travel capsule per clienti premium",
    "Referente: rental manager, concierge partnership o marketing",
  ],
  personal_shopper: [
    "Private client, guardaroba viaggio, styling o gifting",
    "Colori, occasioni d’uso e disponibilità verificata",
    "Referente: personal shopper, stylist o private client advisor",
  ],
  interior_architect: [
    "Suite, opening, hospitality project o welcome experience",
    "Palette, campionatura, materiali e budget progetto",
    "Referente: interior designer, architect o procurement",
  ],
  tour_operator_luxury: [
    "Itinerario VIP, concierge, DMC o gruppo privato",
    "Darsena, Riva, Melzi, welcome gift e calendario consegne",
    "Referente: travel designer, concierge o DMC owner",
  ],
  retail: [
    "Boutique luxury, target cliente, margine e rotazione",
    "Line sheet, Darsena, Riva, Melzi, primo ordine e materiali vendita",
    "Referente: buyer, owner o store manager",
  ],
  gifting: [
    "Ospitalità, cliente VIP, ricorrenza o relazione importante",
    "Budget, quantità, Darsena/Riva/Melzi se travel-leisure e tempi",
    "Referente: marketing, hospitality, HR o direzione",
  ],
  wholesale: [
    "Mercato, canale, buyer, margine e riassortimento",
    "Line sheet, campionario e condizioni riservate",
    "Referente: distributore, buyer o wholesale manager",
  ],
};

const OUTREACH_IMAGE_PRODUCTS = [
  { slug: "tivan", name: "Tivan", role: "Telo Lago" },
  { slug: "darsena-navy", name: "Darsena", role: "Cappellino Lago" },
  { slug: "riva", name: "Riva", role: "Camicia resort" },
  { slug: "melzi", name: "Melzi", role: "Pantaloncino lino" },
  { slug: "como-puro", name: "Como Puro", role: "Twilly seta" },
  { slug: "como-elegante", name: "Como Elegante", role: "Twilly seta" },
  { slug: "como-fluido", name: "Como Fluido", role: "Twilly seta" },
];

function getLeadConversionScore(lead: Lead): number {
  if (lead.do_not_contact || lead.status === "do_not_contact") return 0;

  let score = Math.min(45, Math.max(0, lead.score || 0) * 0.45);
  if (lead.contact_email) score += 22;
  if (lead.public_contact_page) score += 8;
  if (lead.contact_name) score += 6;
  if (lead.contact_role) score += 7;
  if (hasSpecificTargetingNote(lead.notes)) score += 7;
  if (lead.status === "qualified") score += 10;
  if (lead.status === "replied") score += 12;
  if (lead.last_contacted_at && !lead.last_reply_at) score -= 12;
  if ((lead.email_sent_count || 0) > 0 && !lead.last_reply_at) score -= 8;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function hasSpecificTargetingNote(value: string | null | undefined): boolean {
  const note = (value || "")
    .split(" · ")
    .filter((part) => !/^segmenti\s*:/i.test(part.trim()))
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim();
  return note.length >= 24 && /[a-zà-ÿ]{4,}/i.test(note);
}

function getLeadConversionTier(score: number): {
  label: string;
  className: string;
} {
  if (score >= 72) {
    return {
      label: "Alta",
      className: "bg-green-100 text-green-800",
    };
  }
  if (score >= 50) {
    return {
      label: "Media",
      className: "bg-amber-100 text-amber-800",
    };
  }
  return {
    label: "Bassa",
    className: "bg-pearl-grey text-soft-grey",
  };
}

export function LeadB2BPanel({
  initialLeads,
  initialReplies,
}: {
  initialLeads: Lead[];
  initialReplies: LeadReply[];
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [replies, setReplies] = useState<LeadReply[]>(initialReplies);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([
    "bed_breakfast",
    "boutique_hotel",
  ]);
  const [liveQuery, setLiveQuery] = useState("");
  const [liveLocation, setLiveLocation] = useState("Lago di Como Italia");
  const [liveMaxResults, setLiveMaxResults] = useState("15");
  const [scanUrls, setScanUrls] = useState("");
  const [scanNotes, setScanNotes] = useState("");
  const [scanIndustry, setScanIndustry] = useState("bed_breakfast");
  const [scanProgress, setScanProgress] = useState(0);
  const [liveSearching, setLiveSearching] = useState(false);
  const [scanningSites, setScanningSites] = useState(false);
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [manual, setManual] = useState({
    company_name: "",
    website_url: "",
    industry: "hospitality",
    city: "",
    country: "IT",
    contact_name: "",
    contact_role: "",
    contact_email: "",
    contact_phone: "",
    source_url: "",
    public_contact_page: "",
    notes: "",
    priority_high: false,
  });
  const [focus, setFocus] = useState("bed_breakfast");
  const [campaignNotes, setCampaignNotes] = useState("");
  // Motivi pronti del settore selezionato. Il campo resta libero: il preset
  // riempie solo la textarea, che poi si può riscrivere a mano.
  const reasonPresets = useMemo(() => getLeadReasonPresets(focus), [focus]);
  const activePresetId = useMemo(
    () =>
      reasonPresets.find((preset) => preset.note === campaignNotes.trim())?.id ??
      "",
    [reasonPresets, campaignNotes],
  );

  // Al cambio settore il motivo si riallinea da solo, ma solo se il campo è
  // vuoto o contiene ancora un preset: un motivo scritto a mano non va perso.
  useEffect(() => {
    const presets = getLeadReasonPresets(focus);
    if (presets.length === 0) return;
    setCampaignNotes((current) =>
      !current.trim() || isLeadReasonPresetNote(current)
        ? presets[0].note
        : current,
    );
  }, [focus]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [outreachPreviews, setOutreachPreviews] = useState<OutreachPreview[]>(
    [],
  );
  const [previewLeadId, setPreviewLeadId] = useState("");
  const [previewLeadIds, setPreviewLeadIds] = useState<string[]>([]);
  const [reviewedPreviewIds, setReviewedPreviewIds] = useState<string[]>([]);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [outreachSendReceipt, setOutreachSendReceipt] =
    useState<OutreachSendReceipt | null>(null);
  // Per-slug, due scelte esplicite sull'upload. Entrambe partono spente:
  // cambiare il catalogo pubblico non deve essere un effetto collaterale del
  // preparare una email.
  //   toSite  = la foto entra nella galleria del prodotto sul sito.
  //             Se spenta resta nella media library e vale solo per la campagna.
  //   primary = (solo se toSite) diventa la foto principale del prodotto.
  const [productImageToSite, setProductImageToSite] = useState<
    Record<string, boolean>
  >({});
  const [productImagePrimary, setProductImagePrimary] = useState<
    Record<string, boolean>
  >({});
  const [productImageOverrides, setProductImageOverrides] = useState<
    Record<string, string>
  >({});
  const [recipientEmailOverrides, setRecipientEmailOverrides] = useState<
    Record<string, string>
  >({});
  const [uploadingProductSlug, setUploadingProductSlug] = useState<
    string | null
  >(null);
  // Fisarmonica della sezione foto: un prodotto aperto per volta.
  const [openPhotoSlug, setOpenPhotoSlug] = useState<string | null>(null);
  // Percentuale di caricamento per slug e ultimo slug caricato con successo,
  // per dare conferma dentro la riga del prodotto invece che solo nel
  // messaggio generale in cima alla pagina.
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [uploadDoneSlug, setUploadDoneSlug] = useState<string | null>(null);
  // Errore di upload per slug: il banner generale è in cima alla pagina, fuori
  // dalla vista di chi sta lavorando nella colonna delle foto, e un upload
  // fallito lì passava inosservato.
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  // Eliminazione foto: id in attesa di conferma e id in corso di eliminazione.
  // La conferma è inline invece che con un dialog del browser perché tocca
  // anche la scheda prodotto pubblica e va detto esplicitamente.
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<
    string | null
  >(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  // Id in media_library della foto caricata per la sola campagna, per poterla
  // eliminare davvero: l'override da solo conosce l'URL, non la riga.
  const [campaignUploadId, setCampaignUploadId] = useState<
    Record<string, string>
  >({});

  // Elimina la foto caricata per la sola campagna: sta in media_library, non a
  // catalogo, quindi il sito non è coinvolto. Senza questa, «Torna a catalogo»
  // toglieva solo la selezione e il file restava archiviato per sempre.
  async function deleteCampaignPhoto(slug: string) {
    const mediaId = campaignUploadId[slug];
    setDeletingImageId(`uploaded-${slug}`);
    setMessage(null);
    try {
      if (mediaId) {
        const response = await fetch("/api/admin/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mediaId }),
        });
        const data = await readApiJson(response);
        if (!response.ok) {
          throw new Error(data.error || "Eliminazione non riuscita");
        }
      }
      setProductImageOverrides((previous) => {
        const next = { ...previous };
        delete next[slug];
        return next;
      });
      setCampaignUploadId((previous) => {
        const next = { ...previous };
        delete next[slug];
        return next;
      });
      setPendingDeleteImageId(null);
      setPreviewConfirmed(false);
      setOutreachSendReceipt(null);
      setMessage(
        mediaId
          ? "Foto eliminata da Media. L’email torna alla foto di catalogo."
          : "Foto tolta dalla campagna. L’email torna alla foto di catalogo.",
      );
    } catch (error) {
      setUploadError((previous) => ({
        ...previous,
        [slug]:
          error instanceof Error ? error.message : "Eliminazione non riuscita",
      }));
    } finally {
      setDeletingImageId(null);
    }
  }

  async function deleteCatalogImage(slug: string, imageId: string) {
    setDeletingImageId(imageId);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/leads/outreach/product-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, imageId }),
      });
      const data = await readApiJson(response);
      if (!response.ok) {
        throw new Error(data.error || "Eliminazione non riuscita");
      }
      // Se la foto eliminata era quella scelta per la campagna, l'override
      // punterebbe a un file che non esiste più: va tolto.
      const deletedUrl = (catalogImages[slug] || []).find(
        (image) => image.id === imageId,
      )?.url;
      if (deletedUrl && productImageOverrides[slug] === deletedUrl) {
        setProductImageOverrides((previous) => {
          const next = { ...previous };
          delete next[slug];
          return next;
        });
      }
      setPendingDeleteImageId(null);
      setPreviewConfirmed(false);
      setOutreachSendReceipt(null);
      await loadCatalogImages();
      setMessage(
        data.promotedId
          ? "Foto eliminata. Era la principale: è stata promossa la successiva."
          : "Foto eliminata dal catalogo e dal sito.",
      );
    } catch (error) {
      setUploadError((previous) => ({
        ...previous,
        [slug]:
          error instanceof Error ? error.message : "Eliminazione non riuscita",
      }));
    } finally {
      setDeletingImageId(null);
    }
  }

  // La conferma sparisce da sola: lasciata a schermo diventerebbe rumore, e la
  // miniatura con badge «Caricata» resta comunque come prova dell'upload.
  useEffect(() => {
    if (!uploadDoneSlug) return;
    const timer = window.setTimeout(() => setUploadDoneSlug(null), 8000);
    return () => window.clearTimeout(timer);
  }, [uploadDoneSlug]);

  // Miniature da mostrare per un prodotto: le foto a catalogo più, in testa,
  // quella caricata solo per la campagna. Senza questa, una foto caricata
  // senza «carica anche nel sito» finisce in media library e non compare fra
  // le miniature, dando l'impressione che l'upload non abbia fatto nulla.
  function getPhotoOptions(slug: string) {
    const gallery = (catalogImages[slug] || []).map((image) => ({
      ...image,
      uploaded: false,
    }));
    const override = productImageOverrides[slug];
    if (override && !gallery.some((image) => image.url === override)) {
      return [
        {
          id: `uploaded-${slug}`,
          url: override,
          isPrimary: false,
          uploaded: true,
        },
        ...gallery,
      ];
    }
    return gallery;
  }
  // Foto già a catalogo, per poterne scegliere una esistente invece di
  // ricaricarla. Chiave = slug prodotto.
  const [catalogImages, setCatalogImages] = useState<
    Record<string, Array<{ id: string; url: string; isPrimary: boolean }>>
  >({});

  const stats = useMemo(() => {
    const qualified = leads.filter(
      (lead) => lead.status === "qualified",
    ).length;
    const contacted = leads.filter(
      (lead) => lead.status === "contacted",
    ).length;
    const withEmail = leads.filter((lead) =>
      Boolean(lead.contact_email),
    ).length;
    const replied = leads.filter((lead) => Boolean(lead.last_reply_at)).length;
    const stopped = leads.filter(
      (lead) => Boolean(lead.stop_requested_at) || lead.do_not_contact,
    ).length;
    return {
      total: leads.length,
      qualified,
      contacted,
      withEmail,
      replied,
      stopped,
    };
  }, [leads]);

  const selectedSegments = useMemo(
    () => getLeadSegments(selectedSegmentIds),
    [selectedSegmentIds],
  );
  const latestScanLeadRank = useMemo(() => {
    const rank = new Map<string, number>();
    scanSummary?.updatedLeadIds.forEach((id) => rank.set(id, 1));
    scanSummary?.createdLeadIds.forEach((id) => rank.set(id, 2));
    return rank;
  }, [scanSummary]);
  const rankedConversionLeads = useMemo(
    () =>
      leads
        .filter(
          (lead) =>
            Boolean(lead.contact_email) &&
            !lead.do_not_contact &&
            lead.status !== "do_not_contact",
        )
        .map((lead) => ({
          lead,
          conversionScore: getLeadConversionScore(lead),
        }))
        .sort(
          (leadA, leadB) =>
            Number(leadB.lead.priority_high) -
              Number(leadA.lead.priority_high) ||
            leadB.conversionScore - leadA.conversionScore ||
            (leadB.lead.score || 0) - (leadA.lead.score || 0),
        ),
    [leads],
  );
  const displayedLeads = useMemo(
    () =>
      [...leads].sort(
        (leadA, leadB) =>
          (latestScanLeadRank.get(leadB.id) || 0) -
            (latestScanLeadRank.get(leadA.id) || 0) ||
          Number(Boolean(leadB.priority_high)) -
            Number(Boolean(leadA.priority_high)) ||
          (leadB.score || 0) - (leadA.score || 0) ||
          new Date(leadB.created_at).getTime() -
            new Date(leadA.created_at).getTime(),
      ),
    [leads, latestScanLeadRank],
  );
  const selectedConversionStats = useMemo(() => {
    const selected = leads.filter((lead) => selectedIds.includes(lead.id));
    const average =
      selected.length > 0
        ? Math.round(
            selected.reduce(
              (total, lead) => total + getLeadConversionScore(lead),
              0,
            ) / selected.length,
          )
        : 0;
    const missingNotes = selected.filter(
      (lead) => !hasSpecificTargetingNote(lead.notes),
    ).length;
    return { count: selected.length, average, missingNotes };
  }, [leads, selectedIds]);
  const targetingGuide = FOCUS_TARGETING_GUIDE[focus] || [];
  const primaryOutreachProductSlug = [
    "hospitality",
    "bed_breakfast",
    "hotel_boutique",
    "resort_beach_club",
    "spa_wellness",
  ].includes(focus)
    ? "tivan"
    : ["yacht_golf_club", "tour_operator_luxury", "boat_charter"].includes(
          focus,
        )
      ? "darsena-navy"
      : "como-puro";
  const scanSummaryProgress =
    scanSummary?.status === "running"
      ? scanProgress
      : scanSummary?.progress || 0;

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    setReplies(initialReplies);
  }, [initialReplies]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function selectVisible(withEmailsOnly = false) {
    setSelectedIds(
      leads
        .filter((lead) => (withEmailsOnly ? Boolean(lead.contact_email) : true))
        .map((lead) => lead.id),
    );
  }

  function selectTopConversionLeads() {
    const leadIds = rankedConversionLeads
      .slice(0, RECOMMENDED_OUTREACH_BATCH_SIZE)
      .map(({ lead }) => lead.id);
    setSelectedIds(leadIds);
    setMessage(
      leadIds.length
        ? `Selezionati ${leadIds.length} lead con priorità conversione più alta.`
        : "Nessun lead con email disponibile per il lotto conversione.",
    );
  }

  async function refresh() {
    router.refresh();
  }

  function toggleLeadSegment(segment: LeadSegment) {
    if (selectedSegmentIds.includes(segment.id)) {
      setSelectedSegmentIds((previous) =>
        previous.filter((segmentId) => segmentId !== segment.id),
      );
      return;
    }

    if (selectedSegmentIds.length >= MAX_LEAD_SEGMENTS_PER_SEARCH) {
      setMessage(
        `Seleziona massimo ${MAX_LEAD_SEGMENTS_PER_SEARCH} tipologie per mantenere la ricerca precisa.`,
      );
      return;
    }

    setSelectedSegmentIds((previous) => [...previous, segment.id]);
    setScanIndustry(segment.focus);
    setFocus(segment.focus);
    setMessage(null);
  }

  async function runLiveSearch() {
    const query = buildLeadSegmentQuery(selectedSegments, liveQuery);
    if (!query) {
      setMessage(
        "Seleziona almeno una tipologia lead oppure inserisci parole chiave aggiuntive.",
      );
      return;
    }

    const requested = Number(liveMaxResults) || 15;
    const startedAt = new Date().toISOString();
    setBusy(true);
    setLiveSearching(true);
    setScanProgress(6);
    setScanSummary({
      mode: "live",
      status: "running",
      title: "Ricerca live in corso",
      detail: query,
      requested,
      candidates: 0,
      saved: 0,
      created: 0,
      updated: 0,
      warnings: 0,
      progress: 6,
      createdLeadIds: [],
      updatedLeadIds: [],
      startedAt,
    });
    setMessage(null);
    const progressTimer = window.setInterval(() => {
      const step = requested > 20 ? 3 : 5;
      setScanProgress((previous) => {
        if (previous >= 93) return previous;
        return Math.min(93, previous + step);
      });
      setScanSummary((current) =>
        current?.status === "running"
          ? { ...current, progress: Math.min(93, current.progress + step) }
          : current,
      );
    }, 850);
    try {
      const response = await fetch("/api/admin/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          customQuery: liveQuery,
          location: liveLocation,
          industry: selectedSegments[0]?.focus || scanIndustry,
          segmentIds: selectedSegmentIds,
          notes: scanNotes,
          maxResults: Number(liveMaxResults) || 15,
        }),
      });
      const data = await readApiJson(response);
      const providerDiagnostics = Array.isArray(data.providerDiagnostics)
        ? data.providerDiagnostics
        : [];
      const diagnosticText = providerDiagnostics
        .filter((diagnostic: any) => diagnostic.status !== "success")
        .map(
          (diagnostic: any) =>
            `${diagnostic.provider}: ${diagnostic.message}`,
        )
        .join(" · ");
      if (!response.ok) {
        throw new Error(
          `${data.error || "Ricerca live fallita"}${
            diagnosticText ? ` — ${diagnosticText}` : ""
          }`,
        );
      }
      const provider =
        data.provider === "openstreetmap"
          ? "OpenStreetMap"
          : data.provider === "duckduckgo"
            ? "motore pubblico"
            : "Google";
      const warningText = data.warnings?.length
        ? ` ${data.warnings.length} siti non leggibili.`
        : "";
      const created = data.created || 0;
      const updated = data.updated || 0;
      const completedAt = new Date().toISOString();
      setScanProgress(100);
      setScanSummary({
        mode: "live",
        status: "done",
        title: "Ricerca live completata",
        detail: query,
        requested,
        candidates: data.candidates || 0,
        saved: data.saved || 0,
        created,
        updated,
        warnings: Array.isArray(data.warnings) ? data.warnings.length : 0,
        progress: 100,
        provider,
        createdLeadIds: Array.isArray(data.createdLeadIds)
          ? data.createdLeadIds
          : [],
        updatedLeadIds: Array.isArray(data.updatedLeadIds)
          ? data.updatedLeadIds
          : [],
        categoryBreakdown: Array.isArray(data.categoryBreakdown)
          ? data.categoryBreakdown
          : [],
        startedAt,
        completedAt,
      });
      setMessage(
        `Ricerca completata via ${provider}: ${created} nuovi lead, ${updated} già presenti aggiornati, ${data.saved || 0} salvati da ${data.candidates || 0} risultati.${warningText}${
          diagnosticText ? ` Diagnostica fallback: ${diagnosticText}.` : ""
        }`,
      );
      await refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore ricerca live";
      setScanSummary((current) => ({
        mode: "live",
        status: "error",
        title: "Ricerca live non completata",
        detail: query,
        requested,
        candidates: current?.candidates || 0,
        saved: current?.saved || 0,
        created: current?.created || 0,
        updated: current?.updated || 0,
        warnings: current?.warnings || 0,
        progress: current?.progress || scanProgress,
        provider: current?.provider,
        createdLeadIds: current?.createdLeadIds || [],
        updatedLeadIds: current?.updatedLeadIds || [],
        startedAt: current?.startedAt || startedAt,
        completedAt: new Date().toISOString(),
        error: errorMessage,
      }));
      setMessage(errorMessage);
    } finally {
      window.clearInterval(progressTimer);
      setBusy(false);
      setLiveSearching(false);
    }
  }

  async function runDiscovery() {
    const urls = scanUrls
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setMessage("Inserisci almeno un dominio o URL pubblico.");
      return;
    }

    const startedAt = new Date().toISOString();
    setBusy(true);
    setScanningSites(true);
    setScanProgress(5);
    setScanSummary({
      mode: "url",
      status: "running",
      title: "Scansione URL in corso",
      detail: `${urls.length} URL pubblici`,
      requested: urls.length,
      candidates: urls.length,
      saved: 0,
      created: 0,
      updated: 0,
      warnings: 0,
      progress: 5,
      createdLeadIds: [],
      updatedLeadIds: [],
      startedAt,
    });
    setMessage(null);
    const progressTimer = window.setInterval(() => {
      const step = urls.length > 12 ? 3 : 5;
      setScanProgress((previous) => {
        if (previous >= 92) return previous;
        return Math.min(92, previous + step);
      });
      setScanSummary((current) =>
        current?.status === "running"
          ? { ...current, progress: Math.min(92, current.progress + step) }
          : current,
      );
    }, 900);
    try {
      const response = await fetch("/api/admin/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls,
          industry: scanIndustry,
          notes: scanNotes,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Discovery fallita");
      setScanProgress(100);
      const created = data.created || 0;
      const updated = data.updated || 0;
      setScanSummary({
        mode: "url",
        status: "done",
        title: "Scansione URL completata",
        detail: `${urls.length} URL pubblici`,
        requested: urls.length,
        candidates: urls.length,
        saved: data.discovered || 0,
        created,
        updated,
        warnings: Array.isArray(data.warnings) ? data.warnings.length : 0,
        progress: 100,
        createdLeadIds: Array.isArray(data.createdLeadIds)
          ? data.createdLeadIds
          : [],
        updatedLeadIds: Array.isArray(data.updatedLeadIds)
          ? data.updatedLeadIds
          : [],
        startedAt,
        completedAt: new Date().toISOString(),
      });
      const warningText = data.warnings?.length
        ? ` ${data.warnings.length} siti non leggibili.`
        : "";
      setMessage(
        `Scansione completata: ${created} nuovi lead, ${updated} già presenti aggiornati, ${data.discovered || 0} totali.${warningText}`,
      );
      setScanUrls("");
      await refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore di scansione";
      setScanSummary((current) => ({
        mode: "url",
        status: "error",
        title: "Scansione URL non completata",
        detail: `${urls.length} URL pubblici`,
        requested: urls.length,
        candidates: urls.length,
        saved: current?.saved || 0,
        created: current?.created || 0,
        updated: current?.updated || 0,
        warnings: current?.warnings || 0,
        progress: current?.progress || scanProgress,
        createdLeadIds: current?.createdLeadIds || [],
        updatedLeadIds: current?.updatedLeadIds || [],
        startedAt: current?.startedAt || startedAt,
        completedAt: new Date().toISOString(),
        error: errorMessage,
      }));
      setMessage(errorMessage);
    } finally {
      window.clearInterval(progressTimer);
      setBusy(false);
      setScanningSites(false);
      window.setTimeout(() => setScanProgress(0), 1200);
    }
  }

  async function addManualLead() {
    if (!manual.company_name.trim() || !manual.website_url.trim()) {
      setMessage("Servono nome azienda e sito web.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(manual).map(([key, value]) => [
          key,
          typeof value === "string" && !value.trim() ? undefined : value,
        ]),
      );
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Lead non salvato");
      setMessage(
        `Lead salvato: ${data.lead?.company_name || manual.company_name}`,
      );
      setManual({
        company_name: "",
        website_url: "",
        industry: "hospitality",
        city: "",
        country: "IT",
        contact_name: "",
        contact_role: "",
        contact_email: "",
        contact_phone: "",
        source_url: "",
        public_contact_page: "",
        notes: "",
        priority_high: false,
      });
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Errore salvataggio lead",
      );
    } finally {
      setBusy(false);
    }
  }

  async function patchLead(id: string, patch: Record<string, unknown>) {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Aggiornamento fallito");
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? data.lead : lead)),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aggiornamento lead fallito",
      );
    }
  }

  async function deleteLead(id: string, name: string) {
    if (!confirm(`Eliminare il lead "${name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "DELETE",
      });
      const data = await readApiJson(response);
      if (!response.ok) {
        throw new Error(data.error || "Cancellazione fallita");
      }
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Cancellazione lead fallita",
      );
    }
  }

  async function openOutreachPreview(overrideIds?: string[]) {
    const ids = overrideIds?.length ? overrideIds : selectedIds;
    if (ids.length === 0) {
      setMessage("Seleziona almeno un lead.");
      return;
    }

    if (ids.length > RECOMMENDED_OUTREACH_BATCH_SIZE) {
      setMessage(
        `Per proteggere reputazione e conversione puoi generare massimo ${RECOMMENDED_OUTREACH_BATCH_SIZE} email per lotto. Riduci la selezione.`,
      );
      return;
    }

    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewConfirmed(false);
    setOutreachPreviews([]);
    setReviewedPreviewIds([]);
    setPreviewLeadIds(ids);
    setOutreachSendReceipt(null);
    setRecipientEmailOverrides((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([leadId]) => ids.includes(leadId)),
      ),
    );
    setMessage(null);
    try {
      const response = await fetch("/api/admin/leads/outreach/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: ids,
          focus,
          notes: campaignNotes,
          productImageOverrides,
          recipientEmailOverrides: Object.fromEntries(
            Object.entries(recipientEmailOverrides).filter(
              ([leadId, email]) => ids.includes(leadId) && EMAIL_PATTERN.test(email),
            ),
          ),
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Anteprima non disponibile");
      const previews = (data.previews || []) as OutreachPreview[];
      if (previews.length !== ids.length) {
        throw new Error(
          `Anteprima incompleta: generate ${previews.length} email su ${ids.length}. Ricarica i lead e riprova.`,
        );
      }
      setOutreachPreviews(previews);
      setPreviewLeadId(previews[0]?.leadId || "");
      setReviewedPreviewIds(previews[0]?.leadId ? [previews[0].leadId] : []);
    } catch (error) {
      setPreviewOpen(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore generazione anteprima",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function openPreviewInNewTab(preview: OutreachPreview) {
    const previewBlob = new Blob([preview.html], { type: "text/html" });
    const previewUrl = URL.createObjectURL(previewBlob);
    const previewLink = document.createElement("a");
    previewLink.href = previewUrl;
    previewLink.target = "_blank";
    previewLink.rel = "noopener noreferrer";
    document.body.appendChild(previewLink);
    previewLink.click();
    previewLink.remove();
    setMessage("Anteprima aperta in una nuova scheda del browser.");
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
  }

  async function loadCatalogImages() {
    try {
      const response = await fetch("/api/admin/leads/outreach/product-image");
      const data = await readApiJson(response);
      if (!response.ok) return;
      setCatalogImages(data.images || {});
    } catch {
      // Non blocca il pannello: senza elenco restano upload e foto di default.
    }
  }

  useEffect(() => {
    void loadCatalogImages();
  }, []);

  // Cambiando la foto mentre l'anteprima è aperta, l'anteprima va rigenerata:
  // l'HTML mostrato arriva dalla chiamata precedente e resterebbe quello di
  // prima, facendo sembrare che la scelta non abbia avuto effetto.
  // Sta in un effect e non nell'onClick perché openOutreachPreview legge
  // productImageOverrides dallo stato: chiamandola subito dopo il setState
  // manderebbe ancora il valore vecchio.
  const previewRefreshKey = JSON.stringify(productImageOverrides);
  const lastPreviewRefreshKey = useRef(previewRefreshKey);
  useEffect(() => {
    if (lastPreviewRefreshKey.current === previewRefreshKey) return;
    lastPreviewRefreshKey.current = previewRefreshKey;
    if (!previewOpen || previewLeadIds.length === 0) return;
    void openOutreachPreview(previewLeadIds);
    // openOutreachPreview è stabile nel ciclo di vita del pannello e rileggere
    // le altre dipendenze qui rigenererebbe l'anteprima anche per modifiche
    // che non riguardano le foto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewRefreshKey, previewOpen, previewLeadIds]);

  // La foto caricata viene salvata nel catalogo (product_images), non solo
  // nello stato della campagna: prima finiva in /api/admin/media e viveva solo
  // in memoria, quindi spariva al primo reload della pagina.
  async function uploadProductOverride(slug: string, file: File | null) {
    if (!file) return;
    const toSite = Boolean(productImageToSite[slug]);
    const makePrimary = toSite && Boolean(productImagePrimary[slug]);
    setUploadingProductSlug(slug);
    setUploadProgress((previous) => ({ ...previous, [slug]: 0 }));
    setUploadDoneSlug(null);
    setUploadError((previous) => {
      const next = { ...previous };
      delete next[slug];
      return next;
    });
    // La riga si apre subito: la barra di avanzamento sta dentro il dettaglio
    // del prodotto, a riga chiusa non si vedrebbe.
    setOpenPhotoSlug(slug);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const onProgress = (percent: number) =>
        setUploadProgress((previous) => ({ ...previous, [slug]: percent }));
      let uploadedUrl: string | undefined;

      if (toSite) {
        formData.append("slug", slug);
        formData.append("makePrimary", makePrimary ? "true" : "false");
        const { ok, data } = await uploadWithProgress(
          "/api/admin/leads/outreach/product-image",
          formData,
          onProgress,
        );
        if (!ok) throw new Error(data.error || "Upload immagine fallito");
        uploadedUrl = data.url as string | undefined;
        setMessage(
          data.isPrimary
            ? "Foto salvata nel sito e impostata come principale: la useranno sia l’email sia la scheda prodotto."
            : "Foto aggiunta alla galleria del prodotto sul sito e usata in questa campagna. Sul sito la principale resta quella attuale.",
        );
        // La foto appena caricata deve comparire subito fra quelle
        // scegliibili dal catalogo.
        void loadCatalogImages();
      } else {
        // Solo campagna: finisce nella media library, non nella scheda
        // prodotto, quindi sul sito non compare da nessuna parte.
        formData.append("alt_text", `Foto proposta B2B ${slug}`);
        const { ok, data } = await uploadWithProgress(
          "/api/admin/media",
          formData,
          onProgress,
        );
        if (!ok) throw new Error(data.error || "Upload immagine fallito");
        uploadedUrl = data.media?.url as string | undefined;
        // Serve l'id per poterla eliminare: l'override conosce solo l'URL.
        const mediaId = data.media?.id as string | undefined;
        if (mediaId) {
          setCampaignUploadId((previous) => ({ ...previous, [slug]: mediaId }));
        }
        setMessage(
          "Foto usata solo in questa email e archiviata in Media. Sul sito non compare.",
        );
      }

      if (!uploadedUrl) throw new Error("URL immagine non ricevuto");
      setProductImageOverrides((previous) => ({
        ...previous,
        [slug]: uploadedUrl,
      }));
      setUploadDoneSlug(slug);
      setPreviewConfirmed(false);
      setOutreachSendReceipt(null);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Errore upload immagine";
      setUploadError((previous) => ({ ...previous, [slug]: detail }));
      setMessage(detail);
    } finally {
      setUploadingProductSlug(null);
      setUploadProgress((previous) => {
        const next = { ...previous };
        delete next[slug];
        return next;
      });
    }
  }

  async function sendOutreach(ids: string[]) {
    if (ids.length === 0 || !previewConfirmed) {
      setMessage("Apri e conferma l’anteprima prima dell’invio.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const validRecipientEmailOverrides = Object.fromEntries(
        Object.entries(recipientEmailOverrides).filter(
          ([leadId, email]) =>
            ids.includes(leadId) &&
            EMAIL_PATTERN.test(email) &&
            email !==
              outreachPreviews.find((preview) => preview.leadId === leadId)
                ?.originalRecipientEmail,
        ),
      );
      const response = await fetch("/api/admin/leads/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: ids,
          focus,
          notes: campaignNotes,
          productImageOverrides,
          recipientEmailOverrides: validRecipientEmailOverrides,
          previewConfirmed: true,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || "Invio fallito");
      const results = Array.isArray(data.results) ? data.results : [];
      const sent = results.filter((item: any) => item.ok).length;
      const manualSent = results.filter(
        (item: any) => item.ok && item.manualRecipient,
      ).length;
      const successfulResults = results.filter((item: any) => item.ok);
      const successfulEmails = successfulResults
        .map((item: any) => item.email)
        .filter(Boolean);
      const successfulJobIds = successfulResults
        .map((item: any) => item.jobId)
        .filter(Boolean);
      const failedResults = results.filter((item: any) => !item.ok);
      const failed = failedResults.length;
      if (sent === 0) {
        const reasons = failedResults
          .map((item: any) => item.error)
          .filter(Boolean)
          .slice(0, 3)
          .join(" · ");
        throw new Error(
          `Nessuna email inviata${reasons ? `: ${reasons}` : "."}`,
        );
      }
      if (sent > 0 && sent === manualSent) {
        setOutreachSendReceipt({
          status: failed > 0 ? "partial" : "sent",
          mode: "test",
          emails: successfulEmails,
          sentAt: new Date().toISOString(),
          subject: outreachPreviews.find((preview) =>
            ids.includes(preview.leadId),
          )?.subject,
          jobIds: successfulJobIds,
          failedCount: failed,
          detail:
            "Accettata dal provider email. Nessun lead cliente è stato marcato come contattato.",
        });
        setPreviewConfirmed(false);
        setMessage(
          `TEST INVIATO${successfulEmails.length ? ` a ${successfulEmails.join(", ")}` : ""}. Nessun lead cliente è stato marcato come contattato${
            failed ? `; ${failed} invii non riusciti` : ""
          }.`,
        );
      } else {
        const customerSent = sent - manualSent;
        setMessage(
          `Invio completato: ${customerSent} contatti cliente${
            manualSent ? `, ${manualSent} test` : ""
          }${failed ? `, ${failed} non riusciti` : ""}.`,
        );
      }
      if (failed > 0) {
        const failedIds = failedResults.map((item: any) => item.leadId);
        setSelectedIds(failedIds);
        setPreviewConfirmed(false);
        setOutreachPreviews((previous) =>
          previous.filter((preview) => failedIds.includes(preview.leadId)),
        );
        setPreviewLeadIds(failedIds);
        setPreviewLeadId(failedIds[0] || "");
        setReviewedPreviewIds([]);
        setRecipientEmailOverrides((previous) =>
          Object.fromEntries(
            Object.entries(previous).filter(([leadId]) =>
              failedIds.includes(leadId),
            ),
          ),
        );
        setMessage(
          `Invio parziale: ${sent} riusciti, ${failed} non riusciti. Restano selezionati solo i lead da correggere; genera nuovamente l’anteprima prima di ritentare.`,
        );
        await refresh();
        return;
      }
      if (sent > 0 && sent === manualSent) {
        await refresh();
        return;
      }
      setSelectedIds([]);
      setPreviewOpen(false);
      setPreviewConfirmed(false);
      setOutreachPreviews([]);
      setPreviewLeadIds([]);
      setReviewedPreviewIds([]);
      setRecipientEmailOverrides({});
      await refresh();
    } catch (error) {
      setOutreachSendReceipt({
        status: "failed",
        mode: manualRecipientCount > 0 ? "test" : "customer",
        emails: outreachPreviews
          .filter((preview) => ids.includes(preview.leadId))
          .map((preview) => preview.recipientEmail || "")
          .filter(Boolean),
        sentAt: new Date().toISOString(),
        subject: activePreview?.subject,
        jobIds: [],
        detail: error instanceof Error ? error.message : "Errore invio email",
      });
      setMessage(error instanceof Error ? error.message : "Errore invio email");
    } finally {
      setBusy(false);
    }
  }

  const selectedLeads = leads.filter((lead) => selectedIds.includes(lead.id));
  const activePreview = outreachPreviews.find(
    (preview) => preview.leadId === previewLeadId,
  );
  const allPreviewsValid =
    previewLeadIds.length > 0 &&
    outreachPreviews.length === previewLeadIds.length &&
    outreachPreviews.every((preview) => preview.valid);
  const allPreviewsReviewed =
    previewLeadIds.length > 0 &&
    previewLeadIds.every((leadId) => reviewedPreviewIds.includes(leadId));
  const manualRecipientCount = outreachPreviews.filter(
    (preview) => preview.isManualRecipient,
  ).length;

  function updatePreviewRecipientEmail(preview: OutreachPreview, email: string) {
    const nextEmail = email.trim();
    const originalEmail = preview.originalRecipientEmail || "";
    const isManualRecipient = Boolean(
      nextEmail && nextEmail.toLowerCase() !== originalEmail.toLowerCase(),
    );
    const effectiveEmail = nextEmail || originalEmail || null;

    setRecipientEmailOverrides((previous) => {
      const next = { ...previous };
      if (isManualRecipient && EMAIL_PATTERN.test(nextEmail)) {
        next[preview.leadId] = nextEmail;
      } else {
        delete next[preview.leadId];
      }
      return next;
    });
    setOutreachPreviews((previous) =>
      previous.map((item) => {
        if (item.leadId !== preview.leadId) return item;
        const checks = item.checks.map((check) =>
          check.label === "Destinatario email presente" ||
          check.label === "Email di recapito manuale presente"
            ? {
                ...check,
                label: isManualRecipient
                  ? "Email di recapito manuale presente"
                  : "Destinatario email presente",
                ok: Boolean(effectiveEmail) && EMAIL_PATTERN.test(effectiveEmail || ""),
              }
            : check,
        );
        return {
          ...item,
          recipientEmail: effectiveEmail,
          isManualRecipient,
          checks,
          valid: checks.every((check) => check.ok),
        };
      }),
    );
    setPreviewConfirmed(false);
    setOutreachSendReceipt(null);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      <div className="space-y-6">
        {message && (
          <section
            className="border border-gold-primary/50 bg-ivory px-5 py-4 text-sm leading-relaxed"
            role="status"
            aria-live="polite"
          >
            {message}
          </section>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Stat label="Lead totali" value={stats.total} />
          <Stat label="Con email" value={stats.withEmail} />
          <Stat label="Qualificati" value={stats.qualified} />
          <Stat label="Contattati" value={stats.contacted} />
          <Stat label="Risposte" value={stats.replied} />
          <Stat label="Stop" value={stats.stopped} />
        </section>

        {scanSummary && (
          <LeadScanStatus
            summary={scanSummary}
            progress={scanSummaryProgress}
          />
        )}

        <section className="border border-pearl-grey bg-white p-5 space-y-4">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-medium text-lg flex items-center gap-2">
                <Search className="w-4 h-4 text-gold-primary" />
                Ricerca live contatti
              </h2>
              <p className="text-sm text-soft-grey">
                Cerca aziende reali online e crea lead con sito, pagina contatti
                ed email pubblica quando disponibile.
              </p>
            </div>
            <button
              type="button"
              onClick={runLiveSearch}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 bg-soft-black px-4 py-2 text-sm text-warm-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
            >
              <Search
                className={`w-4 h-4 ${liveSearching ? "animate-pulse" : ""}`}
                aria-hidden="true"
              />
              {liveSearching ? "Scansione live…" : "Trova e scansiona"}
              {liveSearching && (
                <span className="ml-1 border-l border-warm-white/30 pl-2 text-xs tabular-nums text-gold-primary">
                  {scanProgress}%
                </span>
              )}
            </button>
          </div>
          <LeadSegmentMenu
            selectedIds={selectedSegmentIds}
            onToggle={toggleLeadSegment}
            onClear={() => setSelectedSegmentIds([])}
          />
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_140px] gap-4">
            <div className="space-y-2">
              <label
                htmlFor="lead-search-extra"
                className="text-[10px] uppercase tracking-[0.2em] text-soft-grey"
              >
                Parole chiave extra
              </label>
              <div className="flex items-center gap-2 border border-pearl-grey bg-warm-white px-3 py-3 focus-within:border-soft-black focus-within:ring-1 focus-within:ring-gold-primary">
                <Search
                  className="w-4 h-4 text-soft-grey flex-shrink-0"
                  aria-hidden="true"
                />
                <input
                  id="lead-search-extra"
                  name="lead-search-extra"
                  value={liveQuery}
                  onChange={(e) => setLiveQuery(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-transparent text-sm focus-visible:outline-none"
                  placeholder="Es. clientela VIP, shop interno…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="lead-search-location"
                className="text-[10px] uppercase tracking-[0.2em] text-soft-grey"
              >
                Zona
              </label>
              <div className="flex items-center gap-2 border border-pearl-grey bg-warm-white px-3 py-3 focus-within:border-soft-black focus-within:ring-1 focus-within:ring-gold-primary">
                <MapPin
                  className="w-4 h-4 text-soft-grey flex-shrink-0"
                  aria-hidden="true"
                />
                <input
                  id="lead-search-location"
                  name="lead-search-location"
                  value={liveLocation}
                  onChange={(e) => setLiveLocation(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-transparent text-sm focus-visible:outline-none"
                  placeholder="Como, Milano, Svizzera…"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {LEAD_ZONE_PRESETS.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setLiveLocation(zone)}
                    className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] border transition-colors ${
                      liveLocation === zone
                        ? "border-soft-black bg-soft-black text-white"
                        : "border-pearl-grey text-soft-grey hover:border-soft-black hover:text-soft-black"
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="lead-search-limit"
                className="text-[10px] uppercase tracking-[0.2em] text-soft-grey"
              >
                Risultati
              </label>
              <select
                id="lead-search-limit"
                name="lead-search-limit"
                value={liveMaxResults}
                onChange={(e) => setLiveMaxResults(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-soft-black"
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-soft-grey">
            Ricerca geografica su dati © OpenStreetMap contributors (ODbL),
            integrata con scansione dei siti business pubblici.
          </p>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-lg flex items-center gap-2">
                <Search className="w-4 h-4 text-gold-primary" />
                Scansione siti pubblici
              </h2>
              <p className="text-sm text-soft-grey">
                Inserisci domini hotel, pagine contatti o altri siti business
                pubblici.
              </p>
            </div>
            <button
              type="button"
              onClick={runDiscovery}
              disabled={busy}
              className="group inline-flex items-center gap-2 border border-gold-primary/70 bg-soft-black px-4 py-2 text-sm font-medium text-warm-white shadow-sm transition hover:bg-gold-primary hover:text-soft-black disabled:opacity-60"
              title="Scansiona gli URL inseriti e salva/aggiorna i lead trovati"
            >
              <RefreshCw className={`w-4 h-4 ${scanningSites ? "animate-spin" : ""}`} />
              {scanningSites ? "Scansione…" : "Scansiona URL"}
              {scanningSites && (
                <span className="ml-1 border-l border-warm-white/30 pl-2 text-xs tabular-nums text-gold-primary group-hover:text-soft-black">
                  {scanProgress}%
                </span>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                URL da scansionare
              </label>
              <textarea
                value={scanUrls}
                onChange={(e) => setScanUrls(e.target.value)}
                rows={4}
                placeholder="https://hotel-example.com\nhttps://another-hotel.com\nMassimo 30 URL per scansione"
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black resize-y"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Settore
              </label>
              <select
                value={scanIndustry}
                onChange={(e) => setScanIndustry(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Note discovery
              </label>
              <input
                value={scanNotes}
                onChange={(e) => setScanNotes(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
                placeholder="es. focus Lago di Como, hospitality, boutique hotel"
              />
            </div>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-lg flex items-center gap-2">
                <Plus className="w-4 h-4 text-gold-primary" />
                Aggiungi lead manuale
              </h2>
              <p className="text-sm text-soft-grey">
                Per importazioni rapide o contatti già verificati.
              </p>
            </div>
            <button
              type="button"
              onClick={addManualLead}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 border border-soft-black text-sm disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              Salva lead
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Azienda"
              value={manual.company_name}
              onChange={(company_name) =>
                setManual((prev) => ({ ...prev, company_name }))
              }
            />
            <Field
              label="Sito web"
              value={manual.website_url}
              onChange={(website_url) =>
                setManual((prev) => ({ ...prev, website_url }))
              }
            />
            <Field
              label="Città"
              value={manual.city}
              onChange={(city) => setManual((prev) => ({ ...prev, city }))}
            />
            <Field
              label="Paese"
              value={manual.country}
              onChange={(country) =>
                setManual((prev) => ({ ...prev, country }))
              }
            />
            <Field
              label="Email contatto"
              value={manual.contact_email}
              onChange={(contact_email) =>
                setManual((prev) => ({ ...prev, contact_email }))
              }
            />
            <Field
              label="Ruolo"
              value={manual.contact_role}
              onChange={(contact_role) =>
                setManual((prev) => ({ ...prev, contact_role }))
              }
            />
            <Field
              label="Nome contatto"
              value={manual.contact_name}
              onChange={(contact_name) =>
                setManual((prev) => ({ ...prev, contact_name }))
              }
            />
            <Field
              label="Telefono"
              value={manual.contact_phone}
              onChange={(contact_phone) =>
                setManual((prev) => ({ ...prev, contact_phone }))
              }
            />
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Settore
              </label>
              <select
                value={manual.industry}
                onChange={(e) =>
                  setManual((prev) => ({ ...prev, industry: e.target.value }))
                }
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Fonte"
              value={manual.source_url}
              onChange={(source_url) =>
                setManual((prev) => ({ ...prev, source_url }))
              }
            />
            <Field
              label="Pagina contatti"
              value={manual.public_contact_page}
              onChange={(public_contact_page) =>
                setManual((prev) => ({ ...prev, public_contact_page }))
              }
            />
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Note
              </label>
              <textarea
                value={manual.notes}
                onChange={(e) =>
                  setManual((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black resize-y"
                placeholder="Osservazioni interne, contesto della struttura, priorità"
              />
            </div>
            <label className="md:col-span-2 flex items-center gap-3 border border-gold-primary/40 bg-ivory px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={manual.priority_high}
                onChange={(event) =>
                  setManual((previous) => ({
                    ...previous,
                    priority_high: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-black"
              />
              <span>
                <strong>Priorità alta</strong>
                <span className="ml-2 text-soft-grey">
                  Evidenzia internamente il lead e lo porta in cima alla selezione.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-pearl-grey flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium text-lg">Lead pubblici</h2>
              <p className="text-sm text-soft-grey">
                {leads.length} record salvati
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectTopConversionLeads}
                className="px-3 py-2 text-sm border border-gold-primary bg-ivory text-soft-black"
              >
                Top conversione
              </button>
              <button
                type="button"
                onClick={() => selectVisible(false)}
                className="px-3 py-2 text-sm border border-pearl-grey"
              >
                Seleziona tutti
              </button>
              <button
                type="button"
                onClick={() => selectVisible(true)}
                className="px-3 py-2 text-sm border border-pearl-grey"
              >
                Solo con email
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 text-sm border border-pearl-grey"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-warm-white border-b border-pearl-grey">
                <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Contatto</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl-grey/60">
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-soft-grey"
                    >
                      Nessun lead ancora. Inserisci i primi domini da
                      scansionare.
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead) => {
                    const latestScanRank = latestScanLeadRank.get(lead.id) || 0;
                    const latestScanLabel =
                      latestScanRank === 2
                        ? "Nuovo batch"
                        : latestScanRank === 1
                          ? "Già presente"
                          : null;
                    return (
                      <tr
                        key={lead.id}
                        className={[
                          latestScanRank === 2
                            ? "bg-emerald-50/70"
                            : latestScanRank === 1
                              ? "bg-gold-primary/10"
                              : "",
                          selectedIds.includes(lead.id) ? "bg-ivory/70" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelected(lead.id)}
                          className="h-4 w-4 accent-black"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gold-primary" />
                            <p className="font-medium">{lead.company_name}</p>
                            {latestScanLabel && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                                  latestScanRank === 2
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-gold-primary/20 text-soft-black"
                                }`}
                              >
                                {latestScanLabel}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-soft-grey">
                            <Globe className="w-3.5 h-3.5" />
                            <a
                              href={lead.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-gold-primary truncate max-w-[240px]"
                            >
                              {lead.website_url}
                            </a>
                          </div>
                          {lead.notes && (
                            <p className="text-xs text-soft-grey max-w-[420px] line-clamp-2">
                              {lead.notes}
                            </p>
                          )}
                          {lead.last_reply_excerpt && (
                            <p className="text-xs text-soft-black/70 max-w-[420px] line-clamp-2">
                              Risposta: {lead.last_reply_excerpt}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-soft-grey" />
                            <span>{lead.contact_email || "—"}</span>
                          </div>
                          <div>
                            {lead.contact_name || "—"}{" "}
                            {lead.contact_role ? `· ${lead.contact_role}` : ""}
                          </div>
                          <div>
                            {[lead.city, lead.country]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                          {lead.public_contact_page && (
                            <a
                              href={lead.public_contact_page}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-gold-primary hover:underline"
                            >
                              Pagina contatti{" "}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] rounded ${STATUS_BADGES[lead.status] || "bg-pearl-grey text-soft-grey"}`}
                          >
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              patchLead(lead.id, { status: e.target.value })
                            }
                            className="block w-full border border-pearl-grey px-2 py-1 text-xs bg-white focus:outline-none focus:border-soft-black"
                          >
                            {Object.keys(STATUS_LABELS).map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm">
                        <div className="space-y-1">
                          {(() => {
                            const conversionScore =
                              getLeadConversionScore(lead);
                            const tier = getLeadConversionTier(conversionScore);
                            return (
                              <div className="mb-2">
                                <span
                                  className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] rounded ${tier.className}`}
                                >
                                  Conv. {tier.label} · {conversionScore}
                                </span>
                              </div>
                            );
                          })()}
                          <p className="font-medium">{lead.score ?? 0}</p>
                          <button
                            type="button"
                            onClick={() =>
                              patchLead(lead.id, {
                                priority_high: !lead.priority_high,
                              })
                            }
                            className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] uppercase tracking-[0.13em] ${
                              lead.priority_high
                                ? "border-gold-primary bg-gold-primary text-soft-black"
                                : "border-pearl-grey bg-white text-soft-grey"
                            }`}
                            title="Priorità interna: non aggiunge intestazioni urgenti all’email"
                          >
                            <Star
                              className="h-3 w-3"
                              fill={lead.priority_high ? "currentColor" : "none"}
                            />
                            {lead.priority_high ? "Priorità alta" : "Priorità normale"}
                          </button>
                          <p className="text-xs text-soft-grey">
                            Email: {lead.email_sent_count ?? 0}
                          </p>
                          <p className="text-xs text-soft-grey">
                            Risposte: {lead.reply_count ?? 0}
                          </p>
                          <p className="text-xs text-soft-grey">
                            {lead.do_not_contact ? "Bloccato" : "OK"}
                          </p>
                          {lead.stop_requested_at && (
                            <p className="text-xs text-red-700">
                              STOP{" "}
                              {new Date(
                                lead.stop_requested_at,
                              ).toLocaleDateString("it-IT")}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openOutreachPreview([lead.id])}
                            disabled={busy || previewLoading}
                            className="group inline-flex items-center gap-2 border border-gold-primary/70 bg-soft-black px-3 py-2 text-xs uppercase tracking-[0.14em] text-warm-white shadow-sm transition hover:bg-gold-primary hover:text-soft-black disabled:opacity-50"
                            title="Apri anteprima Maison e valida l’email prima dell’invio"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Anteprima
                            <span className="text-gold-primary group-hover:text-soft-black">
                              /
                            </span>
                            Invia
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              deleteLead(lead.id, lead.company_name)
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-700 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Elimina
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patchLead(lead.id, {
                                do_not_contact: !lead.do_not_contact,
                                status: lead.do_not_contact
                                  ? "qualified"
                                  : "do_not_contact",
                              })
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 border border-pearl-grey text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {lead.do_not_contact ? "Riattiva" : "Blocca"}
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="border border-gold-primary/50 bg-ivory p-5 space-y-3">
          <h3 className="font-medium">Strategia conversione</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border border-gold-primary/30 bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-soft-grey">
                Batch
              </p>
              <p className="font-display text-xl">
                {selectedConversionStats.count || 0}
              </p>
            </div>
            <div className="border border-gold-primary/30 bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-soft-grey">
                Media
              </p>
              <p className="font-display text-xl">
                {selectedConversionStats.average || 0}
              </p>
            </div>
            <div className="border border-gold-primary/30 bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-soft-grey">
                Note
              </p>
              <p className="font-display text-xl">
                {selectedConversionStats.missingNotes}
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {CONVERSION_PLAYBOOK.map((item) => (
              <li key={item} className="flex gap-2 text-xs leading-relaxed text-soft-black/75">
                <span className="mt-2 h-px w-4 flex-shrink-0 bg-gold-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {selectedConversionStats.count > RECOMMENDED_OUTREACH_BATCH_SIZE && (
            <p className="border border-amber-200 bg-white px-3 py-2 text-xs leading-relaxed text-amber-800">
              Lotto troppo ampio per outreach premium: riduci a massimo{" "}
              {RECOMMENDED_OUTREACH_BATCH_SIZE} lead prima dell’invio.
            </p>
          )}
          {selectedConversionStats.missingNotes > 0 && selectedIds.length > 0 && (
            <p className="border border-pearl-grey bg-white px-3 py-2 text-xs leading-relaxed text-soft-grey">
              Alcuni selezionati non hanno note reali: aggiungi un motivo
              specifico prima di inviare a strutture iconiche.
            </p>
          )}
        </section>

        <section className="border border-pearl-grey bg-white p-5">
          <h2 className="font-medium text-lg mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-gold-primary" />
            Campagna email
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Focus offerta
              </label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                Motivo specifico della proposta
              </label>
              {reasonPresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {reasonPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCampaignNotes(preset.note)}
                      title={preset.note}
                      className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] border transition-colors ${
                        activePresetId === preset.id
                          ? "border-soft-black bg-soft-black text-white"
                          : "border-pearl-grey text-soft-grey hover:border-soft-black hover:text-soft-black"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={campaignNotes}
                onChange={(e) => setCampaignNotes(e.target.value)}
                rows={5}
                className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black resize-y"
                placeholder="Obbligatorio per invio premium: es. struttura Lago di Como con spa e suite, hall adatta a corner Twilly, clientela internazionale e gifting VIP."
              />
              <p className="text-[11px] leading-relaxed text-soft-grey">
                L’anteprima blocca l’invio se manca un motivo reale o se il
                focus scelto non è coerente con il settore del lead.
              </p>
              {targetingGuide.length > 0 && (
                <div className="border border-pearl-grey bg-white px-3 py-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                    Deve essere mirato a
                  </p>
                  <ul className="space-y-1.5">
                    {targetingGuide.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-[11px] leading-relaxed text-soft-black/75"
                      >
                        <span className="mt-2 h-px w-4 flex-shrink-0 bg-gold-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-3 border border-gold-primary/30 bg-[#fbf8f1] p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold-primary">
                  Foto proposta
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-soft-grey">
                  L’email mostra una sola foto, quella del prodotto in evidenza.
                  Apri un prodotto per cambiarla o caricarne una nuova.
                </p>
              </div>
              {/* Una riga per prodotto, dettagli solo su quello aperto: con
                  sette prodotti e fino a cinque foto ciascuno, mostrare tutto
                  insieme rendeva la colonna lunghissima e illeggibile. */}
              <div className="divide-y divide-pearl-grey border border-pearl-grey bg-white">
                {OUTREACH_IMAGE_PRODUCTS.map((product) => {
                  const overrideUrl = productImageOverrides[product.slug];
                  const inputId = `outreach-image-${product.slug}`;
                  const gallery = getPhotoOptions(product.slug);
                  // Solo le foto realmente a catalogo: quella caricata per la
                  // sola campagna non conta, altrimenti il cestino comparirebbe
                  // su un prodotto che a catalogo ne ha una soltanto e il
                  // server rifiuterebbe l'eliminazione.
                  const catalogPhotoCount = gallery.filter(
                    (image) => !image.uploaded,
                  ).length;
                  const isPrimaryProduct =
                    product.slug === primaryOutreachProductSlug;
                  const isOpen = openPhotoSlug === product.slug;
                  const currentUrl =
                    overrideUrl ||
                    gallery.find((image) => image.isPrimary)?.url ||
                    gallery[0]?.url;

                  return (
                    <div key={product.slug}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPhotoSlug(isOpen ? null : product.slug)
                        }
                        className="flex w-full items-center gap-3 p-2.5 text-left transition hover:bg-ivory"
                      >
                        {currentUrl ? (
                          <img
                            src={currentUrl}
                            alt=""
                            className="h-11 w-11 flex-shrink-0 border border-pearl-grey object-cover"
                          />
                        ) : (
                          <span className="h-11 w-11 flex-shrink-0 border border-dashed border-pearl-grey" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {product.name}
                            </span>
                            {isPrimaryProduct && (
                              <span className="flex-shrink-0 bg-soft-black px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] text-warm-white">
                                In email
                              </span>
                            )}
                          </span>
                          <span
                            className={`mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] ${
                              uploadingProductSlug === product.slug
                                ? "text-gold-primary"
                                : uploadDoneSlug === product.slug
                                  ? "text-green-700"
                                  : "text-soft-grey"
                            }`}
                          >
                            {uploadingProductSlug === product.slug
                              ? `Caricamento ${uploadProgress[product.slug] ?? 0}%`
                              : uploadDoneSlug === product.slug
                                ? "Foto caricata"
                                : `${overrideUrl ? "Foto scelta" : "Foto di catalogo"}${
                                    gallery.length > 0
                                      ? ` · ${gallery.length}`
                                      : ""
                                  }`}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 text-soft-grey transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="space-y-3 border-t border-pearl-grey bg-ivory/40 p-3">
                          {gallery.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {gallery.map((image) => {
                                const isSelected = image.url === currentUrl;
                                // Il cestino sta fuori dal bottone di selezione:
                                // un button dentro un button non è HTML valido.
                                return (
                                  <div
                                    key={image.id}
                                    className="group relative h-14 w-14"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductImageOverrides((previous) => ({
                                          ...previous,
                                          [product.slug]: image.url,
                                        }));
                                        setPreviewConfirmed(false);
                                        setOutreachSendReceipt(null);
                                      }}
                                      title={
                                        image.uploaded
                                          ? "Foto caricata da te"
                                          : image.isPrimary
                                            ? "Principale a catalogo"
                                            : "Usa questa foto"
                                      }
                                      className={`h-full w-full overflow-hidden border transition ${
                                        isSelected
                                          ? "border-soft-black ring-1 ring-gold-primary"
                                          : "border-pearl-grey hover:border-soft-black"
                                      }`}
                                    >
                                      <img
                                        src={image.url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                      {(image.uploaded || image.isPrimary) && (
                                        <span
                                          className={`absolute inset-x-0 bottom-0 text-center text-[7px] uppercase tracking-[0.1em] text-warm-white ${
                                            image.uploaded
                                              ? "bg-gold-primary/90 text-soft-black"
                                              : "bg-soft-black/75"
                                          }`}
                                        >
                                          {image.uploaded
                                            ? "Caricata"
                                            : "Princ."}
                                        </span>
                                      )}
                                    </button>
                                    {/* La foto di catalogo si elimina solo se
                                        non è l'ultima; quella caricata per la
                                        sola campagna si può sempre eliminare,
                                        perché il catalogo resta comunque. */}
                                    {(image.uploaded || catalogPhotoCount > 1) && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPendingDeleteImageId(image.id)
                                        }
                                        title={
                                          image.uploaded
                                            ? "Elimina la foto caricata"
                                            : "Elimina questa foto dal catalogo"
                                        }
                                        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center border border-pearl-grey bg-white text-soft-grey transition hover:border-red-300 hover:text-red-700 group-hover:flex"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {pendingDeleteImageId &&
                            gallery.some(
                              (image) => image.id === pendingDeleteImageId,
                            ) &&
                            (() => {
                              // Le due eliminazioni hanno conseguenze diverse e
                              // vanno dette: una tocca il sito, l'altra no.
                              const isCampaignPhoto =
                                pendingDeleteImageId === `uploaded-${product.slug}`;
                              return (
                                <div className="space-y-2 border border-red-200 bg-red-50 p-2.5">
                                  <p className="text-[10px] leading-relaxed text-red-800">
                                    {isCampaignPhoto
                                      ? "Eliminare la foto caricata? Viene rimossa da Media e l’email torna alla foto di catalogo. Il sito non è interessato."
                                      : "Eliminare questa foto? Sparisce anche dalla scheda prodotto sul sito e non è recuperabile."}
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        deletingImageId === pendingDeleteImageId
                                      }
                                      onClick={() =>
                                        void (isCampaignPhoto
                                          ? deleteCampaignPhoto(product.slug)
                                          : deleteCatalogImage(
                                              product.slug,
                                              pendingDeleteImageId,
                                            ))
                                      }
                                      className="border border-red-300 bg-red-700 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white transition hover:bg-red-800 disabled:opacity-50"
                                    >
                                      {deletingImageId === pendingDeleteImageId
                                        ? "Elimino…"
                                        : "Elimina"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingDeleteImageId(null)
                                      }
                                      className="border border-pearl-grey bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-soft-grey transition hover:border-soft-black hover:text-soft-black"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              id={inputId}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                void uploadProductOverride(product.slug, file);
                                event.currentTarget.value = "";
                              }}
                            />
                            <label
                              htmlFor={inputId}
                              className={`inline-flex items-center justify-center border border-soft-black px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
                                uploadingProductSlug === product.slug
                                  ? "pointer-events-none opacity-60"
                                  : "cursor-pointer hover:bg-soft-black hover:text-warm-white"
                              }`}
                            >
                              {uploadingProductSlug === product.slug
                                ? "Caricamento…"
                                : "Carica foto"}
                            </label>
                            {overrideUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProductImageOverrides((previous) => {
                                    const next = { ...previous };
                                    delete next[product.slug];
                                    return next;
                                  });
                                  setPreviewConfirmed(false);
                                }}
                                className="border border-pearl-grey px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-soft-grey transition hover:border-soft-black hover:text-soft-black"
                              >
                                Torna a catalogo
                              </button>
                            )}
                          </div>

                          {uploadingProductSlug === product.slug && (
                            <div className="space-y-1">
                              <div className="h-1 w-full overflow-hidden bg-pearl-grey">
                                <div
                                  className="h-1 bg-gold-primary transition-all duration-200"
                                  style={{
                                    width: `${uploadProgress[product.slug] ?? 0}%`,
                                  }}
                                />
                              </div>
                              <p className="text-[9px] uppercase tracking-[0.14em] text-soft-grey">
                                {(uploadProgress[product.slug] ?? 0) < 100
                                  ? `Caricamento ${uploadProgress[product.slug] ?? 0}%`
                                  : "Ottimizzazione e salvataggio…"}
                              </p>
                            </div>
                          )}

                          {uploadDoneSlug === product.slug &&
                            uploadingProductSlug !== product.slug && (
                              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-green-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Foto caricata
                              </p>
                            )}

                          {uploadError[product.slug] &&
                            uploadingProductSlug !== product.slug && (
                              <div className="flex items-start gap-1.5 border border-red-200 bg-red-50 p-2 text-[10px] leading-relaxed text-red-700">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                <span className="break-words">
                                  Caricamento non riuscito:{" "}
                                  {uploadError[product.slug]}
                                </span>
                              </div>
                            )}

                          <div className="space-y-1 border-t border-pearl-grey pt-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-soft-grey">
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  productImageToSite[product.slug],
                                )}
                                onChange={(event) =>
                                  setProductImageToSite((previous) => ({
                                    ...previous,
                                    [product.slug]: event.target.checked,
                                  }))
                                }
                                className="h-3.5 w-3.5 accent-black"
                              />
                              Carica anche nel sito
                            </label>
                            {productImageToSite[product.slug] && (
                              <label className="ml-5 flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-soft-grey">
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    productImagePrimary[product.slug],
                                  )}
                                  onChange={(event) =>
                                    setProductImagePrimary((previous) => ({
                                      ...previous,
                                      [product.slug]: event.target.checked,
                                    }))
                                  }
                                  className="h-3.5 w-3.5 accent-black"
                                />
                                e come foto principale
                              </label>
                            )}
                            <p className="text-[9px] leading-relaxed text-soft-grey/80">
                              {productImageToSite[product.slug]
                                ? productImagePrimary[product.slug]
                                  ? "La nuova foto entra in scheda prodotto e diventa la principale ovunque."
                                  : "La nuova foto entra in scheda prodotto; la principale resta quella attuale."
                                : "La nuova foto resta solo in questa email, archiviata in Media."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openOutreachPreview()}
              disabled={busy || previewLoading || selectedIds.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 border border-gold-primary/70 bg-soft-black px-4 py-3 text-sm font-medium uppercase tracking-[0.14em] text-warm-white shadow-sm transition hover:bg-gold-primary hover:text-soft-black disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Anteprima Maison · {selectedIds.length} email
            </button>
            <p className="text-[11px] text-soft-grey leading-relaxed">
              L’invio viene abilitato solo dopo aver aperto l’anteprima,
              superato i controlli automatici e confermato il contenuto.
              <br />
              Per hotel 5 stelle, resort e strutture Lago di Como la mail
              presenta Tivan come Telo Lago per piscina, suite e guest
              experience, con Twilly, Darsena, Riva e Melzi destinati a hall,
              concierge, boutique, resort shop e gifting VIP. Ogni proposta offre Maison Selection,
              Co-Branded Edition o Exclusive Signature Capsule. Chi risponde
              “stop” viene bloccato automaticamente.
            </p>
          </div>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Sbocchi 360°</h3>
          <p className="text-sm text-soft-grey leading-relaxed">
            Canali prioritari per vendere SILKinCOM fuori dal solo e-commerce.
          </p>
          <ul className="space-y-2">
            {SALES_OUTLET_GUIDE.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-soft-black/80">
                <span className="mt-2 h-px w-5 bg-gold-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Selezionati</h3>
          {selectedLeads.length === 0 ? (
            <p className="text-sm text-soft-grey">Nessun lead selezionato.</p>
          ) : (
            <ul className="space-y-2">
              {selectedLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="text-sm border-b border-pearl-grey/60 pb-2 last:border-0 last:pb-0"
                >
                  <p className="font-medium">{lead.company_name}</p>
                  <p className="text-xs text-soft-grey">
                    {lead.contact_email || "email mancante"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Risposte recenti</h3>
          {replies.length === 0 ? (
            <p className="text-sm text-soft-grey">
              Nessuna risposta tracciata.
            </p>
          ) : (
            <ul className="space-y-3">
              {replies.map((reply) => (
                <li
                  key={reply.id}
                  className="border-b border-pearl-grey/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-medium truncate">
                      {reply.lead_accounts?.company_name || reply.from_email}
                    </p>
                    <span
                      className={`text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 ${reply.intent === "stop" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {reply.intent}
                    </span>
                  </div>
                  <p className="text-xs text-soft-grey truncate">
                    {reply.subject || reply.from_email}
                  </p>
                  {reply.message_excerpt && (
                    <p className="text-xs text-soft-black/70 line-clamp-2 mt-1">
                      {reply.message_excerpt}
                    </p>
                  )}
                  <p className="text-[10px] text-soft-grey mt-1">
                    {new Date(reply.received_at).toLocaleString("it-IT")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-pearl-grey bg-white p-5 space-y-3">
          <h3 className="font-medium">Stato operativo</h3>
          <div className="space-y-2 text-sm text-soft-grey leading-relaxed">
            <p>1. Scansiona siti pubblici o importa lead verificati.</p>
            <p>2. Qualifica il contatto prima dell’invio.</p>
            <p>3. Invia una proposta premium, tracciata in admin.</p>
            <p>4. Blocca sempre i contatti che chiedono stop.</p>
            <p>5. Le risposte inbound aggiornano stato, traccia e opt-out.</p>
          </div>
        </section>
      </aside>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_top,#3b3326_0%,#111_42%,#050505_100%)]/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="outreach-preview-title"
        >
          <section className="flex max-h-[95vh] w-full max-w-[1500px] flex-col overflow-hidden border border-gold-primary/50 bg-[#f8f4ec] shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <header className="relative overflow-hidden border-b border-gold-primary/30 bg-soft-black px-5 py-5 text-warm-white sm:px-7">
              <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(216,180,80,0.28),transparent_58%)] sm:block" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="hidden h-16 w-24 items-center justify-center border border-gold-primary/40 bg-warm-white px-3 sm:flex">
                    <img
                      src="/logo-official.png"
                      alt="SILKinCOM"
                      className="max-h-12 w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.32em] text-gold-primary">
                      Partnership Office · Maison proofing
                    </p>
                    <h2
                      id="outreach-preview-title"
                      className="mt-2 font-display text-3xl leading-none sm:text-4xl"
                    >
                      Anteprima proposta premium
                    </h2>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-warm-white/70">
                      Controllo visuale, coerenza settore, CTA e consenso finale
                      prima di inviare una comunicazione SILKinCOM.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !busy && setPreviewOpen(false)}
                  disabled={busy}
                  className="relative border border-warm-white/20 p-2 text-warm-white/70 transition hover:border-gold-primary hover:text-gold-primary disabled:opacity-40"
                  aria-label="Chiudi anteprima"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {previewLoading ? (
              <div className="flex min-h-[520px] items-center justify-center gap-3 text-sm text-soft-grey">
                <RefreshCw className="h-4 w-4 animate-spin text-gold-primary" />
                Generazione dell’anteprima reale in corso…
              </div>
            ) : activePreview ? (
              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="overflow-y-auto border-b border-gold-primary/20 bg-[#fbf8f1] p-5 lg:border-b-0 lg:border-r">
                  {outreachPreviews.length > 1 && (
                    <div className="mb-5 space-y-2 border border-gold-primary/25 bg-white p-4">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                        Selezione destinatario
                      </label>
                      <select
                        value={previewLeadId}
                        onChange={(event) => {
                          const nextLeadId = event.target.value;
                          setPreviewLeadId(nextLeadId);
                          setReviewedPreviewIds((previous) =>
                            previous.includes(nextLeadId)
                              ? previous
                              : [...previous, nextLeadId],
                          );
                          setPreviewConfirmed(false);
                        }}
                        className="w-full border border-pearl-grey bg-warm-white px-3 py-3 text-sm focus:border-gold-primary focus:outline-none"
                      >
                        {outreachPreviews.map((preview) => (
                          <option key={preview.leadId} value={preview.leadId}>
                            {preview.valid ? "✓" : "!"} {preview.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-4 border border-gold-primary/25 bg-white p-4 shadow-sm">
                    <div className="border-b border-pearl-grey pb-4">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-soft-grey">
                        Destinatario Maison
                      </p>
                      <p className="mt-1 font-medium">
                        {activePreview.companyName}
                      </p>
                      <p className="mt-1 break-all text-xs text-soft-grey">
                        {activePreview.recipientEmail || "Email mancante"}
                      </p>
                    </div>
                    <div className="border-b border-pearl-grey pb-4">
                      <label
                        htmlFor={`preview-recipient-${activePreview.leadId}`}
                        className="text-[9px] uppercase tracking-[0.2em] text-soft-grey"
                      >
                        Email di recapito / test
                      </label>
                      <input
                        id={`preview-recipient-${activePreview.leadId}`}
                        type="email"
                        value={activePreview.recipientEmail || ""}
                        onChange={(event) =>
                          updatePreviewRecipientEmail(
                            activePreview,
                            event.target.value,
                          )
                        }
                        placeholder="Inserisci la tua email per test recapito"
                        className={`mt-2 w-full border px-3 py-3 text-sm focus:outline-none focus:ring-1 ${
                          activePreview.recipientEmail &&
                          EMAIL_PATTERN.test(activePreview.recipientEmail)
                            ? "border-pearl-grey bg-warm-white focus:border-gold-primary focus:ring-gold-primary"
                            : "border-red-200 bg-red-50 focus:border-red-700 focus:ring-red-700"
                        }`}
                      />
                      <p className="mt-2 text-[11px] leading-relaxed text-soft-grey">
                        Puoi sostituire temporaneamente il destinatario con la tua
                        email per vedere il recapito reale prima di inviare al
                        cliente.
                      </p>
                      {activePreview.isManualRecipient && (
                        <p className="mt-2 border border-gold-primary/40 bg-ivory px-3 py-2 text-[11px] leading-relaxed text-soft-black/75">
                          Invio test/manuale: parte a{" "}
                          <strong>{activePreview.recipientEmail}</strong> e non
                          marca il lead come contattato.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-soft-grey">
                        Oggetto email
                      </p>
                      <p className="mt-1 font-display text-lg leading-snug text-soft-black">
                        {activePreview.subject}
                      </p>
                    </div>
                  </div>

                  <div className="my-5 grid grid-cols-3 border border-gold-primary/25 bg-soft-black text-center text-warm-white">
                    <div className="border-r border-warm-white/10 px-2 py-3">
                      <p className="text-lg font-medium tabular-nums">
                        {previewLeadIds.length}
                      </p>
                      <p className="text-[8px] uppercase tracking-[0.18em] text-warm-white/55">
                        Lead
                      </p>
                    </div>
                    <div className="border-r border-warm-white/10 px-2 py-3">
                      <p className="text-lg font-medium tabular-nums">
                        {reviewedPreviewIds.length}
                      </p>
                      <p className="text-[8px] uppercase tracking-[0.18em] text-warm-white/55">
                        Visti
                      </p>
                    </div>
                    <div className="px-2 py-3">
                      <p className="text-lg font-medium tabular-nums">
                        {outreachPreviews.filter((preview) => preview.valid).length}
                      </p>
                      <p className="text-[8px] uppercase tracking-[0.18em] text-warm-white/55">
                        Validi
                      </p>
                    </div>
                  </div>
                  {manualRecipientCount > 0 && (
                    <div className="mb-5 border border-gold-primary/40 bg-ivory p-4 text-xs leading-relaxed text-soft-black/75">
                      {manualRecipientCount} email verrà inviata a un recapito
                      manuale/test. Il cliente non viene marcato come contattato.
                    </div>
                  )}

                  {/* Selettore foto dentro l'anteprima: la sezione foto del
                      pannello resta coperta dal modale, quindi senza questo
                      bisognerebbe chiudere, cambiare e riaprire per vedere
                      l'effetto. */}
                  {(() => {
                    const gallery = getPhotoOptions(primaryOutreachProductSlug);
                    if (gallery.length < 2) return null;
                    const activeUrl =
                      productImageOverrides[primaryOutreachProductSlug] ||
                      gallery.find((image) => image.isPrimary)?.url ||
                      gallery[0]?.url;
                    return (
                      <div className="mb-5 space-y-2 border border-pearl-grey bg-white p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                          Foto in email · cambia al volo
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {gallery.map((image) => (
                            <button
                              key={image.id}
                              type="button"
                              disabled={previewLoading}
                              onClick={() =>
                                setProductImageOverrides((previous) => ({
                                  ...previous,
                                  [primaryOutreachProductSlug]: image.url,
                                }))
                              }
                              title={
                                image.uploaded
                                  ? "Foto caricata da te"
                                  : image.isPrimary
                                    ? "Principale a catalogo"
                                    : "Usa questa foto"
                              }
                              className={`relative h-14 w-14 overflow-hidden border transition disabled:opacity-50 ${
                                image.url === activeUrl
                                  ? "border-soft-black ring-1 ring-gold-primary"
                                  : "border-pearl-grey hover:border-soft-black"
                              }`}
                            >
                              <img
                                src={image.url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              {image.uploaded && (
                                <span className="absolute inset-x-0 bottom-0 bg-gold-primary/90 text-center text-[7px] uppercase tracking-[0.1em] text-soft-black">
                                  Caricata
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3 border border-pearl-grey bg-white p-4">
                    <div className="flex items-center justify-between gap-3 border-b border-pearl-grey pb-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                        Checklist qualità
                      </p>
                      <span className="text-[10px] tabular-nums text-gold-primary">
                        {reviewedPreviewIds.length}/{previewLeadIds.length} aperte
                      </span>
                    </div>
                    {activePreview.checks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-start gap-2 text-xs leading-relaxed"
                      >
                        {check.ok ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700" />
                        )}
                        <span className={check.ok ? "text-soft-black/75" : "text-red-700"}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => openPreviewInNewTab(activePreview)}
                    className="my-5 inline-flex w-full items-center justify-center gap-2 border border-soft-black bg-white px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] transition hover:bg-soft-black hover:text-warm-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apri preview full-screen
                  </button>

                  {allPreviewsValid && allPreviewsReviewed ? (
                    <label className="flex cursor-pointer items-start gap-3 border border-gold-primary/70 bg-[#efe1b3] p-4 text-sm leading-relaxed shadow-sm">
                      <input
                        type="checkbox"
                        checked={previewConfirmed}
                        onChange={(event) =>
                          setPreviewConfirmed(event.target.checked)
                        }
                        className="mt-1 h-4 w-4 flex-shrink-0 accent-black"
                      />
                      <span>
                        Ho verificato destinatari, oggetto, contenuto, prodotti,
                        email di recapito/test, logo, CTA e tono maison.
                        Autorizzo l’invio.
                      </span>
                    </label>
                  ) : !allPreviewsValid ? (
                    <div className="border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-700">
                      Correggi o rimuovi i contatti con errori prima di procedere.
                      Nessuna email verrà inviata.
                    </div>
                  ) : (
                    <div className="border border-gold-primary/50 bg-ivory p-4 text-xs leading-relaxed text-soft-black/75">
                      Apri ogni destinatario dal menu per verificare tutte le
                      personalizzazioni prima di autorizzare la campagna.
                    </div>
                  )}

                  {outreachSendReceipt && (
                    <div
                      className={`mt-4 border p-4 text-sm leading-relaxed ${
                        outreachSendReceipt.status === "failed"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-green-200 bg-green-50 text-green-900"
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-start gap-3">
                        {outreachSendReceipt.status === "failed" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        )}
                        <div className="min-w-0 space-y-2">
                          <p className="font-medium uppercase tracking-[0.12em]">
                            {outreachSendReceipt.mode === "test"
                              ? outreachSendReceipt.status === "failed"
                                ? "Test non inviato"
                                : "Test inviato"
                              : outreachSendReceipt.status === "failed"
                                ? "Invio non riuscito"
                                : "Invio completato"}
                          </p>
                          <p className="break-words text-xs">
                            A:{" "}
                            {outreachSendReceipt.emails.length
                              ? outreachSendReceipt.emails.join(", ")
                              : "destinatario non disponibile"}
                          </p>
                          <p className="text-xs">
                            Ora:{" "}
                            {new Date(outreachSendReceipt.sentAt).toLocaleString(
                              "it-IT",
                            )}
                          </p>
                          {outreachSendReceipt.jobIds.length > 0 && (
                            <p className="break-all text-xs">
                              Traccia job: {outreachSendReceipt.jobIds.join(", ")}
                            </p>
                          )}
                          {outreachSendReceipt.detail && (
                            <p className="text-xs">
                              {outreachSendReceipt.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => sendOutreach(previewLeadIds)}
                    disabled={
                      !previewConfirmed ||
                      !allPreviewsValid ||
                      !allPreviewsReviewed ||
                      busy
                    }
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-gold-primary px-4 py-3 text-sm font-medium text-soft-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Autorizza e invia {previewLeadIds.length} email
                    {manualRecipientCount ? ` (${manualRecipientCount} test)` : ""}
                  </button>
                </aside>

                <div className="min-h-[55vh] overflow-hidden bg-[linear-gradient(135deg,#e6dccb_0%,#f8f4ec_42%,#d5c49c_100%)] p-3 sm:p-6 lg:min-h-0">
                  <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden border border-gold-primary/40 bg-soft-black shadow-2xl">
                    <div className="flex items-center justify-between border-b border-warm-white/10 px-4 py-3 text-warm-white">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.24em] text-gold-primary">
                          SILKinCOM email preview
                        </p>
                        <p className="mt-1 max-w-2xl truncate text-xs text-warm-white/60">
                          {activePreview.subject}
                        </p>
                      </div>
                      <span className="border border-gold-primary/40 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-gold-primary">
                        {activePreview.valid ? "Ready" : "Check"}
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 bg-[#d9d0c2] p-3 sm:p-5">
                      <iframe
                        key={activePreview.leadId}
                        srcDoc={activePreview.html}
                        title={`Anteprima email per ${activePreview.companyName}`}
                        sandbox=""
                        className="h-[65vh] w-full border border-pearl-grey bg-white shadow-xl lg:h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center p-8 text-sm text-red-700">
                Nessuna anteprima disponibile per i contatti selezionati.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-pearl-grey bg-white p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-2">
        {label}
      </p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}

function LeadScanStatus({
  summary,
  progress,
}: {
  summary: ScanSummary;
  progress: number;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const statusLabel =
    summary.status === "running"
      ? "In corso"
      : summary.status === "done"
        ? "Completata"
        : "Da verificare";
  const statusClass =
    summary.status === "done"
      ? "border-emerald-200 bg-emerald-50/40"
      : summary.status === "error"
        ? "border-red-200 bg-red-50/40"
        : "border-gold-primary/50 bg-ivory";

  return (
    <section
      className={`border px-5 py-4 ${statusClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-primary">
            Avanzamento scansione · {statusLabel}
          </p>
          <h2 className="mt-1 font-display text-2xl">{summary.title}</h2>
          <p className="mt-1 text-sm text-soft-grey">
            {summary.provider ? `${summary.provider} · ` : ""}
            {summary.detail}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {summary.status === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-700" />
          ) : (
            <CheckCircle2
              className={`h-4 w-4 ${
                summary.status === "done"
                  ? "text-emerald-700"
                  : "text-gold-primary"
              }`}
            />
          )}
          <span className="font-medium tabular-nums">{safeProgress}%</span>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden bg-white/80">
        <div
          className={`h-full transition-all duration-500 ${
            summary.status === "error" ? "bg-red-500" : "bg-gold-primary"
          }`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ScanMetric
          label="Nuovi lead"
          value={summary.created}
          hint="non presenti prima"
          tone="green"
        />
        <ScanMetric
          label="Già presenti"
          value={summary.updated}
          hint="aggiornati nel batch"
        />
        <ScanMetric
          label={summary.mode === "live" ? "Risultati" : "URL"}
          value={summary.candidates || summary.requested}
          hint={summary.mode === "live" ? "dal motore" : "analizzati"}
        />
        <ScanMetric
          label="Salvati"
          value={summary.saved}
          hint="totale batch"
        />
        <ScanMetric
          label="Warning"
          value={summary.warnings}
          hint="siti non leggibili"
          tone={summary.warnings ? "amber" : "neutral"}
        />
      </div>

      {summary.mode === "live" &&
        summary.categoryBreakdown &&
        summary.categoryBreakdown.length > 0 && (
          <div className="mt-4 border border-pearl-grey/70 bg-white/70">
            <div className="border-b border-pearl-grey/70 px-4 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-soft-grey">
                Risultati per categoria
              </p>
            </div>
            <div className="grid gap-px bg-pearl-grey/70 md:grid-cols-3">
              {summary.categoryBreakdown.map((category) => (
                <div key={category.focus} className="bg-white px-4 py-3">
                  <p className="text-sm font-medium text-soft-black">
                    {category.label}
                  </p>
                  <p className="mt-1 text-xs text-soft-grey">
                    {category.candidates} trovati · {category.created} nuovi ·{" "}
                    {category.updated} aggiornati
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      <p className="mt-4 text-xs leading-relaxed text-soft-grey">
        {summary.status === "running"
          ? "Scansione attiva: al termine i lead nuovi verranno marcati in verde e quelli già presenti in oro."
          : summary.status === "done"
            ? `Ultimo batch chiuso: ${summary.created} nuovi lead e ${summary.updated} lead già presenti aggiornati. I record del batch sono portati in cima alla tabella.`
            : summary.error || "Scansione interrotta: controlla il messaggio sopra e riprova."}
      </p>
    </section>
  );
}

function ScanMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "green" | "amber";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-soft-black";

  return (
    <div className="border border-pearl-grey/70 bg-white px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-soft-grey">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="text-[11px] text-soft-grey">{hint}</p>
    </div>
  );
}

function LeadSegmentMenu({
  selectedIds,
  onToggle,
  onClear,
}: {
  selectedIds: string[];
  onToggle: (segment: LeadSegment) => void;
  onClear: () => void;
}) {
  const selectedSegments = getLeadSegments(selectedIds);
  const selectionIsFull = selectedIds.length >= MAX_LEAD_SEGMENTS_PER_SEARCH;

  return (
    <div className="border border-pearl-grey bg-warm-white/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pearl-grey px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Filter
            className="h-4 w-4 flex-shrink-0 text-gold-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">Tipologie lead</p>
            <p className="text-xs text-soft-grey">
              Seleziona fino a {MAX_LEAD_SEGMENTS_PER_SEARCH} segmenti per
              ricerca.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-soft-grey">
            {selectedIds.length}/{MAX_LEAD_SEGMENTS_PER_SEARCH}
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={selectedIds.length === 0}
            className="text-xs text-soft-grey underline-offset-4 hover:text-soft-black hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Azzera
          </button>
        </div>
      </div>

      {selectedSegments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-pearl-grey px-4 py-3">
          {selectedSegments.map((segment) => (
            <span
              key={segment.id}
              className="inline-flex min-w-0 items-center gap-2 border border-gold-primary/50 bg-white px-3 py-1.5 text-xs"
            >
              <span className="truncate">{segment.label}</span>
              <button
                type="button"
                onClick={() => onToggle(segment)}
                aria-label={`Rimuovi ${segment.label}`}
                className="flex-shrink-0 text-soft-grey hover:text-soft-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-px bg-pearl-grey lg:grid-cols-2">
        {LEAD_SEGMENT_GROUPS.map((group) => {
          const groupSelectionCount = group.segments.filter((segment) =>
            selectedIds.includes(segment.id),
          ).length;
          return (
            <details key={group.id} className="group bg-white">
              <summary className="cursor-pointer list-none px-4 py-3 hover:bg-warm-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gold-primary [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{group.label}</p>
                    <p className="truncate text-xs text-soft-grey">
                      {group.description}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs tabular-nums text-gold-primary">
                    {groupSelectionCount
                      ? `${groupSelectionCount} scelti`
                      : group.segments.length}
                  </span>
                </div>
              </summary>
              <div className="space-y-1 border-t border-pearl-grey px-3 py-3">
                {group.segments.map((segment) => {
                  const checked = selectedIds.includes(segment.id);
                  return (
                    <label
                      key={segment.id}
                      className={`flex min-h-10 cursor-pointer items-center gap-3 px-2 py-2 text-sm hover:bg-warm-white ${
                        checked
                          ? "bg-ivory text-soft-black"
                          : "text-soft-black/80"
                      } ${!checked && selectionIsFull ? "cursor-not-allowed opacity-45" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && selectionIsFull}
                        onChange={() => onToggle(segment)}
                        className="h-4 w-4 flex-shrink-0 accent-black focus-visible:ring-2 focus-visible:ring-gold-primary"
                      />
                      <span className="min-w-0 break-words">
                        {segment.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-[0.2em] text-soft-grey">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-pearl-grey px-3 py-3 bg-warm-white text-sm focus:outline-none focus:border-soft-black"
      />
    </div>
  );
}
