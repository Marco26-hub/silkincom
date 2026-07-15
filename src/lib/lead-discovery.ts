import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { APP_URL } from "./app-url";

type DiscoveryOptions = {
  query?: string;
  notes?: string;
  industry?: string;
};

type DiscoveredContact = {
  company_name: string;
  website_url: string;
  source_url: string;
  public_contact_page: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  country: string | null;
  notes: string;
  discovery_query: string | null;
  score: number;
};

type SearchLeadCandidate = {
  title: string;
  link: string;
  snippet: string;
  source: "google_cse" | "openstreetmap" | "duckduckgo";
  sourceUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  city?: string | null;
  country?: string | null;
};

export type LeadSearchProviderDiagnostic = {
  provider: "google_cse" | "openstreetmap" | "duckduckgo";
  status: "success" | "empty" | "failed" | "not_configured" | "skipped";
  message: string;
};

export type LeadSearchResult = {
  candidates: SearchLeadCandidate[];
  diagnostics: LeadSearchProviderDiagnostic[];
};

export class LeadSearchError extends Error {
  diagnostics: LeadSearchProviderDiagnostic[];

  constructor(message: string, diagnostics: LeadSearchProviderDiagnostic[]) {
    super(message);
    this.name = "LeadSearchError";
    this.diagnostics = diagnostics;
  }
}

type GeocodedLeadLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  boundingBox: [number, number, number, number] | null;
  label: string;
  countryCode: string | null;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  boundingbox?: string[];
  address?: Record<string, string | undefined>;
};

type OverpassElement = {
  type?: "node" | "way" | "relation";
  id?: number;
  tags?: Record<string, string | undefined>;
};

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

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s()./-]{6,}\d)/g;
const MAX_HTML_BYTES = 1_500_000;
const SEARCH_TIMEOUT_MS = 15_000;
const FETCH_TIMEOUT_MS = 12_000;
const OSM_SEARCH_TIMEOUT_MS = 12_000;
const OSM_USER_AGENT =
  "SILKinCOM-Lead-Discovery/1.0 (https://www.silkincom.com; admin@silkincom.com)";
const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const geocodeCache = new Map<
  string,
  { expiresAt: number; value: GeocodedLeadLocation }
>();

const OSM_SEGMENT_SELECTORS: Record<string, string[]> = {
  bed_breakfast: [
    '["tourism"="guest_house"]',
    '["guest_house"="bed_and_breakfast"]',
  ],
  relais_dimore: [
    '["tourism"~"^(hotel|guest_house)$"]["name"~"(relais|dimora|villa|palazzo|castello)",i]',
  ],
  boutique_hotel: ['["tourism"="hotel"]'],
  hotel_luxury: [
    '["tourism"="hotel"]["stars"~"^[45]$"]',
    '["tourism"="hotel"]',
  ],
  resort: ['["tourism"="resort"]', '["tourism"="hotel"]["name"~"resort",i]'],
  agriturismo_premium: [
    '["guest_house"="agritourism"]',
    '["tourism"~"^(hotel|guest_house)$"]["name"~"(agriturismo|country house|farm stay)",i]',
  ],
  ville_aparthotel: [
    '["tourism"~"^(apartment|chalet)$"]',
    '["tourism"~"^(hotel|guest_house)$"]["name"~"(villa|aparthotel|residence)",i]',
  ],
  resort_shop: [
    '["tourism"~"^(hotel|resort)$"]',
    '["shop"~"^(gift|clothes|fashion|boutique)$"]',
  ],
  spa_hotel: [
    '["tourism"="hotel"]["spa"="yes"]',
    '["tourism"="hotel"]["name"~"(spa|wellness)",i]',
    '["leisure"="spa"]',
  ],
  medical_spa: ['["leisure"="spa"]', '["name"~"(medical spa|med spa)",i]'],
  wellness_club: [
    '["leisure"~"^(spa|fitness_centre)$"]',
    '["name"~"wellness",i]',
  ],
  beach_club: ['["leisure"="beach_resort"]', '["name"~"beach club",i]'],
  yacht_club: [
    '["leisure"="marina"]',
    '["sport"="sailing"]',
    '["name"~"yacht club",i]',
  ],
  golf_club: ['["leisure"="golf_course"]', '["shop"="golf"]'],
  private_club: [
    '["club"]',
    '["name"~"(private club|members club|circolo)",i]',
  ],
  boat_rental: [
    '["amenity"="boat_rental"]',
    '["shop"="boat"]["rental"="yes"]',
    '["name"~"(boat rental|noleggio barche|rent a boat|yacht charter|boat charter|charter nautico|private boat tour|tour privato in barca)",i]',
    '["office"="company"]["name"~"(yacht|boat).{0,12}charter",i]',
  ],
  chauffeur_ncc: [
    '["name"~"(\\bNCC\\b|chauffeur|private driver|autista privato|limousine|luxury transfer|VIP transfer|transfer privato)",i]',
    '["office"="company"]["name"~"(chauffeur|NCC|private driver|limousine|VIP transfer)",i]',
    '["amenity"="taxi"]["name"~"(limousine|luxury|VIP|NCC)",i]',
  ],
  luxury_car_rental: [
    '["amenity"="car_rental"]["name"~"(luxury|prestige|supercar|exotic|premium|lusso)",i]',
    '["shop"="car_rental"]["name"~"(luxury|prestige|supercar|exotic|premium|lusso)",i]',
    '["name"~"(luxury car rental|prestige car rental|supercar rental|noleggio auto lusso)",i]',
  ],
  concept_store: [
    '["shop"~"^(boutique|clothes|fashion|gift|interior_decoration|design)$"]',
  ],
  multibrand_boutique: ['["shop"~"^(boutique|clothes|fashion)$"]'],
  department_store: ['["shop"="department_store"]'],
  fashion_showroom: [
    '["shop"~"^(boutique|clothes|fashion)$"]',
    '["name"~"(fashion showroom|showroom moda)",i]',
  ],
  museum_shop: ['["tourism"="museum"]', '["shop"~"^(books|gift)$"]'],
  design_store: ['["shop"~"^(design|gift|furniture|interior_decoration)$"]'],
  personal_shopper: [
    '["name"~"personal shopper",i]',
    '["office"="personal_service"]',
  ],
  stylist_private_client: [
    '["name"~"(fashion stylist|image consultant|style consultant)",i]',
    '["craft"~"^(dressmaker|tailor)$"]',
  ],
  wedding_planner: [
    '["office"="event_management"]',
    '["shop"="wedding"]',
    '["name"~"wedding",i]',
  ],
  event_venue: ['["amenity"="events_venue"]'],
  event_agency: [
    '["office"="event_management"]',
    '["name"~"(eventi|events|event agency)",i]',
  ],
  corporate_gifting: [
    '["shop"="gift"]',
    '["name"~"(corporate gift|regali aziendali|promotional)",i]',
  ],
  executive_gifting: [
    '["shop"="gift"]',
    '["name"~"(executive gift|business gift|regali aziendali)",i]',
  ],
  luxury_gift_shop: ['["shop"="gift"]'],
  hospitality_amenities: [
    '["tourism"~"^(hotel|resort)$"]',
    '["name"~"(hotel amenities|hospitality supply)",i]',
  ],
  luxury_travel: ['["shop"="travel_agency"]', '["office"="travel_agent"]'],
  dmc: [
    '["office"="travel_agent"]',
    '["name"~"(destination management|\\bDMC\\b|incoming)",i]',
  ],
  concierge: ['["name"~"concierge",i]'],
  tour_operator: [
    '["shop"="travel_agency"]',
    '["office"="travel_agent"]',
    '["name"~"tour operator",i]',
  ],
  interior_hospitality: [
    '["office"~"^(architect|interior_design)$"]',
    '["name"~"hospitality design",i]',
  ],
  hotel_procurement: [
    '["name"~"(hotel procurement|hospitality supply|contract furniture)",i]',
  ],
  architect_studio: ['["office"="architect"]'],
  distributor: ['["name"~"(distribut|distribution)",i]'],
  importer: ['["name"~"(import|importazione)",i]'],
  sales_agent: [
    '["office"~"^(company|sales)$"]["name"~"(agenzia|agent|rappresentanze)",i]',
  ],
  wholesale_showroom: ['["name"~"(showroom|wholesale)",i]'],
  premium_marketplace: [
    '["shop"="department_store"]',
    '["name"~"marketplace",i]',
  ],
  private_label: [
    '["office"="company"]["name"~"(textile|fashion|moda|tessile)",i]',
  ],
  corporate_supplier: [
    '["name"~"(corporate gift|business gift|promotional|regali aziendali)",i]',
  ],
};
const BLOCKED_SEARCH_HOSTS = [
  "booking.com",
  "tripadvisor.com",
  "trivago.com",
  "expedia.com",
  "hotels.com",
  "airbnb.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "pinterest.com",
  "duckduckgo.com",
  "google.com",
  "bing.com",
  "slh.com",
  "myboutiquehotel.com",
  "bedandbreakfast.guide",
  "vogue.com",
  "modernluxury.com",
  "forbes.com",
  "cntraveler.com",
];
const CONTACT_KEYWORDS = [
  "contact",
  "contacts",
  "contact-us",
  "contatti",
  "contatto",
  "about",
  "chi-siamo",
  "impressum",
  "info",
  "booking",
  "prenotazioni",
  "reservation",
  "reservations",
  "sales",
  "commercial",
  "partnership",
];

export function normalizeLeadUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
  ).trim();
}

function isPrivateIpAddress(address: string): boolean {
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  if (
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    address.startsWith("fe80:")
  )
    return true;

  const ipv4 = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (isIP(ipv4) !== 4) return false;
  const parts = ipv4.split(".").map(Number);
  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224
  );
}

async function assertPublicUrl(value: string): Promise<void> {
  const parsed = new URL(value);
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("URL non pubblico");
  }

  if (isIP(hostname)) {
    if (isPrivateIpAddress(hostname))
      throw new Error("Indirizzo privato non consentito");
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateIpAddress(address))
  ) {
    throw new Error("Host non pubblico");
  }
}

