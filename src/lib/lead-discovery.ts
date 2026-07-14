import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      )
        return null;
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > MAX_HTML_BYTES * 2) return null;
      return { html: await readLimitedText(response), finalUrl: currentUrl };
    }
    return null;
  } catch {
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

  const homepageResult = await fetchHtml(normalizedUrl);
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
  url.searchParams.set("num", String(maxResults));
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
}): Promise<SearchLeadCandidate[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  const liveQuery = [params.query, params.location].filter(Boolean).join(" ");
  const maxResults = Math.min(params.maxResults || 6, 10);

  if (apiKey && searchEngineId) {
    try {
      const googleResults = await searchGoogleCustomSearch(
        liveQuery,
        maxResults,
        apiKey,
        searchEngineId,
      );
      if (googleResults.length > 0) return googleResults;
    } catch {
      // The public fallback keeps lead discovery operational if Google quota or configuration fails.
    }
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
      if (openStreetMapResults.length > 0) return openStreetMapResults;
    } catch {
      // The final fallback can still serve results if an OSM instance is busy.
    }
  }

  try {
    const fallbackResults = await searchDuckDuckGo(liveQuery, maxResults);
    if (fallbackResults.length > 0) return fallbackResults;
  } catch {
    if (!openStreetMapCompleted) {
      throw new Error(
        "I servizi di ricerca sono temporaneamente occupati. Riprova tra pochi secondi.",
      );
    }
  }

  throw new Error(
    "Nessuna azienda con sito pubblico trovata. Prova una zona più precisa o altre categorie.",
  );
}