function toOrigin(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

function absoluteUrl(baseUrl: string, href: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

function extractEmails(html: string): string[] {
  const emails = new Set<string>();
  const mailtoMatches = [...html.matchAll(/mailto:([^"'?\s>]+)/gi)];
  for (const match of mailtoMatches) {
    const email = decodeURIComponent(match[1]).replace(/\?.*$/, "").trim();
    if (EMAIL_RE.test(email)) emails.add(email.toLowerCase());
    EMAIL_RE.lastIndex = 0;
  }
  const readableHtml = html
    .replace(/\s*(?:\[|\(|\{)\s*at\s*(?:\]|\)|\})\s*/gi, "@")
    .replace(/\s*(?:\[|\(|\{)\s*dot\s*(?:\]|\)|\})\s*/gi, ".");
  const directMatches = readableHtml.match(EMAIL_RE) || [];
  for (const email of directMatches) {
    const normalized = email.toLowerCase().replace(/[.,;:]+$/, "");
    if (!/\.(?:avif|css|gif|jpe?g|js|png|svg|webp)$/i.test(normalized))
      emails.add(normalized);
  }
  return [...emails];
}

function extractPhones(html: string): string[] {
  const phones = new Set<string>();
  for (const match of html.matchAll(/tel:([^"'?\s>]+)/gi)) {
    const phone = decodeURIComponent(match[1]).replace(/\s+/g, " ").trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) phones.add(phone);
  }

  const visibleText = decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
  for (const match of visibleText.matchAll(PHONE_RE)) {
    const phone = match[0].replace(/\s+/g, " ").trim();
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) phones.add(phone);
  }
  return [...phones];
}

function extractCandidateLinks(html: string, baseUrl: string): string[] {
  const origin = toOrigin(baseUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const href = match[1];
    const label = match[2].replace(/<[^>]+>/g, " ").toLowerCase();
    const candidate = absoluteUrl(baseUrl, href);
    if (!candidate) continue;
    if (new URL(candidate).origin !== origin) continue;
    if (
      CONTACT_KEYWORDS.some(
        (keyword) =>
          href.toLowerCase().includes(keyword) || label.includes(keyword),
      )
    ) {
      links.add(candidate);
    }
  }
  return [...links].slice(0, 4);
}

async function readLimitedText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let result = "";

  while (received < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    result += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return result + decoder.decode();
}

async function fetchHtml(
  url: string,
  strict = false,
): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const fail = (message: string): null => {
    if (strict) throw new Error(message);
    return null;
  };
  try {
    let currentUrl = url;
    for (let redirectCount = 0; redirectCount <= 4; redirectCount += 1) {
      await assertPublicUrl(currentUrl);
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; SILKinCOM-Lead-Discovery/1.0; +https://www.silkincom.com)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "it-IT,it;q=0.9,en;q=0.8",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return fail(`Redirect ${response.status} senza destinazione`);
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) return fail(`Risposta HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      )
        return fail(`Contenuto non HTML (${contentType || "tipo sconosciuto"})`);
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_HTML_BYTES * 2)
        return fail("Pagina troppo grande per la scansione sicura");
      return { html: await readLimitedText(response), finalUrl: currentUrl };
    }
    return fail("Troppi redirect consecutivi");
  } catch (error) {
    if (strict) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Timeout dopo ${FETCH_TIMEOUT_MS / 1000} secondi`);
      }
      throw new Error(
        error instanceof Error ? error.message : "Errore di rete sconosciuto",
      );
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreLead(params: {
  emails: string[];
  phones: string[];
  hasContactPage: boolean;
  title: string | null;
  industry?: string;
}) {
  let score = 10;
  if (params.emails.length > 0) score += 45;
  if (params.phones.length > 0) score += 10;
  if (params.hasContactPage) score += 15;
  if (params.title) score += 5;
  if (params.industry === "hospitality") score += 5;
  return Math.min(100, score);
}

export async function discoverLeadFromWebsite(
  url: string,
  options: DiscoveryOptions = {},
): Promise<DiscoveredContact> {
  const normalizedUrl = normalizeLeadUrl(url);
  if (!normalizedUrl) {
    throw new Error(`URL non valido: ${url}`);
  }

  const homepageResult = await fetchHtml(normalizedUrl, true);
  if (!homepageResult) {
    throw new Error(`Impossibile leggere il sito: ${normalizedUrl}`);
  }

  const homepage = homepageResult.html;
  const canonicalUrl = homepageResult.finalUrl;

  const linkedCandidatePages = extractCandidateLinks(homepage, canonicalUrl);
  const origin = toOrigin(canonicalUrl);
  const candidatePages =
    linkedCandidatePages.length > 0
      ? linkedCandidatePages
      : [`${origin}/contatti`, `${origin}/contact`];
  const pages = [canonicalUrl, ...candidatePages].slice(0, 4);
  const visited = new Set<string>();
  const allEmails = new Set<string>();
  const allPhones = new Set<string>();
  let contactPage: string | null = linkedCandidatePages[0] || null;
  let title: string | null = extractMatch(
    homepage,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  );
  let siteName: string | null = extractMatch(
    homepage,
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
  );
  let city: string | null = extractMatch(
    homepage,
    /<meta[^>]+name=["']geo\.locality["'][^>]+content=["']([^"']+)["']/i,
  );
  let country: string | null = extractMatch(
    homepage,
    /<meta[^>]+name=["']geo\.country["'][^>]+content=["']([^"']+)["']/i,
  );

  const pageResults = await Promise.all(
    pages.map(async (page) => ({
      page,
      result: page === canonicalUrl ? homepageResult : await fetchHtml(page),
    })),
  );

  for (const { page, result } of pageResults) {
    if (visited.has(page) || !result) continue;
    visited.add(page);
    const html = result.html;
    const emails = extractEmails(html);
    const phones = extractPhones(html);
    emails.forEach((email) => allEmails.add(email));
    phones.forEach((phone) => allPhones.add(phone));
    if (!title) {
      title = extractMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    }
    if (!siteName) {
      siteName = extractMatch(
        html,
        /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      );
    }
    if (!contactPage) {
      const candidates = extractCandidateLinks(html, canonicalUrl);
      contactPage = candidates[0] || null;
    }
    if (!city) {
      city = extractMatch(
        html,
        /["']addressLocality["']\s*:\s*["']([^"']+)["']/i,
      );
    }
    if (!country) {
      country = extractMatch(
        html,
        /["']addressCountry["']\s*:\s*["']([^"']+)["']/i,
      );
    }
  }

  const cleanTitle = title
    ? stripHtml(title)
        .replace(/\s*[|–—-]\s*.*$/, "")
        .trim() || null
    : null;
  const companyName = siteName
    ? stripHtml(siteName)
    : cleanTitle || new URL(canonicalUrl).hostname.replace(/^www\./, "");
  const emails = [...allEmails];
  const phones = [...allPhones];

  return {
    company_name: companyName,
    website_url: canonicalUrl,
    source_url: canonicalUrl,
    public_contact_page: contactPage,
    contact_email: emails[0] || null,
    contact_phone: phones[0] || null,
    city: city || null,
    country: country || null,
    notes: options.notes?.trim() || "",
    discovery_query: options.query?.trim() || null,
    score: scoreLead({
      emails,
      phones,
      hasContactPage: Boolean(contactPage),
      title: cleanTitle,
      industry: options.industry,
    }),
  };
}

function isBlockedSearchHost(link: string): boolean {
  try {
    const hostname = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
    return BLOCKED_SEARCH_HOSTS.some(
      (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`),
    );
  } catch {
    return true;
  }
}

function isEditorialSearchResult(title: string, link: string): boolean {
  const normalizedTitle = title.toLowerCase();
  if (
    /\b(the best|i migliori|top \d+|where to stay|travel guide|hotel guide|review|reviews)\b/i.test(
      normalizedTitle,
    )
  ) {
    return true;
  }

  try {
    const path = new URL(link).pathname.toLowerCase();
    return /\/(article|articles|blog|magazine|news)\//.test(path);
  } catch {
    return true;
  }
}

function decodeDuckDuckGoLink(href: string): string | null {
  try {
    const decodedHref = decodeHtmlEntities(href);
    const parsed = new URL(
      decodedHref.startsWith("//") ? `https:${decodedHref}` : decodedHref,
    );
    const target = parsed.hostname.endsWith("duckduckgo.com")
      ? parsed.searchParams.get("uddg")
      : parsed.toString();
    return target ? normalizeLeadUrl(target) : null;
  } catch {
    return null;
  }
}

async function searchDuckDuckGo(
  liveQuery: string,
  maxResults: number,
): Promise<SearchLeadCandidate[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(liveQuery)}`,
      {
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; SILKinCOM-Lead-Search/1.0; +https://www.silkincom.com)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "it-IT,it;q=0.9,en;q=0.8",
        },
      },
    );
    if (!response.ok)
      throw new Error(`motore pubblico non disponibile (${response.status})`);
    const html = await readLimitedText(response);
    const candidates: SearchLeadCandidate[] = [];
    const seenOrigins = new Set<string>();

    for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const attributes = match[1];
      const className =
        extractMatch(attributes, /class=["']([^"']+)["']/i) || "";
      if (!className.split(/\s+/).includes("result__a")) continue;
      const href = extractMatch(attributes, /href=["']([^"']+)["']/i);
      if (!href) continue;
      const link = decodeDuckDuckGoLink(href);
      if (!link || isBlockedSearchHost(link)) continue;
      const title = stripHtml(match[2]);
      if (isEditorialSearchResult(title, link)) continue;
      const parsedLink = new URL(link);
      const originKey = `${parsedLink.protocol}//${parsedLink.hostname.replace(/^www\./, "")}`;
      if (seenOrigins.has(originKey)) continue;
      seenOrigins.add(originKey);
      candidates.push({
        title: title || new URL(link).hostname.replace(/^www\./, ""),
        link,
        snippet: "",
        source: "duckduckgo",
      });
      if (candidates.length >= maxResults) break;
    }

    return candidates;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchGoogleCustomSearch(
  liveQuery: string,
  maxResults: number,
  apiKey: string,
  searchEngineId: string,
): Promise<SearchLeadCandidate[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", searchEngineId);
  url.searchParams.set("q", liveQuery);
  url.searchParams.set("num", String(Math.min(maxResults, 10)));
  url.searchParams.set("safe", "active");

  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!response.ok)
    throw new Error(
      `Google Custom Search non disponibile (${response.status})`,
    );

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items
    .map((item: any) => ({
      title: String(item.title || "").trim(),
      link: String(item.link || "").trim(),
      snippet: String(item.snippet || "").trim(),
      source: "google_cse" as const,
    }))
    .filter(
      (item: SearchLeadCandidate) =>
        Boolean(normalizeLeadUrl(item.link)) &&
        !isBlockedSearchHost(item.link) &&
        !isEditorialSearchResult(item.title, item.link),
    );
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeLeadLocation(
  location: string,
): Promise<GeocodedLeadLocation | null> {
  const cacheKey = location.trim().toLocaleLowerCase("it");
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const baseUrl = (
    process.env.NOMINATIM_API_URL || DEFAULT_NOMINATIM_URL
  ).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", location.trim());

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(OSM_SEARCH_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      "accept-language": "it-IT,it;q=0.9,en;q=0.8",
      referer: "https://www.silkincom.com/admin/lead-b2b",
      "user-agent": OSM_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Geocodifica non disponibile (${response.status})`);
  }

  const payload = (await response.json()) as NominatimResult[];
  const result = payload[0];
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
  if (!result || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const boundingBox = result.boundingbox?.map(Number) || [];
  const [south, north, west, east] = boundingBox;
  const corners = [
    [south, west],
    [south, east],
    [north, west],
    [north, east],
  ].filter(([cornerLatitude, cornerLongitude]) =>
    [cornerLatitude, cornerLongitude].every(Number.isFinite),
  );
  const boundingRadius = corners.reduce(
    (largest, [cornerLatitude, cornerLongitude]) =>
      Math.max(
        largest,
        distanceMeters(latitude, longitude, cornerLatitude, cornerLongitude),
      ),
    0,
  );
  const localBoundingBox =
    corners.length === 4 && boundingRadius <= 40_000
      ? ([
          south - Math.max(0.02, (0.1 - (north - south)) / 2),
          west - Math.max(0.025, (0.14 - (east - west)) / 2),
          north + Math.max(0.02, (0.1 - (north - south)) / 2),
          east + Math.max(0.025, (0.14 - (east - west)) / 2),
        ] as [number, number, number, number])
      : null;
  const value: GeocodedLeadLocation = {
    latitude,
    longitude,
    radiusMeters: Math.round(
      Math.min(30_000, Math.max(8_000, boundingRadius || 12_000)),
    ),
    boundingBox: localBoundingBox,
    label: result.display_name || location.trim(),
    countryCode: result.address?.country_code?.toUpperCase() || null,
  };

  if (geocodeCache.size >= 50) {
    const oldestKey = geocodeCache.keys().next().value;
    if (oldestKey) geocodeCache.delete(oldestKey);
  }
  geocodeCache.set(cacheKey, {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    value,
  });
  return value;
}

function inferOsmSegmentIds(query: string, industry?: string): string[] {
  const normalized = `${query} ${industry || ""}`.toLocaleLowerCase("it");
  const inferred: string[] = [];
  const add = (...ids: string[]) => inferred.push(...ids);

  if (/\b(b&b|bed.{0,4}breakfast|guest house)\b/.test(normalized))
    add("bed_breakfast");
  if (/\b(hotel|relais|resort|hospitality|ospitalit)/.test(normalized))
    add("boutique_hotel");
  if (/\b(spa|wellness)\b/.test(normalized)) add("spa_hotel");
  if (/\b(yacht|marina)\b/.test(normalized)) add("yacht_club");
  if (
    /\b(boat rental|noleggio barche|rent a boat|yacht charter|boat charter|tour.{0,12}barca)\b/.test(
      normalized,
    )
  )
    add("boat_rental");
  if (
    /\b(ncc|chauffeur|private driver|autista privato|limousine|vip transfer)\b/.test(
      normalized,
    )
  )
    add("chauffeur_ncc");
  if (/\b(luxury car rental|noleggio auto|supercar|prestige car)\b/.test(normalized))
    add("luxury_car_rental");
  if (/\bgolf\b/.test(normalized)) add("golf_club");
  if (/\b(concept store|boutique|retail|negozi)/.test(normalized))
    add("concept_store");
  if (/\b(museum|museo|bookshop)\b/.test(normalized)) add("museum_shop");
  if (/\b(wedding|eventi|events?)\b/.test(normalized))
    add("wedding_planner", "event_venue");
  if (/\b(gift|gifting|regal)/.test(normalized)) add("corporate_gifting");
  if (/\b(travel|tour operator|dmc|incoming|concierge)\b/.test(normalized))
    add("luxury_travel");
  if (/\b(architect|interior|architett)/.test(normalized))
    add("architect_studio");
  if (/\b(distribut|wholesale|import|showroom)/.test(normalized))
    add("distributor", "wholesale_showroom");

  if (inferred.length === 0) add("boutique_hotel", "bed_breakfast");
  return [...new Set(inferred)].slice(0, 6);
}

function buildOverpassQuery(params: {
  location: GeocodedLeadLocation;
  segmentIds: string[];
  maxResults: number;
}): string {
  const selectors = [
    ...new Set(
      params.segmentIds.flatMap(
        (segmentId) => OSM_SEGMENT_SELECTORS[segmentId] || [],
      ),
    ),
  ];
  const spatialFilter = params.location.boundingBox
    ? `(${params.location.boundingBox.join(",")})`
    : `(around:${params.location.radiusMeters},${params.location.latitude},${params.location.longitude})`;
  const statements = selectors.flatMap((selector) => [
    `nwr${spatialFilter}${selector}["website"];`,
    `nwr${spatialFilter}${selector}["contact:website"];`,
  ]);
  const outputLimit = Math.min(80, Math.max(30, params.maxResults * 8));
  return `[out:json][timeout:12];(${statements.join("")});out tags center ${outputLimit};`;
}

function getOverpassEndpoints(): string[] {
  return [process.env.OVERPASS_API_URL, ...DEFAULT_OVERPASS_ENDPOINTS].filter(
    (endpoint, index, endpoints): endpoint is string =>
      Boolean(endpoint) && endpoints.indexOf(endpoint) === index,
  );
}

async function fetchOverpassElements(
  query: string,
): Promise<OverpassElement[]> {
  let lastError: Error | null = null;
  for (const endpoint of getOverpassEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(OSM_SEARCH_TIMEOUT_MS),
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          referer: "https://www.silkincom.com/admin/lead-b2b",
          "user-agent": OSM_USER_AGENT,
        },
        body: new URLSearchParams({ data: query }).toString(),
      });
      if (!response.ok) {
        throw new Error(`Overpass non disponibile (${response.status})`);
      }
      const payload = (await response.json()) as {
        elements?: OverpassElement[];
      };
      if (!Array.isArray(payload.elements)) {
        throw new Error("Risposta Overpass non valida");
      }
      return payload.elements;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Errore ricerca Overpass");
    }
  }
  throw lastError || new Error("Ricerca OpenStreetMap non disponibile");
}

function firstTag(
  tags: Record<string, string | undefined>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

function normalizeOsmContactEmail(value: string | null): string | null {
  const email = value?.split(";")[0]?.trim().toLowerCase() || "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function searchOpenStreetMap(
  params: {
    query: string;
    location: string;
    industry?: string;
    segmentIds?: string[];
  },
  maxResults: number,
): Promise<SearchLeadCandidate[]> {
  const location = await geocodeLeadLocation(params.location);
  if (!location) return [];

  const selectedSegmentIds = (params.segmentIds || []).filter(
    (segmentId) => OSM_SEGMENT_SELECTORS[segmentId],
  );
  const segmentIds =
    selectedSegmentIds.length > 0
      ? selectedSegmentIds
      : inferOsmSegmentIds(params.query, params.industry);
  const query = buildOverpassQuery({ location, segmentIds, maxResults });
  const elements = await fetchOverpassElements(query);
  const ranked: Array<{ candidate: SearchLeadCandidate; score: number }> = [];
  const seenOrigins = new Set<string>();

  for (const element of elements) {
    const tags = element.tags || {};
    const rawWebsite = firstTag(tags, [
      "website",
      "contact:website",
      "operator:website",
      "url",
    ]);
    const website = normalizeLeadUrl(rawWebsite?.split(";")[0] || "");
    if (!website || isBlockedSearchHost(website)) continue;

    const parsedWebsite = new URL(website);
    const originKey = `${parsedWebsite.protocol}//${parsedWebsite.hostname.replace(/^www\./, "")}`;
    if (seenOrigins.has(originKey)) continue;
    seenOrigins.add(originKey);

    const email = normalizeOsmContactEmail(
      firstTag(tags, ["contact:email", "email"]),
    );
    const phone = firstTag(tags, ["contact:phone", "phone", "mobile"]);
    const city = firstTag(tags, [
      "addr:city",
      "addr:town",
      "addr:village",
      "addr:place",
    ]);
    const category = firstTag(tags, [
      "tourism",
      "shop",
      "leisure",
      "amenity",
      "office",
      "club",
    ]);
    const title =
      firstTag(tags, ["name", "brand", "operator"]) ||
      parsedWebsite.hostname.replace(/^www\./, "");
    const sourceUrl =
      element.type && element.id
        ? `https://www.openstreetmap.org/${element.type}/${element.id}`
        : "https://www.openstreetmap.org";
    const stars = Number(tags.stars || 0);

    ranked.push({
      candidate: {
        title,
        link: website,
        snippet: [category?.replaceAll("_", " "), city, location.label]
          .filter(Boolean)
          .join(" · "),
        source: "openstreetmap",
        sourceUrl,
        contactEmail: email,
        contactPhone: phone,
        city,
        country: firstTag(tags, ["addr:country"]) || location.countryCode,
      },
      score: (email ? 50 : 0) + (phone ? 20 : 0) + stars * 3,
    });
  }

  return ranked
    .sort((entryA, entryB) => entryB.score - entryA.score)
    .slice(0, maxResults)
    .map(({ candidate }) => candidate);
}

export async function searchLeadCandidates(params: {
  query: string;
  location?: string;
  industry?: string;
  segmentIds?: string[];
  maxResults?: number;
}): Promise<LeadSearchResult> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  const liveQuery = [params.query, params.location].filter(Boolean).join(" ");
  const maxResults = Math.min(params.maxResults || 15, 30);
  const diagnostics: LeadSearchProviderDiagnostic[] = [];

  if (apiKey && searchEngineId) {
    try {
      const googleResults = await searchGoogleCustomSearch(
        liveQuery,
        maxResults,
        apiKey,
        searchEngineId,
      );
      diagnostics.push({
        provider: "google_cse",
        status: googleResults.length > 0 ? "success" : "empty",
        message: googleResults.length > 0
          ? `${googleResults.length} risultati`
          : "nessun risultato pertinente",
      });
      if (googleResults.length > 0) {
        return { candidates: googleResults, diagnostics };
      }
    } catch (error) {
      diagnostics.push({
        provider: "google_cse",
        status: "failed",
        message: error instanceof Error ? error.message : "errore Google CSE",
      });
    }
  } else {
    diagnostics.push({
      provider: "google_cse",
      status: "not_configured",
      message: "GOOGLE_SEARCH_API_KEY o GOOGLE_CSE_ID mancanti",
    });
  }

  let openStreetMapCompleted = false;
  if (params.location?.trim()) {
    try {
      const openStreetMapResults = await searchOpenStreetMap(
        {
          query: params.query,
          location: params.location,
          industry: params.industry,
          segmentIds: params.segmentIds,
        },
        maxResults,
      );
      openStreetMapCompleted = true;
      diagnostics.push({
        provider: "openstreetmap",
        status: openStreetMapResults.length > 0 ? "success" : "empty",
        message: openStreetMapResults.length > 0
          ? `${openStreetMapResults.length} risultati`
          : "nessun risultato con sito pubblico",
      });
      if (openStreetMapResults.length > 0) {
        return { candidates: openStreetMapResults, diagnostics };
      }
    } catch (error) {
      diagnostics.push({
        provider: "openstreetmap",
        status: "failed",
        message: error instanceof Error ? error.message : "errore OpenStreetMap",
      });
    }
  } else {
    diagnostics.push({
      provider: "openstreetmap",
      status: "skipped",
      message: "zona non inserita",
    });
  }

  try {
    const fallbackResults = await searchDuckDuckGo(liveQuery, maxResults);
    diagnostics.push({
      provider: "duckduckgo",
      status: fallbackResults.length > 0 ? "success" : "empty",
      message: fallbackResults.length > 0
        ? `${fallbackResults.length} risultati`
        : "nessun risultato pertinente",
    });
    if (fallbackResults.length > 0) {
      return { candidates: fallbackResults, diagnostics };
    }
  } catch (error) {
    diagnostics.push({
      provider: "duckduckgo",
      status: "failed",
      message: error instanceof Error ? error.message : "errore motore pubblico",
    });
    if (!openStreetMapCompleted) {
      throw new LeadSearchError(
        "I servizi di ricerca sono temporaneamente occupati. Riprova tra pochi secondi.",
        diagnostics,
      );
    }
  }

  throw new LeadSearchError(
    "Nessuna azienda con sito pubblico trovata. Prova una zona più precisa o altre categorie.",
    diagnostics,
  );
}

type SectorProposal = {
  title: string;
  steps: Array<{ title: string; body: string }>;
};

type OutreachProduct = {
  name: string;
  slug: string;
  image: string;
  eyebrow: string;
  detail: string;
  specs: string;
  alt: string;
};

export type LeadOutreachProductImages = Record<string, string>;

export function isMeaningfulLeadOutreachImage(
  url: string | null | undefined,
): url is string {
  if (!url) return false;
  const normalized = url.trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes("/logo-official.");
}

export function resolveLeadOutreachImage(
  ...candidates: Array<string | null | undefined>
): string | null {
  return candidates.find((candidate) => isMeaningfulLeadOutreachImage(candidate)) || null;
}

const TWILLY_OUTREACH_PRODUCTS: readonly OutreachProduct[] = [
  {
    name: "Como Puro",
    slug: "como-puro",
    image:
      "https://static.wixstatic.com/media/b58e91_7a44b8b49e5f4d34a23630e75cb6ecb5~mv2.jpg/v1/fit/w_600,h_600,q_85/file.jpg",
    eyebrow: "Twilly · Pura seta",
    detail:
      "Logo jacquard grande ispirato alle onde del Lago di Como: identitario, elegante e versatile.",
    specs: "100% seta · 120 × 7,5 cm · Retail €75",
    alt: "Twilly Como Puro in pura seta Made in Como",
  },
  {
    name: "Como Elegante",
    slug: "como-elegante",
    image:
      "https://static.wixstatic.com/media/b58e91_6e113b7ba95f4d81854d2300b10860e8~mv2.jpg/v1/fit/w_600,h_600,q_85/file.jpg",
    eyebrow: "Twilly · Pura seta",
    detail:
      "Logo jacquard discreto e luminoso: al collo, tra i capelli, al polso o su una borsa.",
    specs: "100% seta · 120 × 7,5 cm · Retail €75",
    alt: "Twilly Como Elegante in pura seta Made in Como",
  },
  {
    name: "Como Fluido",
    slug: "como-fluido",
    image:
      "https://static.wixstatic.com/media/b58e91_9aaa42a940b94e2bb485ba65f9ee08ed~mv2.jpg/v1/fit/w_600,h_600,q_85/file.jpg",
    eyebrow: "Twilly · Pura seta",
    detail:
      "Motivo jacquard fluido, leggero e contemporaneo: pensato per styling, viaggio e gifting.",
    specs: "100% seta · 120 × 7,5 cm · Retail €75",
    alt: "Twilly Como Fluido in pura seta Made in Como",
  },
];

const TIVAN_OUTREACH_PRODUCT: OutreachProduct = {
  name: "Tivan · Telo Lago",
  slug: "tivan",
  image:
    "https://static.wixstatic.com/media/a34b56_7f5a6eb5f5ec474098fb2a72445ec974~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
  eyebrow: "Telo Lago · 100% cotone",
  detail:
    "Telo assorbente e traspirante con logo ricamato in filo blu: per piscina, spa, accesso al Lago, suite e guest gifting.",
  specs: "100% cotone · 154 × 100 cm · Retail €45",
  alt: "Tivan Telo Lago in cotone Made in Como",
};

const DARSENA_OUTREACH_PRODUCT: OutreachProduct = {
  name: "Darsena · Cappellino Lago",
  slug: "darsena-navy",
  image:
    "https://static.wixstatic.com/media/a34b56_b921b778e24c442a9a59be2c5e50ca27~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
  eyebrow: "Cappellino · 100% cotone",
  detail:
    "Cappellino unisex Made in Italy con struttura sei pannelli, visiera curva e logo Lago di Como ricamato: pensato per resort shop, club, travel kit e gifting leisure.",
  specs: "100% cotone · Taglia unica regolabile · Retail €40",
  alt: "Darsena cappellino in cotone Made in Italy con logo Lago di Como",
};

const RIVA_OUTREACH_PRODUCT: OutreachProduct = {
  name: "Riva · Camicia Resort",
  slug: "riva",
  image:
    "https://static.wixstatic.com/media/a34b56_c6824eec98ab4f7cbe4ff88b8c4594bf~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
  eyebrow: "Camicia · Lino e cotone",
  detail:
    "Camicia Made in Italy con collo alla coreana, bottoni frontali e logo ricamato: pensata per resortwear, boutique interne, travel capsule e guardaroba leisure elegante.",
  specs: "53% lino · 47% cotone · Retail €75",
  alt: "Riva camicia in lino e cotone Made in Italy con logo ricamato",
};

const MELZI_OUTREACH_PRODUCT: OutreachProduct = {
  name: "Melzi · Pantaloncino Lino",
  slug: "melzi",
  image:
    "https://static.wixstatic.com/media/a34b56_a341e8d4e66442e4bc33fcd2476368af~mv2.jpg/v1/fit/w_1200,h_1200,q_90/file.jpg",
  eyebrow: "Pantaloncino · 100% lino",
  detail:
    "Pantaloncino estivo in puro lino, fresco e traspirante: ideale per resort shop, beach club, yacht club, travel wardrobe e capsule leisure Made in Como.",
  specs: "100% lino · Retail €65",
  alt: "Melzi pantaloncino in puro lino Made in Italy per resortwear",
};

export const LEAD_OUTREACH_PRODUCT_SLUGS = [
  TIVAN_OUTREACH_PRODUCT.slug,
  DARSENA_OUTREACH_PRODUCT.slug,
  RIVA_OUTREACH_PRODUCT.slug,
  MELZI_OUTREACH_PRODUCT.slug,
  ...TWILLY_OUTREACH_PRODUCTS.map((product) => product.slug),
];

export const LEAD_OUTREACH_PRODUCT_IMAGE_ALIASES: Record<string, string[]> = {
  "darsena-navy": ["darsena"],
  "como-puro": ["twilly-como"],
  "como-elegante": ["twilly-como"],
  "como-fluido": ["twilly-como"],
};

export const LEAD_OUTREACH_FALLBACK_IMAGES: LeadOutreachProductImages = {
  [TIVAN_OUTREACH_PRODUCT.slug]: TIVAN_OUTREACH_PRODUCT.image,
  [DARSENA_OUTREACH_PRODUCT.slug]: DARSENA_OUTREACH_PRODUCT.image,
  [RIVA_OUTREACH_PRODUCT.slug]: RIVA_OUTREACH_PRODUCT.image,
  [MELZI_OUTREACH_PRODUCT.slug]: MELZI_OUTREACH_PRODUCT.image,
  ...Object.fromEntries(
    TWILLY_OUTREACH_PRODUCTS.map((product) => [product.slug, product.image]),
  ),
};

const HOSPITALITY_PRODUCT_FOCUSES = new Set<LeadOutreachFocus>([
  "hospitality",
  "bed_breakfast",
  "hotel_boutique",
  "resort_beach_club",
  "spa_wellness",
]);

const FOCUS_COMPATIBILITY: Record<LeadOutreachFocus, readonly string[]> = {
  hospitality: [
    "hospitality",
    "bed_breakfast",
    "hotel_boutique",
    "resort_beach_club",
    "spa_wellness",
  ],
  bed_breakfast: ["bed_breakfast", "hospitality"],
  hotel_boutique: ["hotel_boutique", "hospitality", "resort_beach_club"],
  resort_beach_club: ["resort_beach_club", "hotel_boutique", "hospitality"],
  spa_wellness: ["spa_wellness", "hospitality", "resort_beach_club"],
  wedding_events: ["wedding_events", "gifting"],
  corporate_gifting: ["corporate_gifting", "gifting", "wholesale"],
  concept_store: ["concept_store", "retail", "wholesale"],
  museum_bookshop: ["museum_bookshop", "concept_store", "retail"],
  yacht_golf_club: ["yacht_golf_club", "resort_beach_club", "gifting"],
  boat_charter: ["boat_charter", "yacht_golf_club", "tour_operator_luxury"],
  chauffeur_ncc: ["chauffeur_ncc", "tour_operator_luxury", "gifting"],
  luxury_car_rental: [
    "luxury_car_rental",
    "tour_operator_luxury",
    "gifting",
  ],
  personal_shopper: ["personal_shopper", "retail", "gifting"],
  interior_architect: ["interior_architect", "hospitality", "gifting"],
  tour_operator_luxury: ["tour_operator_luxury", "hospitality", "gifting"],
  retail: ["retail", "concept_store", "wholesale"],
  gifting: ["gifting", "corporate_gifting", "hospitality"],
  wholesale: ["wholesale", "retail", "concept_store"],
};

function normalizeTargetingNote(value: string | null | undefined): string {
  return (value || "")
    .split(" · ")
    .filter((part) => !/^segmenti\s*:/i.test(part.trim()))
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim();
}

export function composeLeadTargetingNotes(
  leadNotes: string | null | undefined,
  campaignNotes: string | null | undefined,
): string {
  const leadSpecificNotes = normalizeTargetingNote(leadNotes);
  const campaignSpecificNotes = normalizeTargetingNote(campaignNotes);
  return [campaignSpecificNotes, leadSpecificNotes]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" · ");
}

export function isTargetingNoteSpecific(
  value: string | null | undefined,
): boolean {
  const note = normalizeTargetingNote(value);
  return note.length >= 24 && /[a-zà-ÿ]{4,}/i.test(note);
}

export function isLeadFocusCoherent(
  leadIndustry: string | null | undefined,
  focus: LeadOutreachFocus,
): boolean {
  const normalizedIndustry = (leadIndustry || "").trim();
  if (!normalizedIndustry) return false;
  return FOCUS_COMPATIBILITY[focus].includes(normalizedIndustry);
}

const SECTOR_OUTREACH_ACTIVATIONS: Record<LeadOutreachFocus, string> = {
  hospitality: "Hall, suite, piscina, concierge e gifting",
  bed_breakfast: "Reception, camere e guest gifting",
  hotel_boutique: "Hall, suite, concierge, boutique e piscina",
  resort_beach_club: "Pool, beach, resort shop e gifting",
  spa_wellness: "Spa, pool, gift corner e membership",
  wedding_events: "Evento, welcome desk e cadeau ospiti",
  corporate_gifting: "Selezione, confezione e consegna",
  concept_store: "Assortimento, storytelling e riordino",
  museum_bookshop: "Bookshop, racconto territoriale e retail",
  yacht_golf_club: "Club shop, eventi e member gifting",
  boat_charter: "Imbarco, charter experience e guest gifting",
  chauffeur_ncc: "Accoglienza a bordo, transfer e welcome gift VIP",
  luxury_car_rental: "Consegna vettura, travel kit e client gifting",
  personal_shopper: "Private edit, styling e ordine riservato",
  interior_architect: "Material board, suite e welcome experience",
  tour_operator_luxury: "Welcome kit, concierge e itinerari privati",
  retail: "Capsule boutique, staff e riassortimento",
  gifting: "Curatela, packaging e consegna progetto",
  wholesale: "Campionario, primo ordine e riassortimento",
};

const SECTOR_OUTREACH_OBJECTIVES: Record<LeadOutreachFocus, string> = {
  hospitality: "Guest experience, retail e gifting VIP",
  bed_breakfast: "Accoglienza, Lago e gifting ospite",
  hotel_boutique: "Hall, piscina, concierge e ospiti VIP",
  resort_beach_club: "Pool experience, resort retail e gifting",
  spa_wellness: "Telo wellness, gift corner e membership",
  wedding_events: "Cadeau ospiti ed eventi su progetto",
  corporate_gifting: "Clienti, board e relazioni istituzionali",
  concept_store: "Assortimento curato e riordino selettivo",
  museum_bookshop: "Souvenir culturale ad alto valore",
  yacht_golf_club: "Club retail, premi e member gifting",
  boat_charter: "Esperienza a bordo, charter retail e ricordo del Lago",
  chauffeur_ncc: "Welcome experience e fidelizzazione passeggeri VIP",
  luxury_car_rental: "Esperienza cliente, partnership hotel e gifting premium",
  personal_shopper: "Private client, styling e gifting",
  interior_architect: "Welcome experience e forniture progetto",
  tour_operator_luxury: "Welcome gift e itinerari privati",
  retail: "Capsule boutique e sviluppo categoria",
  gifting: "Ospitalità, ricorrenze e clienti VIP",
  wholesale: "Distribuzione selettiva e riassortimento",
};

type OutreachProductStory = {
  eyebrow: string;
  title: string;
  html: string;
  text: string;
};

type PartnershipModel = {
  title: string;
  eyebrow: string;
  body: string;
};

function getOutreachProducts(
  focus: LeadOutreachFocus,
): readonly OutreachProduct[] {
  if (focus === "resort_beach_club") {
    return [
      TIVAN_OUTREACH_PRODUCT,
      DARSENA_OUTREACH_PRODUCT,
      RIVA_OUTREACH_PRODUCT,
      MELZI_OUTREACH_PRODUCT,
    ];
  }

  if (focus === "yacht_golf_club" || focus === "tour_operator_luxury") {
    return [
      DARSENA_OUTREACH_PRODUCT,
      RIVA_OUTREACH_PRODUCT,
      MELZI_OUTREACH_PRODUCT,
      TWILLY_OUTREACH_PRODUCTS[1],
    ];
  }

  if (focus === "boat_charter") {
    return [
      DARSENA_OUTREACH_PRODUCT,
      RIVA_OUTREACH_PRODUCT,
      MELZI_OUTREACH_PRODUCT,
      TWILLY_OUTREACH_PRODUCTS[1],
    ];
  }

  if (focus === "chauffeur_ncc" || focus === "luxury_car_rental") {
    return [
      TWILLY_OUTREACH_PRODUCTS[0],
      TWILLY_OUTREACH_PRODUCTS[1],
      DARSENA_OUTREACH_PRODUCT,
      RIVA_OUTREACH_PRODUCT,
    ];
  }

  if (focus === "retail" || focus === "concept_store" || focus === "gifting") {
    return [
      TWILLY_OUTREACH_PRODUCTS[0],
      TWILLY_OUTREACH_PRODUCTS[1],
      DARSENA_OUTREACH_PRODUCT,
      RIVA_OUTREACH_PRODUCT,
    ];
  }

  if (focus === "spa_wellness") {
    return [
      TIVAN_OUTREACH_PRODUCT,
      TWILLY_OUTREACH_PRODUCTS[1],
      TWILLY_OUTREACH_PRODUCTS[0],
    ];
  }

  if (HOSPITALITY_PRODUCT_FOCUSES.has(focus)) {
    return [
      TIVAN_OUTREACH_PRODUCT,
      TWILLY_OUTREACH_PRODUCTS[0],
      DARSENA_OUTREACH_PRODUCT,
      RIVA_OUTREACH_PRODUCT,
    ];
  }

  return TWILLY_OUTREACH_PRODUCTS;
}

export function getLeadOutreachProductSlugs(
  focus: LeadOutreachFocus,
): string[] {
  return getOutreachProducts(focus)
    .slice(0, 1)
    .map((product) => product.slug);
}

export function isSafeLeadOutreachLink(value: string): boolean {
  if (value.startsWith("mailto:")) {
    return /^mailto:b2b@silkincom\.com\?/i.test(value);
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["silkincom.com", "www.silkincom.com"].includes(
        url.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

function buildOutreachProductStory(
  focus: LeadOutreachFocus,
): OutreachProductStory {
  if (
    focus === "hospitality" ||
    focus === "bed_breakfast" ||
    focus === "hotel_boutique"
  ) {
    return {
      eyebrow: "Capsule hotel · Telo Lago & Twilly Como",
      title: "Dal Lago alla suite, fino alla hall.",
      html: "Il <strong>Telo Lago Tivan</strong>, in 100% cotone con logo ricamato, è pensato per piscina, spa, accesso al Lago, suite e guest gifting. I <strong>Twilly Como</strong>, in pura seta, diventano invece un oggetto di rappresentanza per hall, reception, concierge e boutique: esposti su console, teca o corner selezionato, con una presenza coerente con le strutture luxury del Lago di Como.",
      text: "Il Telo Lago Tivan, in 100% cotone con logo ricamato, è pensato per piscina, spa, accesso al Lago, suite e guest gifting. I Twilly Como, in pura seta, diventano invece un oggetto di rappresentanza per hall, reception, concierge e boutique: esposti su console, teca o corner selezionato, con una presenza coerente con le strutture luxury del Lago di Como.",
    };
  }

  if (focus === "resort_beach_club") {
    return {
      eyebrow: "Capsule resort · Tivan, Darsena, Riva & Melzi",
      title: "Dalla piscina al resort shop, un solo racconto del Lago.",
      html: "Il <strong>Telo Lago Tivan</strong> accompagna piscina, beach area, pontile e suite; il <strong>cappellino Darsena</strong> porta il logo Lago di Como in resort shop, barca, pool bar e travel kit; <strong>Riva</strong> e <strong>Melzi</strong> costruiscono una capsule resortwear in lino e cotone per boutique, yacht club e destinazioni estive.",
      text: "Il Telo Lago Tivan accompagna piscina, beach area, pontile e suite; il cappellino Darsena porta il logo Lago di Como in resort shop, barca, pool bar e travel kit; Riva e Melzi costruiscono una capsule resortwear in lino e cotone per boutique, yacht club e destinazioni estive.",
    };
  }

  if (focus === "yacht_golf_club") {
    return {
      eyebrow: "Capsule club · Darsena, Riva & Melzi",
      title: "Dal pro shop alla regata, un accessorio riconoscibile.",
      html: "Il <strong>cappellino Darsena</strong>, in cotone con logo Lago di Como ricamato, è pensato per club shop, pro shop, tornei, regate e travel kit dei soci. La <strong>camicia Riva</strong> e il <strong>pantaloncino Melzi</strong> completano una proposta leisure elegante per club, yacht e soggiorni estivi.",
      text: "Il cappellino Darsena, in cotone con logo Lago di Como ricamato, è pensato per club shop, pro shop, tornei, regate e travel kit dei soci. La camicia Riva e il pantaloncino Melzi completano una proposta leisure elegante per club, yacht e soggiorni estivi.",
    };
  }

  if (focus === "boat_charter") {
    return {
      eyebrow: "Capsule charter · Darsena, Riva, Melzi & Twilly Como",
      title: "Un’esperienza a bordo firmata sul Lago di Como.",
      html: "Il <strong>cappellino Darsena</strong> accompagna imbarco, navigazione e travel kit; la <strong>camicia Riva</strong> e il <strong>pantaloncino Melzi</strong> definiscono una proposta leisure elegante per armatori e ospiti; il <strong>Twilly Como</strong> completa welcome gift, concierge e ricordo esclusivo dell’esperienza.",
      text: "Il cappellino Darsena accompagna imbarco, navigazione e travel kit; la camicia Riva e il pantaloncino Melzi definiscono una proposta leisure elegante per armatori e ospiti; il Twilly Como completa welcome gift, concierge e ricordo esclusivo dell’esperienza.",
    };
  }

  if (focus === "chauffeur_ncc") {
    return {
      eyebrow: "Private mobility · Twilly Como & welcome gift",
      title: "Il primo gesto di accoglienza comincia a bordo.",
      html: "I <strong>Twilly Como</strong> in pura seta diventano un welcome gift leggero e distintivo per transfer riservati, hotel partner e itinerari VIP. Il <strong>cappellino Darsena</strong> e la <strong>camicia Riva</strong> estendono il progetto a travel kit, driver experience ed eventi selezionati, anche in edizione co-branded.",
      text: "I Twilly Como in pura seta diventano un welcome gift leggero e distintivo per transfer riservati, hotel partner e itinerari VIP. Il cappellino Darsena e la camicia Riva estendono il progetto a travel kit, driver experience ed eventi selezionati, anche in edizione co-branded.",
    };
  }

  if (focus === "luxury_car_rental") {
    return {
      eyebrow: "Luxury drive · Travel capsule & client gifting",
      title: "Dalla consegna della vettura alla memoria del viaggio.",
      html: "Il <strong>Twilly Como</strong> introduce un gesto di benvenuto raffinato nella consegna della vettura; il <strong>cappellino Darsena</strong> e la <strong>camicia Riva</strong> costruiscono una travel capsule dedicata a tour, hotel partner, eventi automotive e clienti premium, con possibilità di doppia firma.",
      text: "Il Twilly Como introduce un gesto di benvenuto raffinato nella consegna della vettura; il cappellino Darsena e la camicia Riva costruiscono una travel capsule dedicata a tour, hotel partner, eventi automotive e clienti premium, con possibilità di doppia firma.",
    };
  }

  if (focus === "tour_operator_luxury") {
    return {
      eyebrow: "Capsule travel · Darsena, Riva & Melzi",
      title: "Un ricordo del Lago che accompagna il viaggio.",
      html: "Il <strong>cappellino Darsena</strong> rende immediata la memoria del Lago di Como nei welcome kit estivi; <strong>Riva</strong> e <strong>Melzi</strong> estendono la proposta a una travel capsule leggera, fresca e coerente con itinerari premium, yacht day e soggiorni resort.",
      text: "Il cappellino Darsena rende immediata la memoria del Lago di Como nei welcome kit estivi; Riva e Melzi estendono la proposta a una travel capsule leggera, fresca e coerente con itinerari premium, yacht day e soggiorni resort.",
    };
  }

  if (focus === "spa_wellness") {
    return {
      eyebrow: "Capsule wellness · Telo Lago & Twilly Como",
      title: "Dal rituale wellness al gift corner.",
      html: "Il <strong>Telo Lago Tivan</strong> porta 100% cotone, assorbenza e identità negli spazi relax; i <strong>Twilly Como</strong> estendono l’esperienza nel gift corner, nelle membership e nei cadeau riservati.",
      text: "Il Telo Lago Tivan porta 100% cotone, assorbenza e identità negli spazi relax; i Twilly Como estendono l’esperienza nel gift corner, nelle membership e nei cadeau riservati.",
    };
  }

  return {
    eyebrow: "Il prodotto identitario · Twilly Como",
    title: "Il Lago di Como tradotto in un accessorio luxury di pura seta.",
    html: "Un foulard a nastro in <strong>100% seta</strong>, Made in Como, 120 × 7,5 cm, con orlo rifinito a mano e logo jacquard SILKinCOM ispirato alle onde del Lago. Un oggetto luxury riconoscibile, versatile e ad alto valore percepito, pensato per boutique, gifting, private client e collaborazioni selettive.",
    text: "Foulard a nastro in 100% seta, Made in Como, 120 × 7,5 cm, con orlo rifinito a mano e logo jacquard SILKinCOM ispirato alle onde del Lago. Un oggetto luxury riconoscibile, versatile e ad alto valore percepito, pensato per boutique, gifting, private client e collaborazioni selettive.",
  };
}

function buildPartnershipModels(
  focus: LeadOutreachFocus,
): readonly PartnershipModel[] {
  const productSelection = HOSPITALITY_PRODUCT_FOCUSES.has(focus)
    ? "Telo Lago Tivan, Darsena, Riva, Melzi e Twilly Como"
    : focus === "boat_charter"
      ? "Darsena, Riva, Melzi e Twilly Como"
      : focus === "chauffeur_ncc" || focus === "luxury_car_rental"
        ? "Twilly Como, Darsena e Riva"
        : "Twilly Como e accessori selezionati";

  return [
    {
      title: "Maison Selection",
      eyebrow: "La firma SILKinCOM",
      body: `${productSelection} nella configurazione Maison, con logo SILKinCOM, packaging e materiali di racconto pronti per boutique, gifting e clientela privata.`,
    },
    {
      title: "Co-Branded Edition",
      eyebrow: "SILKinCOM × Partner",
      body: "Una doppia firma costruita insieme: logo del partner e logo SILKinCOM possono essere integrati, previa verifica tecnica, su prodotto, etichetta, packaging o card dedicata.",
    },
    {
      title: "Exclusive Signature Capsule",
      eyebrow: "Sviluppo riservato",
      body: "Palette, dettaglio grafico, ricamo, applicazione del logo e presentazione vengono sviluppati per il partner, con possibilità di esclusiva definita per prodotto, variante, territorio, canale e durata.",
    },
  ];
}

function buildSectorProposal(focus: LeadOutreachFocus): SectorProposal {
  switch (focus) {
    case "hospitality":
      return {
        title: "Piano hotel luxury e guest experience",
        steps: [
          {
            title: "Valutazione direzione e procurement",
            body: "Presentazione sintetica per direzione, guest experience, concierge o procurement, con concept, prodotti, uso previsto e condizioni riservate.",
          },
          {
            title: "Capsule Lago per struttura",
            body: "Telo Lago Tivan per piscina, spa, suite, accesso al Lago e gift ospite; Twilly Como in pura seta per hall, concierge, boutique e vendita selettiva.",
          },
          {
            title: "Pilota controllato",
            body: "Avvio con piccola dotazione, prova espositiva in hall o boutique, raccolta feedback e successivo riassortimento su prodotti e colori più coerenti.",
          },
        ],
      };
    case "bed_breakfast":
      return {
        title: "Piano B&B, relais e dimore di charme",
        steps: [
          {
            title: "Capsule ospitalità",
            body: "Telo Lago Tivan per camere, terrazze e accesso al Lago; Twilly Como Puro ed Elegante per reception, concierge e gifting.",
          },
          {
            title: "Hall e accoglienza",
            body: "Presentazione dei Twilly su console o corner reception, con una scheda dedicata alla seta comasca e al Lago di Como.",
          },
          {
            title: "Utilizzo e gifting",
            body: "Il Telo Lago accompagna il soggiorno; il foulard può essere acquistato come ricordo oppure riservato agli ospiti speciali.",
          },
        ],
      };
    case "hotel_boutique":
      return {
        title: "Piano boutique hotel, hall e resort shop",
        steps: [
          {
            title: "Curatela hall e concierge",
            body: "Twilly Como Puro ed Elegante presentati su console, teca o corner boutique, con racconto Made in Como e accesso diretto alle schede prodotto.",
          },
          {
            title: "Telo Lago per l’ospitalità",
            body: "Tivan destinato a piscina, spa, pontile, suite o guest gifting, con una prima dotazione calibrata sui servizi della struttura.",
          },
          {
            title: "Progetto pilota e sviluppo",
            body: "Avvio selettivo, verifica dell’interesse degli ospiti e successivo riassortimento per boutique, concierge e gifting VIP.",
          },
        ],
      };
    case "resort_beach_club":
      return {
        title: "Piano resort, beach club e destinazioni leisure",
        steps: [
          {
            title: "Tivan, Darsena, Riva e Melzi",
            body: "Tivan per piscina, beach area, pontile, barca e suite; Darsena per resort shop e travel kit; Riva e Melzi per capsule resortwear in lino e cotone.",
          },
          {
            title: "Resort shop e concierge",
            body: "Una proposta completa per boutique interna: telo, cappellino, camicia, pantaloncino e Twilly, con racconto Made in Como e possibilità di co-branding su progetto.",
          },
          {
            title: "Attivazione stagionale",
            body: "Capsule iniziale per vendita e gifting, con verifica della rotazione e riassortimento dei prodotti più richiesti.",
          },
        ],
      };
    case "spa_wellness":
      return {
        title: "Piano spa e wellness premium",
        steps: [
          {
            title: "Telo Lago wellness",
            body: "Tivan in 100% cotone per piscina, area relax e suite spa, con alta assorbenza, traspirabilità e logo ricamato.",
          },
          {
            title: "Twilly nel gift corner",
            body: "Como Elegante e Puro in pura seta per membership, rituali regalo, corner retail e cadeau dedicati agli ospiti.",
          },
          {
            title: "Programma ospiti e membership",
            body: "Progetto pilota con assortimento calibrato, packaging Maison e sviluppo successivo in base alla risposta della clientela.",
          },
        ],
      };
    case "wedding_events":
      return {
        title: "Piano wedding ed eventi di fascia alta",
        steps: [
          {
            title: "Palette e quantità",
            body: "Scelta dei Twilly coerente con tema, stagione e profilo degli ospiti, definendo subito budget e timing.",
          },
          {
            title: "Presentazione dedicata",
            body: "Packaging Maison e cartolina evento per trasformare il foulard in un cadeau personale e memorabile.",
          },
          {
            title: "Campione e conferma",
            body: "Invio della proposta visiva, approvazione del campione e pianificazione della consegna prima dell’evento.",
          },
        ],
      };
    case "corporate_gifting":
      return {
        title: "Piano corporate ed executive gifting",
        steps: [
          {
            title: "Fasce di progetto",
            body: "Proposta per budget e numero destinatari, con Twilly Como come regalo distintivo per clienti e board.",
          },
          {
            title: "Scelta e messaggio",
            body: "Selezione dei modelli, packaging e biglietto dedicato al valore della relazione aziendale.",
          },
          {
            title: "Consegna coordinata",
            body: "Calendario operativo, preparazione dei lotti e consegna unica o distribuita secondo il progetto.",
          },
        ],
      };
    case "concept_store":
      return {
        title: "Piano concept store e boutique curata",
        steps: [
          {
            title: "Primo assortimento",
            body: "Capsule di Twilly Como con varianti complementari e prezzo retail chiaro, senza sovraccaricare lo spazio.",
          },
          {
            title: "Storytelling vendita",
            body: "Line sheet, schede prodotto e racconto del jacquard ispirato alle onde del Lago di Como.",
          },
          {
            title: "Rotazione e margine",
            body: "Analisi dei modelli più venduti, riordino agile ed eventuale estensione a cashmere e lino.",
          },
        ],
      };
    case "museum_bookshop":
      return {
        title: "Piano museum shop, bookshop e luoghi culturali",
        steps: [
          {
            title: "Oggetto narrativo",
            body: "Twilly Como come souvenir alto: pura seta, segno jacquard e collegamento immediato al territorio.",
          },
          {
            title: "Contenuto editoriale",
            body: "Cartolina bilingue su Como, il distretto serico e l’ispirazione delle onde del Lago.",
          },
          {
            title: "Test selettivo",
            body: "Capsule iniziale contenuta, misurazione della risposta del pubblico e successivo riassortimento.",
          },
        ],
      };
    case "yacht_golf_club":
      return {
        title: "Piano yacht club, golf club e membership privata",
        steps: [
          {
            title: "Club edit",
            body: "Darsena per club shop, pro shop, tornei e regate; Riva e Melzi per il guardaroba leisure dei soci; Twilly eleganti per boutique e gifting.",
          },
          {
            title: "Occasioni dedicate",
            body: "Premi, welcome gift, tornei, regate e serate sociali con accessori leggeri, riconoscibili e coerenti con una membership privata.",
          },
          {
            title: "Servizio continuativo",
            body: "Quantità iniziali contenute, riordini rapidi e capsule successive per eventi o stagioni.",
          },
        ],
      };
    case "boat_charter":
      return {
        title: "Piano noleggio barche e yacht charter",
        steps: [
          {
            title: "On-board selection",
            body: "Darsena per imbarco e navigazione, Riva e Melzi per una capsule leisure coordinata, Twilly Como come welcome gift o ricordo esclusivo del charter.",
          },
          {
            title: "Esperienza e doppia firma",
            body: "Integrazione nel welcome kit, nella cabina o nel servizio concierge, con possibilità di Co-Branded Edition SILKinCOM × Charter su prodotto, packaging o card.",
          },
          {
            title: "Pilota stagionale",
            body: "Prima dotazione calibrata su numero di imbarcazioni e ospiti, verifica dell’utilizzo e riordino per eventi, regate e alta stagione.",
          },
        ],
      };
    case "chauffeur_ncc":
      return {
        title: "Piano NCC, chauffeur e transfer VIP",
        steps: [
          {
            title: "Welcome gesture",
            body: "Twilly Como in pura seta come omaggio riservato per clienti VIP, honeymoon, ospiti hotel e itinerari privati sul Lago di Como.",
          },
          {
            title: "Partnership hospitality",
            body: "Capsule dedicata per hotel, concierge e DMC partner, con card personalizzata e possibilità di doppia firma per rendere riconoscibile il servizio.",
          },
          {
            title: "Attivazione controllata",
            body: "Test su una selezione di transfer ad alto valore, raccolta feedback e successiva estensione a flotte, eventi o clienti continuativi.",
          },
        ],
      };
    case "luxury_car_rental":
      return {
        title: "Piano noleggio auto luxury e prestige",
        steps: [
          {
            title: "Vehicle delivery experience",
            body: "Twilly Como come welcome gift nella consegna della vettura; Darsena e Riva come travel capsule per tour, weekend ed eventi automotive.",
          },
          {
            title: "Hotel e concierge partnership",
            body: "Proposta coordinata per clienti provenienti da hotel, ville, DMC e concierge, con packaging e messaggio dedicati all’itinerario.",
          },
          {
            title: "Edizione riservata",
            body: "Pilota su vetture o pacchetti selezionati, seguito da una Co-Branded Edition o Signature Capsule definita per stagione, territorio e clientela.",
          },
        ],
      };
    case "personal_shopper":
      return {
        title: "Piano personal shopping e private client",
        steps: [
          {
            title: "Private edit",
            body: "Selezione digitale dei Twilly più adatti per colore, styling, viaggio e occasione regalo.",
          },
          {
            title: "Presentazione cliente",
            body: "Schede essenziali con immagini, materiali, misure e modi d’uso per una consulenza immediata.",
          },
          {
            title: "Ordine riservato",
            body: "Disponibilità verificata, condizioni dedicate e riordino su richiesta per clienti ricorrenti.",
          },
        ],
      };
    case "interior_architect":
      return {
        title: "Piano hospitality design e progetti interior",
        steps: [
          {
            title: "Concept regalo",
            body: "Twilly e pashmine coordinati alla palette del progetto per suite, opening e welcome experience.",
          },
          {
            title: "Material board",
            body: "Campioni, immagini e schede tecniche per validare colore, tattilità e coerenza con lo spazio.",
          },
          {
            title: "Fornitura progetto",
            body: "Quantità, packaging e calendario di consegna definiti in base alle fasi operative della struttura.",
          },
        ],
      };
    case "tour_operator_luxury":
      return {
        title: "Piano luxury travel, DMC e concierge",
        steps: [
          {
            title: "Welcome gift",
            body: "Darsena per welcome kit estivi, itinerari sul Lago e travel gifting; Riva e Melzi per capsule viaggio; Twilly Como come ricordo elegante e facilmente trasportabile.",
          },
          {
            title: "Integrazione itinerario",
            body: "Inserimento nel welcome kit, nella suite o come proposta concierge durante l’esperienza, con packaging Maison e messaggio dedicato.",
          },
          {
            title: "Programma per partenze",
            body: "Quantità pianificate per gruppi privati e itinerari, con riordino in base al calendario viaggi.",
          },
        ],
      };
    case "retail":
      return {
        title: "Piano boutique retail",
        steps: [
          {
            title: "Capsule di ingresso",
            body: "Como Puro, Elegante e Fluido come assortimento iniziale in pura seta Made in Como.",
          },
          {
            title: "Supporto vendita",
            body: "Immagini, schede prodotto e materiali dedicati per sostenere il racconto del Lago da parte dello staff.",
          },
          {
            title: "Sviluppo categoria",
            body: "Monitoraggio sell-through, riordino dei best seller ed estensione a pashmine e sciarpe.",
          },
        ],
      };
    case "gifting":
      return {
        title: "Piano gifting e hospitality amenities",
        steps: [
          {
            title: "Scelta per budget",
            body: "Twilly Como come proposta principale, con alternative cashmere per fasce regalo superiori.",
          },
          {
            title: "Confezione",
            body: "Packaging Maison e messaggio dedicato per ospiti, clienti, partner o ricorrenze speciali.",
          },
          {
            title: "Produzione e consegna",
            body: "Conferma quantità, disponibilità e calendario prima dell’avvio operativo della commessa.",
          },
        ],
      };
    case "wholesale":
      return {
        title: "Piano wholesale e distribuzione",
        steps: [
          {
            title: "Condizioni commerciali",
            body: "Line sheet con assortimento, quantità minime, prezzo retail consigliato e condizioni riservate.",
          },
          {
            title: "Selezione mercato",
            body: "Mix Twilly calibrato sul canale, con materiali e schede disponibili per buyer e rete vendita.",
          },
          {
            title: "Campionario e riordino",
            body: "Validazione del campionario, primo ordine e processo di riassortimento concordato.",
          },
        ],
      };
    default:
      return {
        title: "Piano hospitality e collaborazione Maison",
        steps: [
          {
            title: "Capsule hospitality",
            body: "Telo Lago Tivan per piscina, spa, camere e accesso al Lago; Twilly Como in pura seta per hall, concierge e boutique.",
          },
          {
            title: "Hall e racconto del Lago",
            body: "Presentazione dei foulard su console, teca o corner concierge, con materiali dedicati al distretto tessile di Como.",
          },
          {
            title: "Pilot, gifting e riordino",
            body: "Attivazione selettiva tra utilizzo in struttura, vendita retail e gifting VIP, con verifica dei risultati e riassortimento mirato.",
          },
        ],
      };
  }
}

function buildFocusCopy(focus: LeadOutreachFocus) {
  switch (focus) {
    case "bed_breakfast":
      return {
        subject: "Capsule luxury per accoglienza e gifting ospite",
        eyebrow: "B&B charme · Luxury hospitality",
        intro:
          "Vi sottoponiamo una capsule luxury dedicata a B&B, relais e dimore di charme: il Telo Lago per accompagnare il soggiorno e i Twilly Como per reception, gifting e acquisto ospite.",
        angle:
          "Per una struttura intima, il tessile può diventare parte dell’accoglienza: utile durante il soggiorno, distintivo negli spazi comuni e memorabile come ricordo del Lago.",
        products: [
          "Telo Lago Tivan per camere, terrazze e accesso al Lago",
          "Twilly Como per reception e gifting",
          "pashmine cashmere per camere e ospiti VIP",
        ],
        cta: "Possiamo inviare un concept riservato con prodotti, quantità iniziali, presentazione in struttura e condizioni dedicate. In alternativa, possiamo fissare 15 minuti per capire quale formato è più coerente con la vostra accoglienza.",
      };
    case "hotel_boutique":
      return {
        subject: "Capsule riservata per hall, suite e guest experience",
        eyebrow: "Luxury hotel · Hall & guest experience",
        intro:
          "Vi proponiamo una capsule hospitality costruita per strutture di alta gamma: il Telo Lago Tivan per piscina, spa, suite e accesso al Lago; i Twilly Como in pura seta per hall, concierge, boutique e gifting.",
        angle:
          "Una selezione Made in Como può abitare la hall con la stessa cura riservata ad arte, design e servizio, estendendo poi il racconto del Lago alla piscina, alla suite e al momento del dono.",
        products: [
          "Telo Lago Tivan per piscina, spa e suite",
          "Twilly Como per hall, concierge e boutique",
          "Darsena, Riva e Melzi per resort shop e travel kit ospite",
        ],
        cta: "Possiamo inviare una proposta visual riservata per hall, suite o boutique interna, con selezione prodotti, condizioni e possibile sviluppo co-branded. In alternativa, possiamo fissare 15 minuti con il referente guest experience o retail.",
      };
    case "hospitality":
      return {
        subject: "Proposta riservata per guest experience e gifting VIP",
        eyebrow: "Luxury hospitality · Lago di Como",
        intro:
          "Vi proponiamo una capsule hospitality pensata per hotel, resort e strutture iconiche: il Telo Lago Tivan per piscina, spa, suite e accesso al Lago; i Twilly Como in pura seta per hall, concierge, boutique e gifting VIP.",
        angle:
          "Per una struttura luxury, il prodotto tessile non è un semplice articolo da vendere: diventa parte dell’esperienza ospite, del racconto territoriale e della memoria del soggiorno.",
        products: [
          "Telo Lago Tivan per piscina, spa, suite e accesso al Lago",
          "Twilly Como per hall, concierge, boutique e gifting VIP",
          "Darsena, Riva e Melzi per resort shop, pool e travel kit ospite",
        ],
        cta: "Possiamo inviare un concept riservato per direzione, procurement o guest experience, con selezione prodotti, ipotesi espositiva, condizioni e opzione co-branding. In alternativa, possiamo fissare un confronto di 15 minuti per capire se il progetto è coerente con la vostra struttura.",
      };
    case "resort_beach_club":
      return {
        subject:
          "Capsule luxury Made in Como per resort e club",
        eyebrow: "Resortwear · Beach club · Luxury travel",
        intro:
          "Stiamo curando collaborazioni luxury con resort, beach club e destinazioni leisure in cui il tessile accompagna l’esperienza dalla piscina al pontile, fino alla boutique e al concierge.",
        angle:
          "Tivan introduce un Telo Lago Made in Como negli spazi leisure; Darsena aggiunge un cappellino Lago elegante per pool, barca e resort shop; Riva e Melzi costruiscono la parte resortwear della capsule.",
        products: [
          "Telo Lago Tivan per piscina, beach area e barca",
          "cappellino Darsena per resort shop, pool bar e travel kit",
          "camicia Riva e pantaloncino Melzi per capsule resortwear",
        ],
        cta: "Possiamo inviare un concept stagionale riservato con assortimento, ipotesi di esposizione, condizioni e calendario di consegna. In alternativa, possiamo fissare 15 minuti per valutare vendita, gifting o co-branding.",
      };
    case "spa_wellness":
      return {
        subject: "Capsule luxury per spa, wellness e rituali premium",
        eyebrow: "Wellness gifting · Spa retail",
        intro:
          "Per spa e luoghi wellness proponiamo una capsule luxury naturale e tattile: Telo Lago Tivan negli spazi relax e Twilly Como nel gift corner e nei programmi membership.",
        angle:
          "100% cotone e pura seta costruiscono un percorso coerente tra utilizzo, benessere e gifting, mantenendo riconoscibile l’origine comasca della proposta.",
        products: [
          "Telo Lago Tivan per piscina e area relax",
          "Twilly Como per gift corner e membership",
          "pashmine cashmere per suite e ospiti VIP",
        ],
        cta: "Possiamo inviare una selezione riservata per gift corner, membership o pacchetti ospite, con minimi sostenibili e packaging Maison. In alternativa, possiamo fissare 15 minuti con spa manager o guest experience.",
      };
    case "wedding_events":
      return {
        subject:
          "Gift luxury Made in Como per wedding ed eventi",
        eyebrow: "Wedding · Event gifting",
        intro:
          "Vi proponiamo una linea di accessori luxury Made in Como per eventi, wedding, welcome gift e ospiti internazionali.",
        angle:
          "Il valore risiede nel dettaglio: materiali nobili, packaging Maison e una selezione costruita sull’identità dell’occasione.",
        products: [
          "foulard in seta come cadeau ospite",
          "pashmine per cerimonie e serate",
          "gift set corporate o wedding con nota dedicata",
        ],
        cta: "Possiamo inviare un concept riservato per evento, palette, budget, quantità e timing, con opzione packaging dedicato. In alternativa, possiamo fissare 15 minuti per valutare la prossima occasione utile.",
      };
    case "corporate_gifting":
      return {
        subject: "Corporate gifting luxury Made in Como",
        eyebrow: "Corporate gifting · Executive clients",
        intro:
          "SILKinCOM propone regali aziendali luxury per clienti importanti, board, partner e hospitality business.",
        angle:
          "Un dono tessile Made in Como ha percezione alta, uso reale e una narrazione più elegante del gadget tradizionale.",
        products: [
          "foulard seta per clienti VIP",
          "pashmine cashmere per executive gift",
          "packaging e biglietto dedicato alla vostra maison",
        ],
        cta: "Possiamo inviare una griglia riservata per budget, quantità, packaging e personalizzazione leggera. In alternativa, possiamo fissare 15 minuti con marketing, HR o direzione per definire il perimetro.",
      };
    case "concept_store":
      return {
        subject: "Capsule luxury SILKinCOM per concept store",
        eyebrow: "Concept store · Luxury curated retail",
        intro:
          "Abbiamo selezionato una proposta luxury per store curati che cercano prodotti con storia, materiali nobili e rotazione agile.",
        angle:
          "SILKinCOM unisce accessibilità selettiva e racconto di filiera comasca: seta, cashmere, Darsena, Riva e Melzi creano un corner moda, lifestyle e gifting con identità precisa.",
        products: [
          "foulard seta come accessorio identitario",
          "cappellini Darsena per capsule leisure luxury",
          "camicie Riva e pantaloncini Melzi per resortwear estivo",
        ],
        cta: "Possiamo inviare line sheet riservato, selezione consigliata per primo ordine e materiali di storytelling. In alternativa, possiamo fissare 15 minuti con buyer o store director.",
      };
    case "museum_bookshop":
      return {
        subject: "Accessori luxury Made in Como per spazi culturali",
        eyebrow: "Culture retail · Luxury museum shop",
        intro:
          "Per bookshop, fondazioni e spazi culturali proponiamo accessori tessili luxury con forte valore narrativo e gifting.",
        angle:
          "Seta e Como dialogano bene con cultura, viaggio e memoria: una proposta elegante per visitatori e clienti internazionali.",
        products: [
          "foulard in seta come souvenir alto",
          "gift set con storytelling maison",
          "capsule colore coerenti con mostre o stagioni",
        ],
        cta: "Possiamo condividere una proposta editoriale e prodotto pensata per il vostro pubblico, con capsule colore e storytelling dedicato. In alternativa, possiamo fissare 15 minuti con retail manager o curatela shop.",
      };
    case "yacht_golf_club":
      return {
        subject: "Selezione luxury SILKinCOM per club privati",
        eyebrow: "Private clubs · Yacht · Golf",
        intro:
          "Stiamo proponendo capsule tessili luxury per club privati, yacht club, golf club e luoghi dove il gifting deve restare discreto e alto.",
        angle:
          "Accessori leggeri, nobili e versatili, con Darsena come prodotto club immediato e Riva/Melzi come capsule leisure elegante per soci, regate e weekend.",
        products: [
          "cappellino Darsena per club shop, tornei e regate",
          "camicia Riva e pantaloncino Melzi per capsule club",
          "foulard seta per gifting soci e premi",
        ],
        cta: "Possiamo inviare una selezione club riservata con quantità contenute, packaging dedicato e opzione capsule soci. In alternativa, possiamo fissare 15 minuti con club manager o retail/pro shop.",
      };
    case "boat_charter":
      return {
        subject: "Capsule riservata per charter ed esperienze sul Lago",
        eyebrow: "Boat charter · Private lake experience",
        intro:
          "Vi proponiamo una capsule luxury pensata per noleggio barche, yacht charter e tour privati, dove ogni dettaglio a bordo contribuisce alla qualità percepita dell’esperienza.",
        angle:
          "Darsena, Riva e Melzi accompagnano imbarco e navigazione; il Twilly Como in pura seta trasforma il welcome gift in un ricordo autentico del Lago, con possibilità di doppia firma o capsule esclusiva.",
        products: [
          "cappellino Darsena per imbarco, navigazione e travel kit",
          "camicia Riva e pantaloncino Melzi per capsule leisure a bordo",
          "Twilly Como in pura seta per welcome gift e concierge",
        ],
        cta: "Possiamo preparare un concept riservato calibrato su flotta, numero di ospiti e livello di servizio, con opzione co-branding ed esclusiva. In alternativa, possiamo fissare 15 minuti con owner, charter manager o guest experience.",
      };
    case "chauffeur_ncc":
      return {
        subject: "Welcome experience luxury per transfer e clientela VIP",
        eyebrow: "NCC · Chauffeur · Private mobility",
        intro:
          "Vi proponiamo un progetto di accoglienza dedicato a servizi NCC, chauffeur e transfer privati che accompagnano clientela internazionale, ospiti di hotel e viaggiatori VIP.",
        angle:
          "Il Twilly Como in pura seta può diventare un gesto di benvenuto discreto e memorabile a bordo, sviluppato con packaging, card e doppia firma per valorizzare il servizio e le partnership hospitality.",
        products: [
          "Twilly Como in pura seta per welcome gift VIP",
          "cappellino Darsena per itinerari ed esperienze leisure",
          "camicia Riva per capsule travel ed eventi selezionati",
        ],
        cta: "Possiamo inviare una proposta riservata per transfer premium, hotel partner e itinerari sul Lago, con quantità pilota e opzione co-branded. In alternativa, possiamo fissare 15 minuti con owner, operations o partnership manager.",
      };
    case "luxury_car_rental":
      return {
        subject: "Travel capsule luxury per noleggio auto prestige",
        eyebrow: "Luxury car rental · Client experience",
        intro:
          "Vi proponiamo una capsule Made in Como dedicata al noleggio di auto luxury, ai tour privati e alle partnership con hotel e concierge di alto livello.",
        angle:
          "Un welcome gift curato nella consegna della vettura prolunga il valore dell’esperienza: Twilly Como per il gesto più raffinato, Darsena e Riva per una travel capsule riconoscibile e contemporanea.",
        products: [
          "Twilly Como in pura seta per vehicle delivery e gifting",
          "cappellino Darsena per tour, weekend ed eventi automotive",
          "camicia Riva per capsule viaggio e collaborazioni speciali",
        ],
        cta: "Possiamo preparare un concept riservato per clienti premium, hotel partner o pacchetti driving experience, con quantità pilota, doppia firma ed eventuale esclusiva. In alternativa, possiamo fissare 15 minuti con rental manager, marketing o concierge partnership.",
      };
    case "personal_shopper":
      return {
        subject: "Selezione luxury SILKinCOM per private client",
        eyebrow: "Personal shopping · Luxury private client",
        intro:
          "Vi proponiamo SILKinCOM come selezione luxury di accessori per clienti privati, styling, guardaroba viaggio e gifting.",
        angle:
          "Foulard, cashmere e lino si integrano con naturalezza in consulenze di stile, guardaroba viaggio e gifting per clientela privata.",
        products: [
          "foulard seta per styling e colore",
          "pashmine cashmere per guardaroba viaggio",
          "camicie lino/cotone per capsule estive",
        ],
        cta: "Possiamo preparare una selezione privata con prodotti consigliati, condizioni dedicate e disponibilità verificata. In alternativa, possiamo fissare 15 minuti per capire profilo clienti, colori e occasioni d’uso.",
      };
    case "interior_architect":
      return {
        subject:
          "Textile gifting luxury per hospitality e interior",
        eyebrow: "Interior · Luxury hospitality procurement",
        intro:
          "Per studi interior e architettura proponiamo accessori tessili luxury da integrare in progetti hospitality, suite e gift experience.",
        angle:
          "Un prodotto tessile selezionato completa il racconto dello spazio: non arredo, ma gesto finale di accoglienza.",
        products: [
          "pashmine cashmere per suite e VIP gift",
          "foulard seta per welcome experience",
          "selezioni colore coordinate al progetto",
        ],
        cta: "Possiamo condividere una proposta riservata per progetto, palette, budget e campionatura. In alternativa, possiamo fissare 15 minuti per valutare mood, struttura e timing operativo.",
      };
    case "tour_operator_luxury":
      return {
        subject: "Welcome gift luxury Made in Como per viaggiatori VIP",
        eyebrow: "Luxury travel · Concierge gifting",
        intro:
          "SILKinCOM può diventare un welcome gift luxury o una proposta concierge per viaggiatori premium in Italia e sul Lago di Como.",
        angle:
          "Un accessorio Made in Como crea memoria del viaggio e aumenta il valore percepito dell’esperienza: Darsena per il giorno, Riva e Melzi per la travel capsule, Twilly per il gesto più raffinato.",
        products: [
          "cappellino Darsena per welcome kit e itinerari estivi",
          "camicia Riva e pantaloncino Melzi per capsule viaggio",
          "foulard seta per gift concierge",
        ],
        cta: "Possiamo preparare una proposta riservata per itinerari, gruppi privati e clienti VIP, con packaging viaggio e calendario consegne. In alternativa, possiamo fissare 15 minuti con travel designer o concierge.",
      };
    case "retail":
      return {
        subject: "Selezione luxury SILKinCOM per boutique",
        eyebrow: "Boutique retail · Luxury accessories",
        intro:
          "Abbiamo selezionato una proposta luxury adatta a boutique indipendenti, spazi retail selettivi e corner di stile.",
        angle:
          "Una linea Made in Como con materiali nobili, narrazione d’origine riconoscibile e un assortimento calibrato tra seta, cashmere, Darsena, Riva e Melzi.",
        products: [
          "foulard in seta",
          "sciarpe e pashmine in cashmere",
          "Darsena, Riva e Melzi per rotazione resortwear",
        ],
        cta: "Possiamo inviare line sheet riservato, selezione consigliata per primo ordine e materiali vendita. In alternativa, possiamo fissare 15 minuti con buyer o owner per definire assortimento e margini.",
      };
    case "gifting":
      return {
        subject: "Gifting luxury e ospitalità firmati SILKinCOM",
        eyebrow: "Luxury gifting · Hospitality amenities",
        intro:
          "Sviluppiamo capsule luxury selettive per ospitalità, relazioni aziendali e clientela VIP.",
        angle:
          "Il regalo diventa memorabile quando è utile, tattile e racconta una provenienza autentica: seta per il gesto istituzionale, Darsena per progetti travel o leisure.",
        products: [
          "foulard seta per cadeau",
          "pashmine cashmere per VIP gift",
          "cappellino Darsena per capsule viaggio, eventi e club",
        ],
        cta: "Possiamo preparare una proposta riservata per budget, quantità, packaging e timing. In alternativa, possiamo fissare 15 minuti per scegliere la fascia regalo più coerente.",
      };
    case "wholesale":
      return {
        subject: "Collaborazione wholesale luxury con SILKinCOM",
        eyebrow: "Wholesale · Luxury B2B selection",
        intro:
          "Se cercate una fornitura selettiva di accessori luxury Made in Como, possiamo preparare una selezione dedicata.",
        angle:
          "La proposta è pensata per partner che richiedono un assortimento selettivo, una struttura commerciale chiara, documentazione prodotto e continuità di riassortimento.",
        products: [
          "seta come proposta identitaria",
          "cashmere come continuativo alto",
          "lino/cotone per capsule stagionali",
        ],
        cta: "Possiamo inviare condizioni wholesale riservate, line sheet e proposta campionario iniziale. In alternativa, possiamo fissare 15 minuti con buyer o distributore per valutare mercato, margini e riassortimento.",
      };
    default:
      return {
        subject: "Telo Lago e seta di Como per la vostra struttura",
        eyebrow: "Hospitality · Hall · Lake experience",
        intro:
          "Vi sottoponiamo una capsule Made in Como che unisce il Telo Lago Tivan per piscina, spa e camere ai Twilly in pura seta per hall, concierge, boutique e gifting.",
        angle:
          "L’obiettivo è integrare l’esperienza dell’ospite con una proposta tessile riconoscibile: funzionale negli spazi del soggiorno e distintiva nella hall e nei momenti di relazione.",
        products: [
          "Telo Lago Tivan per piscina, spa e camere",
          "Twilly Como per hall, boutique e gifting",
          "packaging Maison per ospiti VIP",
        ],
        cta: "Possiamo preparare una proposta riservata con prodotti, margini e selezione campioni.",
      };
  }
}

export function buildLeadOutreachDossierCopy(
  lead: {
    company_name: string;
    city?: string | null;
    country?: string | null;
    contact_name?: string | null;
    website_url: string;
  },
  focus: LeadOutreachFocus,
  notes = "",
  options: {
    productImages?: LeadOutreachProductImages;
    productImageOverrides?: LeadOutreachProductImages;
  } = {},
) {
  const focusCopy = buildFocusCopy(focus);
  const sectorProposal = buildSectorProposal(focus);
  const sectorProposalTitle = sectorProposal.title.replace(
    /^Piano\s+/,
    "Proposta per ",
  );
  const sectorObjective = SECTOR_OUTREACH_OBJECTIVES[focus];
  const sectorActivation = SECTOR_OUTREACH_ACTIVATIONS[focus];
  const usesHospitalityProducts = HOSPITALITY_PRODUCT_FOCUSES.has(focus);
  const outreachProducts = getOutreachProducts(focus).map((product) => ({
    ...product,
    image:
      resolveLeadOutreachImage(
        options.productImageOverrides?.[product.slug],
        options.productImages?.[product.slug],
        product.image,
      ) || product.image,
  }));
  const productStory = buildOutreachProductStory(focus);
  const partnershipModels = buildPartnershipModels(focus);
  const executiveProject = usesHospitalityProducts
    ? "Hospitality Signature Capsule"
    : focus === "boat_charter"
      ? "Charter Signature Capsule"
      : focus === "chauffeur_ncc"
        ? "Private Mobility Signature"
        : focus === "luxury_car_rental"
          ? "Luxury Drive Signature Capsule"
          : "Luxury Signature Capsule SILKinCOM";
  const executiveMaterial = "Seta · Cashmere · Lana · Cotone · Lino";
  const greeting = lead.contact_name
    ? `Gentile ${lead.contact_name},`
    : `Gentile Team ${lead.company_name},`;
  const location = [lead.city, lead.country].filter(Boolean).join(" - ");
  const founderName = "Marco Dibenedetto";
  const trackingParams = new URLSearchParams({
    utm_source: "b2b_outreach",
    utm_medium: "email",
    utm_campaign: focus,
  });
  const collectionUrl = `${APP_URL}/it/foulard-seta?${trackingParams.toString()}`;
  const towelCollectionParams = new URLSearchParams(trackingParams);
  towelCollectionParams.set("utm_content", "telo_lago_collection");
  const towelCollectionUrl = `${APP_URL}/it/teli-mare?${towelCollectionParams.toString()}`;
  const officialLogoUrl = `${APP_URL}/logo-official.png`;
  const productUrlFor = (slug: string) => {
    const productParams = new URLSearchParams(trackingParams);
    productParams.set("utm_content", slug.replaceAll("-", "_"));
    return `${APP_URL}/it/prodotto/${slug}?${productParams.toString()}`;
  };
  const collectionLinksHtml = usesHospitalityProducts
    ? `<a href="${escapeHtml(towelCollectionUrl)}" style="display:inline-block;background:#17130F;color:#FFFDF8;text-decoration:none;padding:13px 18px;margin:0 4px 8px 4px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;">Scopri il Telo Lago</a><a href="${escapeHtml(collectionUrl)}" style="display:inline-block;border:1px solid #17130F;color:#17130F;text-decoration:none;padding:12px 18px;margin:0 4px 8px 4px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;">Esplora i Twilly Como</a>`
    : focus === "boat_charter" ||
        focus === "chauffeur_ncc" ||
        focus === "luxury_car_rental"
      ? `<a href="${escapeHtml(productUrlFor(DARSENA_OUTREACH_PRODUCT.slug))}" style="display:inline-block;background:#17130F;color:#FFFDF8;text-decoration:none;padding:13px 18px;margin:0 4px 8px 4px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;">Scopri Darsena</a><a href="${escapeHtml(collectionUrl)}" style="display:inline-block;border:1px solid #17130F;color:#17130F;text-decoration:none;padding:12px 18px;margin:0 4px 8px 4px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;">Esplora i Twilly Como</a>`
      : `<a href="${escapeHtml(collectionUrl)}" style="display:inline-block;background:#17130F;color:#FFFDF8;text-decoration:none;padding:13px 22px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;">Esplora la collezione Twilly Como</a>`;
  const replySubject = `Richiesta concept riservato | ${lead.company_name} × SILKinCOM`;
  const replyBody = [
    `Gentile ${founderName},`,
    "",
    "abbiamo ricevuto con interesse la proposta riservata SILKinCOM.",
    `Desideriamo approfondire un progetto dedicato per ${lead.company_name},`,
    "coerente con il nostro standard di accoglienza e con il profilo dei nostri ospiti.",
    "",
    "Formula di collaborazione da valutare:",
    "",
    "[ ] Maison Selection SILKinCOM",
    "    selezione curata con logo SILKinCOM",
    "",
    "[ ] Co-Branded Edition",
    `    SILKinCOM × ${lead.company_name}`,
    "",
    "[ ] Exclusive Signature Capsule",
    "    capsule esclusiva con perimetro e condizioni dedicate",
    "",
    "Per procedere, chiediamo cortesemente di ricevere:",
    "",
    "- dossier riservato",
    "- concept preliminare",
    "- selezione prodotti consigliata",
    "- condizioni di sviluppo, minimi e tempi indicativi",
    "",
    "Siamo disponibili a fissare un confronto di 15 minuti",
    "con il referente più adatto del nostro team.",
    "",
    "Cordiali saluti,",
    "",
    "Nome e cognome",
    "Ruolo",
    lead.company_name,
    "Telefono",
  ].join("\n");
  const replyUrl = `mailto:b2b@silkincom.com?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
  const noteBlock = notes.trim()
    ? `<div style="margin:24px 0 0 0;padding:18px 20px;background:#F8F3EA;border-left:2px solid #D8B443;">
        <p style="margin:0 0 6px 0;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#A87F1E;">Perché vi contattiamo</p>
        <p style="margin:0;font-size:14px;line-height:1.75;color:#4A443C;">${escapeHtml(notes.trim())}</p>
      </div>`
    : "";
  const productsHtml = outreachProducts.map((product) => {
    const productUrl = productUrlFor(product.slug);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 12px 0;border:1px solid #E8DFD0;background:#FFFDF8;">
      <tr>
        <td class="product-image-cell" width="148" valign="top" style="width:148px;padding:12px;">
          <a href="${escapeHtml(productUrl)}" style="text-decoration:none;">
            <img class="product-image" src="${escapeHtml(product.image)}" width="136" alt="${escapeHtml(product.alt)}" style="display:block;width:136px;max-width:100%;height:auto;border:0;background:#F6F3EE;" />
          </a>
        </td>
        <td class="product-copy-cell" valign="middle" style="padding:14px 16px 14px 4px;">
          <p style="margin:0 0 5px 0;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#A87F1E;">${escapeHtml(product.eyebrow)}</p>
          <h3 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;line-height:1.2;color:#17130F;margin:0 0 7px 0;">${escapeHtml(product.name)}</h3>
          <p style="font-size:13px;line-height:1.55;color:#625B52;margin:0 0 7px 0;">${escapeHtml(product.detail)}</p>
          <p style="font-size:11px;line-height:1.5;color:#8A8278;margin:0 0 8px 0;">${escapeHtml(product.specs)}</p>
          <a href="${escapeHtml(productUrl)}" style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#A87F1E;text-decoration:none;">Vedi il prodotto →</a>
        </td>
      </tr>
    </table>`;
  }).join("");
  const proposalStepsHtml = sectorProposal.steps
    .map(
      (
        step,
        index,
      ) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 10px 0;">
        <tr>
          <td width="42" valign="top" style="width:42px;padding:0 12px 0 0;">
            <div style="width:34px;height:34px;line-height:34px;text-align:center;background:#17130F;color:#D8B443;font-family:Georgia,'Times New Roman',serif;font-size:16px;">${index + 1}</div>
          </td>
          <td valign="top" style="padding:0 0 12px 0;border-bottom:1px solid #E8DFD0;">
            <p style="font-size:13px;font-weight:600;line-height:1.5;color:#17130F;margin:0 0 3px 0;">${escapeHtml(step.title)}</p>
            <p style="font-size:13px;line-height:1.65;color:#625B52;margin:0;">${escapeHtml(step.body)}</p>
          </td>
        </tr>
      </table>`,
    )
    .join("");
  const partnershipModelsHtml = partnershipModels
    .map((model, index) => {
      const isExclusive = index === partnershipModels.length - 1;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 10px 0;border:1px solid ${isExclusive ? "#D8B443" : "#E8DFD0"};background:${isExclusive ? "#17130F" : "#FFFDF8"};">
        <tr>
          <td width="54" valign="top" style="width:54px;padding:18px 0 18px 18px;">
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1;color:${isExclusive ? "#D8B443" : "#A87F1E"};margin:0;">0${index + 1}</p>
          </td>
          <td valign="top" style="padding:17px 18px 18px 12px;">
            <p style="font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:${isExclusive ? "#D8B443" : "#A87F1E"};margin:0 0 5px 0;">${escapeHtml(model.eyebrow)}</p>
            <h3 style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:400;line-height:1.3;color:${isExclusive ? "#FFFDF8" : "#17130F"};margin:0 0 7px 0;">${escapeHtml(model.title)}</h3>
            <p style="font-size:13px;line-height:1.7;color:${isExclusive ? "#D8D1C6" : "#625B52"};margin:0;">${escapeHtml(model.body)}</p>
          </td>
        </tr>
      </table>`;
    })
    .join("");
  const extensionsHtml = focusCopy.products
    .map((product) => escapeHtml(product))
    .join(" · ");
  const subject = sanitizeEmailHeader(
    `${focusCopy.subject} | SILKinCOM × ${lead.company_name}`,
  );
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @media screen and (max-width:520px) {
      .email-content { padding:30px 20px !important; }
      .email-title { font-size:32px !important; }
      .brief-cell { display:block !important; width:100% !important; box-sizing:border-box !important; padding:12px 0 !important; border-bottom:1px solid #3B3832 !important; }
      .product-image-cell,
      .product-copy-cell { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .product-image-cell { padding:14px 14px 0 !important; text-align:center !important; }
      .product-copy-cell { padding:15px 18px 19px !important; }
      .product-image { width:100% !important; max-width:230px !important; margin:0 auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F3EEE5;font-family:Arial,Helvetica,sans-serif;color:#17130F;">
  <div style="display:none;max-height:0;overflow:hidden;color:#F3EEE5;">Un progetto riservato SILKinCOM × ${escapeHtml(lead.company_name)}, concepito sul Lago di Como.</div>
  <div style="max-width:680px;margin:0 auto;padding:28px 12px;">
    <div style="background:#11100E;color:#F8F3EA;padding:18px 22px 16px;text-align:center;">
      <a href="${APP_URL}" style="display:inline-block;text-decoration:none;" aria-label="SILKinCOM">
        <img src="${escapeHtml(officialLogoUrl)}" width="112" alt="SILKinCOM" style="display:block;width:112px;max-width:112px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />
      </a>
      <p style="margin:4px 0 0 0;font-size:8px;letter-spacing:.34em;text-transform:uppercase;color:#D8B443;">Partnership Office · Como, Italia</p>
    </div>
    <div class="email-content" style="background:#FFFDF8;border:1px solid #E5D8BE;border-top:0;padding:40px 34px;">
      <p style="font-size:14px;line-height:1.7;color:#4A443C;margin:0 0 20px 0;">${escapeHtml(greeting)}</p>
      <p style="font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:#A87F1E;margin:0 0 14px 0;">Proposta riservata · ${escapeHtml(focusCopy.eyebrow)}</p>
      <h1 class="email-title" style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:36px;line-height:1.13;letter-spacing:-.015em;margin:0 0 20px 0;color:#17130F;">Un progetto esclusivo,<br /><span style="color:#A87F1E;font-style:italic;">concepito sul Lago di Como.</span></h1>
      <p style="font-size:15px;line-height:1.8;color:#3B362F;margin:0 0 14px 0;">Sono <strong>${escapeHtml(founderName)}</strong>, Founder di SILKinCOM. Desidero sottoporre alla sua attenzione un progetto riservato, ideato per esplorare una collaborazione tra la nostra Maison e <strong>${escapeHtml(lead.company_name)}</strong>${location ? `, con riferimento a ${escapeHtml(location)}` : ""}.</p>
      <p style="font-size:15px;line-height:1.8;color:#3B362F;margin:0 0 14px 0;">${escapeHtml(focusCopy.intro)} La proposta nasce come una selezione essenziale e distintiva: prodotti scelti, materiali nobili, manifattura italiana e una presentazione sviluppata in armonia con l’identità e il livello di servizio della vostra struttura.</p>
      <p style="font-size:15px;line-height:1.8;color:#3B362F;margin:0 0 24px 0;">Il percorso può iniziare con una <strong>Maison Selection firmata SILKinCOM</strong>, evolvere in una <strong>Co-Branded Edition SILKinCOM × ${escapeHtml(lead.company_name)}</strong> oppure culminare in una <strong>Exclusive Signature Capsule</strong>, definita per prodotto, canale, territorio e durata. Se la proposta fosse di competenza di un altro ufficio, le sarei grato se volesse condividerla con il referente guest experience, procurement, concierge o retail.</p>

      <div style="background:#17130F;color:#FFFDF8;padding:22px 24px;margin:0 0 26px 0;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#D8B443;margin:0 0 14px 0;">Executive brief</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td class="brief-cell" valign="top" style="padding:0 12px 12px 0;border-bottom:1px solid #3B3832;">
              <p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#AFA79C;margin:0 0 5px 0;">Progetto</p>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.4;color:#FFFDF8;margin:0;">${escapeHtml(executiveProject)}</p>
            </td>
            <td class="brief-cell" valign="top" style="padding:0 0 12px 12px;border-bottom:1px solid #3B3832;">
              <p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#AFA79C;margin:0 0 5px 0;">Materiali</p>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.4;color:#FFFDF8;margin:0;">${escapeHtml(executiveMaterial)}</p>
            </td>
          </tr>
          <tr>
            <td class="brief-cell" valign="top" style="padding:14px 12px 0 0;">
              <p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#AFA79C;margin:0 0 5px 0;">Attivazione</p>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.4;color:#FFFDF8;margin:0;">${escapeHtml(sectorActivation)}</p>
            </td>
            <td class="brief-cell" valign="top" style="padding:14px 0 0 12px;">
              <p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#AFA79C;margin:0 0 5px 0;">Obiettivo</p>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.4;color:#FFFDF8;margin:0;">${escapeHtml(sectorObjective)}</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#F4EFE6;border:1px solid #E5D8BE;padding:22px;margin:0 0 26px 0;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 9px 0;">${escapeHtml(productStory.eyebrow)}</p>
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.4;color:#17130F;margin:0 0 10px 0;">${escapeHtml(productStory.title)}</p>
        <p style="font-size:14px;line-height:1.75;color:#5A534B;margin:0;">${productStory.html}</p>
      </div>

      <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 14px 0;">${usesHospitalityProducts ? "Selezione hospitality" : "Selezione introduttiva"}</p>
      ${productsHtml}
      <p style="text-align:center;margin:18px 0 30px 0;">${collectionLinksHtml}</p>

      <div style="background:#F4EFE6;border:1px solid #E5D8BE;padding:22px;margin:0 0 12px 0;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 9px 0;">Partnership editions</p>
        <h2 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:27px;line-height:1.25;color:#17130F;margin:0 0 10px 0;">Tre livelli di collaborazione.<br />Una sola garanzia di origine.</h2>
        <p style="font-size:13px;line-height:1.75;color:#5A534B;margin:0;">Il logo SILKinCOM tutela l’identità della Maison e la provenienza del progetto. Il partner può scegliere una selezione esistente, una doppia firma oppure uno sviluppo esclusivo.</p>
      </div>
      ${partnershipModelsHtml}

      <div style="border-left:2px solid #D8B443;padding:2px 0 2px 18px;margin:0 0 28px 0;">
        <p style="font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:#A87F1E;margin:0 0 8px 0;">Rilevanza per ${escapeHtml(lead.company_name)}</p>
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.42;color:#17130F;margin:0;">${escapeHtml(focusCopy.angle)}</p>
      </div>

      <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 13px 0;">Architettura della collaborazione</p>
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:27px;line-height:1.25;color:#17130F;margin:0 0 20px 0;">${escapeHtml(sectorProposalTitle)}</h2>
      ${proposalStepsHtml}
      <p style="font-size:12px;line-height:1.7;color:#7B7369;margin:14px 0 0 0;"><strong style="color:#4A443C;">${usesHospitalityProducts ? "Applicazioni previste" : "Estensioni possibili"}:</strong> ${extensionsHtml}.</p>
      ${noteBlock}

      <div style="background:#F4EFE6;border:1px solid #D8B443;padding:22px;margin:28px 0 0 0;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 12px 0;">Esclusiva su progetto</p>
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.4;color:#17130F;margin:0 0 12px 0;">Un valore reale, definito con precisione.</p>
        <p style="font-size:13px;line-height:1.75;color:#5A534B;margin:0;">L’esclusiva può riguardare prodotto, variante, territorio, canale e durata. Viene formalizzata solo dopo verifica di fattibilità, approvazione del campione, definizione delle quantità minime, piano produttivo e accordo commerciale. Il dossier riservato include concept, applicazione dei loghi, condizioni e calendario.</p>
      </div>

      <div style="background:#17130F;color:#FFFDF8;padding:26px 24px;margin:30px 0 26px 0;text-align:center;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#D8B443;margin:0 0 10px 0;">Invito riservato</p>
        <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;line-height:1.3;color:#FFFDF8;margin:0 0 12px 0;">Condividiamo un concept riservato, disegnato per ${escapeHtml(lead.company_name)}.</h2>
        <p style="font-size:13px;line-height:1.7;color:#DED8CE;margin:0 0 12px 0;">Un primo confronto ci permetterà di definire interlocutore, contesto d’impiego, selezione prodotto, personalizzazione, campionatura ed eventuale perimetro di esclusiva.</p>
        <p style="font-size:13px;line-height:1.7;color:#FFFDF8;margin:0 0 18px 0;">${escapeHtml(focusCopy.cta)}</p>
        <a href="${escapeHtml(replyUrl)}" style="display:inline-block;background:#D8B443;color:#17130F;text-decoration:none;padding:13px 21px;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;">Richiedi il concept riservato</a>
      </div>

      <p style="font-size:14px;line-height:1.7;color:#3B362F;margin:0;">Con stima,</p>
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.4;color:#17130F;margin:8px 0 2px 0;">${escapeHtml(founderName)}</p>
      <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#A87F1E;margin:0 0 18px 0;">Founder · SILKinCOM</p>
      <p style="font-size:12px;line-height:1.7;color:#7B7369;margin:0;">Cermenate (Como) · <a href="mailto:b2b@silkincom.com" style="color:#7B7369;">b2b@silkincom.com</a> · <a href="${APP_URL}/it/b2b" style="color:#7B7369;">Programma B2B</a></p>

      <div style="height:1px;background:#E5D8BE;margin:26px 0 17px 0;"></div>
      <p style="font-size:10px;color:#9A9388;line-height:1.65;margin:0 0 7px 0;">Questa proposta è inviata a un contatto business pubblico ritenuto pertinente. Se non desidera ricevere ulteriori comunicazioni, risponda con la parola <strong>STOP</strong>.</p>
      <p style="font-size:10px;color:#AAA297;line-height:1.65;margin:0;">SILKinCOM · P.IVA 03786790133 · Cermenate (CO) · Italia</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    html,
    text: [
      greeting,
      "",
      `SILKinCOM · ${focusCopy.eyebrow}`,
      "",
      "PROPOSTA RISERVATA DI PARTNERSHIP",
      "UN PROGETTO ESCLUSIVO, CONCEPITO SUL LAGO DI COMO",
      `Sono ${founderName}, Founder di SILKinCOM. Desidero sottoporre alla sua attenzione un progetto riservato, ideato per esplorare una collaborazione tra la nostra Maison e ${lead.company_name}${location ? `, con riferimento a ${location}` : ""}.`,
      `${focusCopy.intro} La proposta nasce come una selezione essenziale e distintiva: prodotti scelti, materiali nobili, manifattura italiana e una presentazione sviluppata in armonia con l’identità e il livello di servizio della vostra struttura.`,
      `Il percorso può iniziare con una Maison Selection firmata SILKinCOM, evolvere in una Co-Branded Edition SILKinCOM × ${lead.company_name} oppure culminare in una Exclusive Signature Capsule, definita per prodotto, canale, territorio e durata.`,
      "Se la proposta fosse di competenza di un altro ufficio, le sarei grato se volesse condividerla con il referente guest experience, procurement, concierge o retail.",
      "",
      "EXECUTIVE BRIEF",
      `Progetto: ${executiveProject}`,
      `Materiali: ${executiveMaterial}`,
      `Attivazione: ${sectorActivation}`,
      `Obiettivo: ${sectorObjective}`,
      "",
      productStory.eyebrow.toUpperCase(),
      productStory.title,
      productStory.text,
      "",
      "Prodotti da valutare:",
      ...outreachProducts.flatMap((product) => {
        return [
          `- ${product.name}: ${product.detail}`,
          `  ${product.specs}`,
          `  ${productUrlFor(product.slug)}`,
        ];
      }),
      ...(usesHospitalityProducts
        ? [
            `Telo Lago: ${towelCollectionUrl}`,
            `Twilly Como: ${collectionUrl}`,
          ]
        : [`Collezione completa: ${collectionUrl}`]),
      "",
      "PARTNERSHIP EDITIONS",
      "Tre livelli di collaborazione. Una sola garanzia di origine.",
      "Il logo SILKinCOM tutela l’identità della Maison e la provenienza del progetto. Il partner può scegliere una selezione esistente, una doppia firma oppure uno sviluppo esclusivo.",
      ...partnershipModels.flatMap((model, index) => [
        `${index + 1}. ${model.title} — ${model.eyebrow}`,
        `   ${model.body}`,
      ]),
      "",
      focusCopy.angle,
      "",
      sectorProposalTitle.toUpperCase(),
      ...sectorProposal.steps.map(
        (step, index) => `${index + 1}. ${step.title} — ${step.body}`,
      ),
      `${usesHospitalityProducts ? "Applicazioni previste" : "Estensioni possibili"}: ${focusCopy.products.join(" · ")}.`,
      notes.trim() ? `Perché vi contattiamo: ${notes.trim()}` : null,
      "",
      "ESCLUSIVA SU PROGETTO",
      "L’esclusiva può riguardare prodotto, variante, territorio, canale e durata. Viene formalizzata solo dopo verifica di fattibilità, approvazione del campione, definizione delle quantità minime, piano produttivo e accordo commerciale. Il dossier riservato include concept, applicazione dei loghi, condizioni e calendario.",
      "",
      `Condividiamo un concept riservato, disegnato per ${lead.company_name}.`,
      "Un primo confronto ci permetterà di definire interlocutore, contesto d’impiego, selezione prodotto, personalizzazione, campionatura ed eventuale perimetro di esclusiva.",
      focusCopy.cta,
      "Per richiedere il concept, è sufficiente rispondere a questa email.",
      "",
      "Con stima,",
      founderName,
      "Founder · SILKinCOM",
      "b2b@silkincom.com · https://www.silkincom.com/it/b2b",
      "",
      "Questa proposta è inviata a un contatto business pubblico ritenuto pertinente. Per non ricevere ulteriori comunicazioni, basta rispondere STOP.",
    ]
      .filter(Boolean)
      .join("\n"),
    links: [
      ...outreachProducts.map((product) => ({
        label: product.name,
        url: productUrlFor(product.slug),
      })),
      { label: "Twilly Como", url: collectionUrl },
      ...(usesHospitalityProducts
        ? [{ label: "Telo Lago", url: towelCollectionUrl }]
        : []),
      { label: "Programma B2B", url: `${APP_URL}/it/b2b` },
      { label: "Richiedi il concept riservato", url: replyUrl },
    ],
  };
}

export function buildLeadOutreachCopy(
  lead: {
    company_name: string;
    city?: string | null;
    country?: string | null;
    contact_name?: string | null;
    website_url: string;
  },
  focus: LeadOutreachFocus,
  notes = "",
  options: {
    productImages?: LeadOutreachProductImages;
    productImageOverrides?: LeadOutreachProductImages;
  } = {},
) {
  const focusCopy = buildFocusCopy(focus);
  const founderName = "Marco Dibenedetto";
  const greeting = lead.contact_name
    ? `Gentile ${lead.contact_name},`
    : `Gentile Team ${lead.company_name},`;
  const primaryProduct = getOutreachProducts(focus)[0];
  const primaryProductImage =
    resolveLeadOutreachImage(
      options.productImageOverrides?.[primaryProduct.slug],
      options.productImages?.[primaryProduct.slug],
      primaryProduct.image,
    ) || primaryProduct.image;
  const proposalUrl = `${APP_URL}/it/b2b#richiedi-proposta`;
  const officialLogoUrl = `${APP_URL}/logo-official.png`;
  const normalizedReason = notes.trim().replace(/\s+/g, " ");
  const reason =
    normalizedReason.length > 260
      ? `${normalizedReason.slice(0, 257).replace(/\s+\S*$/, "")}…`
      : normalizedReason;
  const subject = sanitizeEmailHeader(
    `Un’idea per ${lead.company_name}, dal Lago di Como`,
  );
  const replySubject = `Approfondimento SILKinCOM | ${lead.company_name}`;
  const replyBody = [
    `Gentile ${founderName},`,
    "",
    "grazie per averci contattato. Il progetto può essere di nostro interesse.",
    "",
    "Preferiamo:",
    "[ ] ricevere la selezione riservata di 2–3 prodotti",
    "[ ] fissare un breve confronto di 15 minuti",
    "",
    "Referente:",
    "Ruolo:",
    "Telefono:",
    "",
    "Cordiali saluti,",
    lead.company_name,
  ].join("\n");
  const replyUrl = `mailto:b2b@silkincom.com?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
  const preheader = reason
    ? `Una proposta SILKinCOM pensata per ${lead.company_name}: ${reason}`
    : `Una proposta SILKinCOM pensata per ${lead.company_name}.`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @media screen and (max-width:520px) {
      .email-shell { padding:12px 0 !important; }
      .email-content { padding:28px 22px !important; }
      .product-image-cell,
      .product-copy-cell { display:block !important; width:100% !important; box-sizing:border-box !important; }
      .product-image-cell { padding:14px 14px 0 !important; text-align:center !important; }
      .product-copy-cell { padding:15px 18px 19px !important; }
      .product-image { width:100% !important; max-width:230px !important; margin:0 auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F4F0E8;font-family:Arial,Helvetica,sans-serif;color:#201C18;">
  <div style="display:none;max-height:0;overflow:hidden;color:#F4F0E8;">${escapeHtml(preheader)}</div>
  <div class="email-shell" style="max-width:620px;margin:0 auto;padding:24px 12px;">
    <div style="background:#151310;padding:14px 20px;text-align:center;">
      <img src="${escapeHtml(officialLogoUrl)}" width="92" alt="SILKinCOM" style="display:block;width:92px;max-width:92px;height:auto;margin:0 auto;border:0;" />
    </div>
    <div class="email-content" style="background:#FFFDF9;border:1px solid #E6DDCF;border-top:0;padding:34px 32px;">
      <p style="font-size:14px;line-height:1.65;color:#4A443D;margin:0 0 18px;">${escapeHtml(greeting)}</p>
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:400;line-height:1.22;color:#201C18;margin:0 0 18px;">Un’idea per ${escapeHtml(lead.company_name)}.</h1>
      <p style="font-size:15px;line-height:1.7;color:#3F3932;margin:0 0 14px;">Sono <strong>${escapeHtml(founderName)}</strong>, Founder di SILKinCOM, Maison tessile del territorio comasco.</p>
      ${reason ? `<p style="font-size:15px;line-height:1.7;color:#3F3932;margin:0 0 14px;">Vi contatto perché ${escapeHtml(reason)}</p>` : ""}
      <p style="font-size:15px;line-height:1.7;color:#3F3932;margin:0 0 22px;">${escapeHtml(focusCopy.angle)}</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E6DDCF;background:#FAF7F1;margin:0 0 22px;">
        <tr>
          <td class="product-image-cell" width="150" valign="top" style="width:150px;padding:12px;">
            <img class="product-image" src="${escapeHtml(primaryProductImage)}" width="138" alt="${escapeHtml(primaryProduct.alt)}" style="display:block;width:138px;max-width:100%;height:auto;border:0;background:#F1ECE4;" />
          </td>
          <td class="product-copy-cell" valign="middle" style="padding:15px 18px 15px 4px;">
            <p style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#A87F1E;margin:0 0 6px;">Selezione introduttiva</p>
            <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:400;line-height:1.3;color:#201C18;margin:0 0 7px;">${escapeHtml(primaryProduct.name)}</h2>
            <p style="font-size:13px;line-height:1.55;color:#625B52;margin:0 0 8px;">${escapeHtml(primaryProduct.detail)}</p>
            <p style="font-size:11px;line-height:1.5;color:#8C681B;margin:0;">Selezione disponibile per progetti dedicati e collaborazioni su misura.</p>
          </td>
        </tr>
      </table>

      <p style="font-size:15px;line-height:1.7;color:#3F3932;margin:0 0 10px;">Possiamo partire da una selezione essenziale e, se pertinente, sviluppare una doppia firma o un’edizione riservata.</p>
      <p style="font-size:15px;line-height:1.7;color:#3F3932;margin:0 0 20px;"><strong>È lei la persona giusta per valutarla?</strong> In caso contrario, le sarei grato se potesse indicarmi il referente più adatto.</p>
      <p style="margin:0 0 12px;">
        <a href="${escapeHtml(proposalUrl)}" style="display:inline-block;background:#201C18;color:#FFFDF9;text-decoration:none;padding:12px 18px;font-size:11px;letter-spacing:.08em;">Approfondisci la proposta</a>
      </p>
      <p style="font-size:12px;line-height:1.6;color:#6F675E;margin:0 0 24px;">
        Preferisce un confronto diretto? <a href="${escapeHtml(replyUrl)}" style="color:#8C681B;text-decoration:underline;">Risponda a Marco</a>.
      </p>

      <p style="font-size:14px;line-height:1.6;color:#3F3932;margin:0;">Con stima,<br /><strong>${escapeHtml(founderName)}</strong><br /><span style="font-size:12px;color:#8A8278;">Founder · SILKinCOM · Como</span></p>
      <div style="height:1px;background:#E6DDCF;margin:24px 0 14px;"></div>
      <p style="font-size:10px;line-height:1.55;color:#999187;margin:0;">Contatto business pubblico selezionato per pertinenza. Per non ricevere altre comunicazioni, risponda <strong>STOP</strong>.</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    greeting,
    "",
    `Sono ${founderName}, Founder di SILKinCOM, Maison tessile del territorio comasco.`,
    reason ? `Vi contatto perché ${reason}` : null,
    focusCopy.angle,
    "",
    `${primaryProduct.name}: ${primaryProduct.detail}`,
    "",
    "Possiamo partire da una selezione essenziale e, se pertinente, sviluppare una doppia firma o un’edizione riservata.",
    "È lei la persona giusta per valutarla? In caso contrario, le sarei grato se potesse indicarmi il referente più adatto.",
    "",
    "Approfondisca la proposta e i modelli di collaborazione:",
    proposalUrl,
    "",
    "Per un confronto diretto, risponda a questa email: Marco le risponderà personalmente.",
    "",
    "Con stima,",
    founderName,
    "Founder · SILKinCOM · Como",
    "",
    "Contatto business pubblico selezionato per pertinenza. Per non ricevere altre comunicazioni, risponda STOP.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html,
    text,
    links: [
      { label: "Approfondisci la proposta", url: proposalUrl },
      { label: "Rispondi a Marco", url: replyUrl },
    ],
  };
}

export function getLeadOutreachDeliveryMetrics(copy: {
  html: string;
  text: string;
  links: Array<{ label: string; url: string }>;
}) {
  return {
    htmlBytes: Buffer.byteLength(copy.html, "utf8"),
    textWords: copy.text.trim().split(/\s+/).filter(Boolean).length,
    imageCount: (copy.html.match(/<img\b/gi) || []).length,
    linkCount: copy.links.length,
  };
}

function sanitizeEmailHeader(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