function buildFocusCopy(focus: LeadOutreachFocus) {
  switch (focus) {
    case "bed_breakfast":
      return {
        subject: "Una proposta SILKinCOM per il vostro B&B di charme",
        eyebrow: "B&B charme · Guest experience",
        intro:
          "Vi proponiamo una selezione semplice e premium per B&B, relais e dimore di charme che vogliono aumentare il valore dell’esperienza ospite.",
        angle:
          "Per strutture intime, pochi prodotti giusti possono generare vendite naturali: un foulard, una pashmina o un piccolo gift diventano ricordo del soggiorno e racconto del territorio.",
        products: [
          "foulard in seta come souvenir alto",
          "pashmine cashmere per ospiti e camere premium",
          "gift set leggeri per welcome experience",
        ],
        cta: "Possiamo inviarvi una proposta essenziale con minimi sostenibili, listino riservato e prodotti facili da esporre.",
      };
    case "hotel_boutique":
      return {
        subject: "Una capsule SILKinCOM per la vostra boutique",
        eyebrow: "Maison capsule · Boutique hospitality",
        intro:
          "Vi proponiamo una capsule selettiva per boutique hotel, resort shop e corner d’accoglienza.",
        angle:
          "Una selezione Made in Como che può diventare acquisto d’impulso premium, souvenir elegante o regalo dedicato agli ospiti più importanti.",
        products: [
          "foulard in seta per gifting e boutique",
          "sciarpe e pashmine in cashmere",
          "camicie in lino per resort e leisurewear",
        ],
        cta: "Possiamo inviarvi una selezione iniziale con listino riservato e proposta visual per il vostro spazio.",
      };
    case "resort_beach_club":
      return {
        subject:
          "Una selezione resortwear Made in Como per la vostra clientela",
        eyebrow: "Resortwear · Beach club · Luxury travel",
        intro:
          "Stiamo curando collaborazioni con luoghi di villeggiatura e club dove il prodotto deve essere immediato, leggero e memorabile.",
        angle:
          "SILKinCOM può accompagnare la stagione con accessori e capi facili da esporre, adatti a boutique di resort, beach club e destinazioni lifestyle.",
        products: [
          "foulard seta leggeri per viaggio e serate",
          "camicie lino e cotone per resortwear",
          "pashmine cashmere per evening e yacht",
        ],
        cta: "Se ha senso per la vostra stagione, prepariamo una proposta rapida con prodotti, margini e tempi di consegna.",
      };
    case "spa_wellness":
      return {
        subject: "Una proposta SILKinCOM per spa, wellness e rituali premium",
        eyebrow: "Wellness gifting · Spa retail",
        intro:
          "Per spa e luoghi wellness proponiamo accessori tattili, naturali e coerenti con un’esperienza di cura alta.",
        angle:
          "Cashmere, seta, lino e lana raccontano comfort e quiet luxury: ideali per gift corner, pacchetti wellness e upgrade per ospiti VIP.",
        products: [
          "pashmine cashmere per rituali e relax",
          "foulard seta per gifting raffinato",
          "selezioni regalo con packaging maison",
        ],
        cta: "Possiamo preparare una selezione per gift corner o pacchetti ospite con minimi sostenibili.",
      };
    case "wedding_events":
      return {
        subject:
          "Gift e dettagli Made in Como per eventi e wedding di fascia alta",
        eyebrow: "Wedding · Event gifting",
        intro:
          "Vi proponiamo una linea di accessori premium per eventi, wedding, welcome gift e ospiti internazionali.",
        angle:
          "Il valore è nel dettaglio: materiali nobili, packaging elegante e prodotti facili da personalizzare in selezioni dedicate.",
        products: [
          "foulard in seta come cadeau ospite",
          "pashmine per cerimonie e serate",
          "gift set corporate o wedding con nota dedicata",
        ],
        cta: "Possiamo inviare una proposta per budget, quantità e timing del prossimo evento.",
      };
    case "corporate_gifting":
      return {
        subject: "Corporate gifting premium Made in Como",
        eyebrow: "Corporate gifting · Executive clients",
        intro:
          "SILKinCOM propone regali aziendali premium per clienti importanti, board, partner e hospitality business.",
        angle:
          "Un dono tessile Made in Como ha percezione alta, uso reale e una narrazione più elegante del gadget tradizionale.",
        products: [
          "foulard seta per clienti VIP",
          "pashmine cashmere per executive gift",
          "packaging e biglietto dedicato alla vostra maison",
        ],
        cta: "Possiamo preparare una griglia per budget, quantità e personalizzazione leggera.",
      };
    case "concept_store":
      return {
        subject: "Una proposta SILKinCOM per il vostro concept store",
        eyebrow: "Concept store · Curated retail",
        intro:
          "Abbiamo selezionato una proposta per store curati che cercano prodotti con storia, materiali nobili e rotazione agile.",
        angle:
          "SILKinCOM unisce accessibilità selettiva e racconto di filiera comasca: ideale per corner moda, lifestyle e gifting.",
        products: [
          "foulard seta come entry luxury",
          "sciarpe cashmere come prodotto continuativo",
          "camicie lino/cotone per capsule stagionali",
        ],
        cta: "Se vi interessa, inviamo line sheet e selezione consigliata per primo ordine.",
      };
    case "museum_bookshop":
      return {
        subject: "Accessori Made in Como per bookshop e spazi culturali",
        eyebrow: "Culture retail · Museum shop",
        intro:
          "Per bookshop, fondazioni e spazi culturali proponiamo accessori tessili con forte valore narrativo e gifting.",
        angle:
          "Seta e Como dialogano bene con cultura, viaggio e memoria: una proposta elegante per visitatori e clienti internazionali.",
        products: [
          "foulard in seta come souvenir alto",
          "gift set con storytelling maison",
          "capsule colore coerenti con mostre o stagioni",
        ],
        cta: "Possiamo condividere una proposta editoriale/prodotto pensata per il vostro pubblico.",
      };
    case "yacht_golf_club":
      return {
        subject: "Una selezione SILKinCOM per club privati e ospiti premium",
        eyebrow: "Private clubs · Yacht · Golf",
        intro:
          "Stiamo proponendo capsule tessili per club privati, yacht club, golf club e luoghi dove il gifting deve restare discreto e alto.",
        angle:
          "Prodotti leggeri, nobili e facili da acquistare o regalare, con una presenza elegante in boutique e pro shop.",
        products: [
          "pashmine cashmere per club e travel",
          "foulard seta per gifting soci",
          "camicie lino per capsule leisure",
        ],
        cta: "Possiamo inviare una selezione club con quantità contenute e packaging dedicato.",
      };
    case "personal_shopper":
      return {
        subject: "Una selezione SILKinCOM per clienti privati e styling",
        eyebrow: "Personal shopping · Private client",
        intro:
          "Vi proponiamo SILKinCOM come selezione accessori per clienti privati, styling, guardaroba viaggio e gifting.",
        angle:
          "Foulard, cashmere e lino permettono proposte eleganti, trasversali e facili da inserire in consulenze moda di fascia alta.",
        products: [
          "foulard seta per styling e colore",
          "pashmine cashmere per guardaroba viaggio",
          "camicie lino/cotone per capsule estive",
        ],
        cta: "Possiamo preparare una selezione privata con prodotti consigliati e condizioni dedicate.",
      };
    case "interior_architect":
      return {
        subject:
          "Textile gifting Made in Como per progetti hospitality e interior",
        eyebrow: "Interior · Hospitality procurement",
        intro:
          "Per studi interior e architettura proponiamo accessori tessili premium da integrare in progetti hospitality, suite e gift experience.",
        angle:
          "Un prodotto tessile selezionato completa il racconto dello spazio: non arredo, ma gesto finale di accoglienza.",
        products: [
          "pashmine cashmere per suite e VIP gift",
          "foulard seta per welcome experience",
          "selezioni colore coordinate al progetto",
        ],
        cta: "Possiamo condividere una proposta per progetto, palette e budget.",
      };
    case "tour_operator_luxury":
      return {
        subject: "Welcome gift Made in Como per viaggi luxury",
        eyebrow: "Luxury travel · Concierge gifting",
        intro:
          "SILKinCOM può diventare un welcome gift o una proposta concierge per viaggiatori premium in Italia e sul Lago di Como.",
        angle:
          "Un accessorio Made in Como crea memoria del viaggio e aumenta il valore percepito dell’esperienza.",
        products: [
          "foulard seta per welcome gift",
          "pashmine cashmere per itinerari serali",
          "gift set viaggio con packaging maison",
        ],
        cta: "Possiamo preparare una proposta per itinerari, gruppi privati e clienti VIP.",
      };
    case "retail":
      return {
        subject: "Una proposta per la vostra boutique firmata SILKinCOM",
        eyebrow: "Boutique retail · Premium accessories",
        intro:
          "Abbiamo selezionato una proposta adatta a boutique indipendenti, spazi retail selettivi e corner di stile.",
        angle:
          "Una linea Made in Como con materiali nobili, buon racconto prodotto e assortimento agile tra seta, cashmere e lino.",
        products: [
          "foulard in seta",
          "sciarpe e pashmine in cashmere",
          "camicie in lino e cotone",
        ],
        cta: "Possiamo inviarvi line sheet e selezione consigliata per primo ordine.",
      };
    case "gifting":
      return {
        subject: "Una proposta per gifting e ospitalità firmata SILKinCOM",
        eyebrow: "Gifting · Hospitality amenities",
        intro:
          "Lavoriamo su piccoli lotti e selezioni premium pensate per ospitalità, regali aziendali e clienti VIP.",
        angle:
          "Il regalo diventa memorabile quando è utile, tattile e racconta una provenienza autentica.",
        products: [
          "foulard seta per cadeau",
          "pashmine cashmere per VIP gift",
          "packaging e biglietto dedicato",
        ],
        cta: "Possiamo preparare una proposta per budget e quantità con tempi rapidi.",
      };
    case "wholesale":
      return {
        subject: "Proposta di collaborazione wholesale con SILKinCOM",
        eyebrow: "Wholesale · B2B selection",
        intro:
          "Se cercate una fornitura affidabile di accessori Made in Como, possiamo preparare una selezione dedicata.",
        angle:
          "La proposta è pensata per partner che vogliono un assortimento premium senza complessità: materiali chiari, schede prodotto, margini e riordini.",
        products: [
          "seta come entry luxury",
          "cashmere come continuativo alto",
          "lino/cotone per capsule stagionali",
        ],
        cta: "Possiamo inviare condizioni wholesale e campionario iniziale.",
      };
    default:
      return {
        subject: "Una proposta di collaborazione per la vostra struttura",
        eyebrow: "Hospitality · Maison collaboration",
        intro:
          "Stiamo proponendo una selezione di accessori e capi Made in Como per hospitality, accoglienza e boutique interne.",
        angle:
          "L’obiettivo è trasformare l’esperienza dell’ospite in vendita naturale: prodotto bello, facile da capire, coerente con un contesto premium.",
        products: [
          "foulard in seta per boutique e gifting",
          "pashmine cashmere per suite e ospiti VIP",
          "camicie lino/cotone per resortwear",
        ],
        cta: "Possiamo preparare una proposta riservata con prodotti, margini e selezione campioni.",
      };
  }
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
) {
  const focusCopy = buildFocusCopy(focus);
  const greeting = lead.contact_name
    ? `Gentile ${lead.contact_name},`
    : "Gentile team,";
  const location = [lead.city, lead.country].filter(Boolean).join(" - ");
  const noteBlock = notes.trim()
    ? `<p style="margin:16px 0 0 0;">${escapeHtml(notes.trim())}</p>`
    : "";
  const productsHtml = focusCopy.products
    .map(
      (product) => `<li style="margin:0 0 8px 0;">${escapeHtml(product)}</li>`,
    )
    .join("");
  const html = `<!DOCTYPE html>
<html lang="it">
<body style="margin:0;padding:0;background:#F4EFE6;font-family:Inter, Arial, sans-serif;color:#17130F;">
  <div style="display:none;max-height:0;overflow:hidden;color:#F4EFE6;">Una proposta riservata SILKinCOM per una collaborazione B2B Made in Como.</div>
  <div style="max-width:660px;margin:0 auto;padding:28px 14px;">
    <div style="background:#11100E;color:#F8F3EA;padding:14px 22px;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:#D8B443;">SILKinCOM · Como Textile Maison</p>
    </div>
    <div style="background:#FFFDF8;border:1px solid #E5D8BE;padding:42px 34px;">
      <p style="font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#B88A21;margin:0 0 18px 0;">${escapeHtml(focusCopy.eyebrow)}</p>
      <h1 style="font-family:Georgia, 'Times New Roman', serif;font-weight:400;font-size:35px;line-height:1.12;letter-spacing:-.01em;margin:0 0 20px 0;color:#17130F;">${greeting}</h1>
      <p style="font-size:16px;line-height:1.82;color:#3B362F;margin:0 0 14px 0;">${escapeHtml(focusCopy.intro)}</p>
      <p style="font-size:16px;line-height:1.82;color:#3B362F;margin:0 0 14px 0;">SILKinCOM disegna e seleziona foulard in seta, pashmine e sciarpe in cashmere, camicie in lino e cotone nel distretto tessile di Como. È una proposta pensata per chi vende esperienza, gusto e appartenenza, non solo prodotto.</p>
      <div style="border-left:2px solid #D8B443;padding:2px 0 2px 18px;margin:24px 0;">
        <p style="font-family:Georgia, 'Times New Roman', serif;font-size:22px;line-height:1.35;color:#17130F;margin:0;">${escapeHtml(focusCopy.angle)}</p>
      </div>
      <p style="font-size:15px;line-height:1.75;color:#4A443C;margin:0 0 12px 0;">Per ${escapeHtml(lead.company_name)}${location ? `, ${escapeHtml(location)}` : ""} immaginiamo una selezione molto concreta:</p>
      <ul style="margin:0 0 20px 18px;padding:0;font-size:15px;line-height:1.75;color:#4A443C;">
        ${productsHtml}
      </ul>
      ${noteBlock}
      <p style="font-size:15px;line-height:1.8;color:#4A443C;margin:22px 0 0 0;">${escapeHtml(focusCopy.cta)}</p>
      <p style="font-size:15px;line-height:1.8;color:#4A443C;margin:16px 0 0 0;">Se preferite, rispondete con <strong>“campioni”</strong> e vi mandiamo la proposta essenziale; se invece il contatto non è pertinente, basta rispondere <strong>“stop”</strong> e non invieremo ulteriori messaggi.</p>
      <div style="height:1px;background:#E5D8BE;margin:30px 0 18px 0;"></div>
      <p style="font-size:12px;color:#9A9388;line-height:1.7;margin:0;">SILKinCOM · Cermenate (Como) · info@silkincom.com · ${escapeHtml(lead.website_url)}</p>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: focusCopy.subject,
    html,
    text: [
      greeting,
      "",
      `SILKinCOM · ${focusCopy.eyebrow}`,
      "",
      focusCopy.intro,
      "",
      `SILKinCOM disegna e confeziona accessori e capi in seta, cashmere, lino, lana e cotone nel distretto tessile di Como.`,
      focusCopy.angle,
      `Possiamo preparare una proposta dedicata per ${lead.company_name}${location ? `, ${location}` : ""}.`,
      "",
      "Prodotti suggeriti:",
      ...focusCopy.products.map((product) => `- ${product}`),
      notes.trim() ? `Note: ${notes.trim()}` : null,
      "",
      focusCopy.cta,
      "",
      "Per non ricevere ulteriori messaggi, basta rispondere “stop”.",
      `Sito: ${lead.website_url}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
