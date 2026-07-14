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

const HOSPITALITY_PRODUCT_FOCUSES = new Set<LeadOutreachFocus>([
  "hospitality",
  "bed_breakfast",
  "hotel_boutique",
  "resort_beach_club",
  "spa_wellness",
]);

const SECTOR_OUTREACH_ACTIVATIONS: Record<LeadOutreachFocus, string> = {
  hospitality: "Hall, boutique, piscina e gifting",
  bed_breakfast: "Reception, camere e guest gifting",
  hotel_boutique: "Hall, concierge, boutique e piscina",
  resort_beach_club: "Pool, beach, resort shop e gifting",
  spa_wellness: "Spa, pool, gift corner e membership",
  wedding_events: "Evento, welcome desk e cadeau ospiti",
  corporate_gifting: "Selezione, confezione e consegna",
  concept_store: "Assortimento, storytelling e riordino",
  museum_bookshop: "Bookshop, racconto territoriale e retail",
  yacht_golf_club: "Club shop, eventi e member gifting",
  personal_shopper: "Private edit, styling e ordine riservato",
  interior_architect: "Material board, suite e welcome experience",
  tour_operator_luxury: "Welcome kit, concierge e itinerari privati",
  retail: "Capsule boutique, staff e riassortimento",
  gifting: "Curatela, packaging e consegna progetto",
  wholesale: "Campionario, primo ordine e riassortimento",
};

const SECTOR_OUTREACH_OBJECTIVES: Record<LeadOutreachFocus, string> = {
  hospitality: "Hall, Telo Lago ed esperienza ospite",
  bed_breakfast: "Accoglienza, Lago e gifting ospite",
  hotel_boutique: "Hall, piscina, concierge e ospiti VIP",
  resort_beach_club: "Pool experience, resort retail e gifting",
  spa_wellness: "Telo wellness, gift corner e membership",
  wedding_events: "Cadeau ospiti ed eventi su progetto",
  corporate_gifting: "Clienti, board e relazioni istituzionali",
  concept_store: "Assortimento curato e riordino selettivo",
  museum_bookshop: "Souvenir culturale ad alto valore",
  yacht_golf_club: "Club retail, premi e member gifting",
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

function getOutreachProducts(
  focus: LeadOutreachFocus,
): readonly OutreachProduct[] {
  if (focus === "resort_beach_club") {
    return [
      TIVAN_OUTREACH_PRODUCT,
      TWILLY_OUTREACH_PRODUCTS[2],
      TWILLY_OUTREACH_PRODUCTS[1],
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
      TWILLY_OUTREACH_PRODUCTS[1],
    ];
  }

  return TWILLY_OUTREACH_PRODUCTS;
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
      title: "Il Lago di Como, dalla piscina alla hall.",
      html: "Il <strong>Telo Lago Tivan</strong>, in 100% cotone con logo ricamato, è pensato per piscina, spa, accesso al Lago, suite e guest gifting. I <strong>Twilly Como</strong>, in pura seta, diventano invece una presenza distintiva in hall, reception o concierge: esposti su console, teca o corner boutique nel linguaggio degli hotel iconici del Lago.",
      text: "Il Telo Lago Tivan, in 100% cotone con logo ricamato, è pensato per piscina, spa, accesso al Lago, suite e guest gifting. I Twilly Como, in pura seta, diventano invece una presenza distintiva in hall, reception o concierge: esposti su console, teca o corner boutique nel linguaggio degli hotel iconici del Lago.",
    };
  }

  if (focus === "resort_beach_club") {
    return {
      eyebrow: "Capsule resort · Telo Lago & Twilly Como",
      title: "Dalla piscina al resort shop, un solo racconto del Lago.",
      html: "Il <strong>Telo Lago Tivan</strong> accompagna piscina, beach area, pontile e suite; i <strong>Twilly Como</strong> completano resort shop, concierge e gifting con un accessorio in pura seta leggero e riconoscibile.",
      text: "Il Telo Lago Tivan accompagna piscina, beach area, pontile e suite; i Twilly Como completano resort shop, concierge e gifting con un accessorio in pura seta leggero e riconoscibile.",
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
    title: "Il Lago di Como tradotto in un accessorio di pura seta.",
    html: "Un foulard a nastro in <strong>100% seta</strong>, Made in Como, 120 × 7,5 cm, con orlo rifinito a mano e logo jacquard SILKinCOM ispirato alle onde del Lago. Un oggetto riconoscibile, versatile e ad alto valore percepito, pensato per essere indossato, regalato e ricordato.",
    text: "Foulard a nastro in 100% seta, Made in Como, 120 × 7,5 cm, con orlo rifinito a mano e logo jacquard SILKinCOM ispirato alle onde del Lago. Un oggetto riconoscibile, versatile e ad alto valore percepito.",
  };
}

function buildSectorProposal(focus: LeadOutreachFocus): SectorProposal {
  switch (focus) {
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
        title: "Piano boutique hotel e resort shop",
        steps: [
          {
            title: "Hall e concierge curation",
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
            title: "Telo Lago e pool experience",
            body: "Tivan per piscina, beach area, pontile, barca e suite, con logo ricamato e formato leggero da portare in viaggio.",
          },
          {
            title: "Resort shop e concierge",
            body: "Twilly Como presentati in boutique o hall come accessorio di seta Made in Como, da indossare o regalare durante il soggiorno.",
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
            body: "Selezione di Twilly eleganti per pro shop, boutique del club e guardaroba viaggio dei soci.",
          },
          {
            title: "Occasioni dedicate",
            body: "Premi, welcome gift, tornei, regate e serate sociali con un accessorio leggero e riconoscibile.",
          },
          {
            title: "Servizio continuativo",
            body: "Quantità iniziali contenute, riordini rapidi e capsule successive per eventi o stagioni.",
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
            body: "Twilly Como come ricordo elegante e facilmente trasportabile per viaggiatori premium sul Lago di Como.",
          },
          {
            title: "Integrazione itinerario",
            body: "Inserimento nel welcome kit, nella suite o come proposta concierge durante l’esperienza.",
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
        subject: "Telo Lago e seta di Como per la vostra ospitalità",
        eyebrow: "B&B charme · Lake hospitality",
        intro:
          "Vi sottoponiamo una capsule dedicata a B&B, relais e dimore di charme: il Telo Lago per accompagnare il soggiorno e i Twilly Como per reception, gifting e acquisto ospite.",
        angle:
          "Per una struttura intima, il tessile può diventare parte dell’accoglienza: utile durante il soggiorno, distintivo negli spazi comuni e memorabile come ricordo del Lago.",
        products: [
          "Telo Lago Tivan per camere, terrazze e accesso al Lago",
          "Twilly Como per reception e gifting",
          "pashmine cashmere per camere e ospiti VIP",
        ],
        cta: "Possiamo predisporre una proposta dedicata con condizioni riservate, quantità iniziali calibrate e indicazioni di presentazione.",
      };
    case "hotel_boutique":
      return {
        subject: "Una capsule Lago di Como per hall e guest experience",
        eyebrow: "Hotel iconici · Hall & guest experience",
        intro:
          "Vi proponiamo una capsule hospitality costruita su due gesti complementari: il Telo Lago Tivan per piscina, spa, suite e accesso al Lago; i Twilly Como in pura seta per hall, concierge, boutique e gifting.",
        angle:
          "Una selezione Made in Como può abitare la hall con la stessa cura riservata ad arte e design, estendendo poi il racconto del Lago alla piscina, alla suite e al momento del dono.",
        products: [
          "Telo Lago Tivan per piscina, spa e suite",
          "Twilly Como per hall, concierge e boutique",
          "packaging Maison per gifting e ospiti VIP",
        ],
        cta: "Possiamo inviarvi una selezione iniziale con listino riservato e proposta visual per il vostro spazio.",
      };
    case "resort_beach_club":
      return {
        subject:
          "Una selezione resortwear Made in Como per la vostra clientela",
        eyebrow: "Resortwear · Beach club · Luxury travel",
        intro:
          "Stiamo curando collaborazioni con resort e club in cui il tessile accompagna l’esperienza dalla piscina al pontile, fino alla boutique e al concierge.",
        angle:
          "Tivan introduce un Telo Lago Made in Como negli spazi leisure; i Twilly in pura seta ne proseguono il racconto nel resort shop, nel gifting e nel guardaroba viaggio.",
        products: [
          "Telo Lago Tivan per piscina, beach area e barca",
          "Twilly Como per resort shop e gifting",
          "lino e cashmere leggero per estensioni stagionali",
        ],
        cta: "Possiamo predisporre una proposta stagionale con assortimento, condizioni commerciali e calendario di consegna.",
      };
    case "spa_wellness":
      return {
        subject: "Una proposta SILKinCOM per spa, wellness e rituali premium",
        eyebrow: "Wellness gifting · Spa retail",
        intro:
          "Per spa e luoghi wellness proponiamo una capsule naturale e tattile: Telo Lago Tivan negli spazi relax e Twilly Como nel gift corner e nei programmi membership.",
        angle:
          "100% cotone e pura seta costruiscono un percorso coerente tra utilizzo, benessere e gifting, mantenendo riconoscibile l’origine comasca della proposta.",
        products: [
          "Telo Lago Tivan per piscina e area relax",
          "Twilly Como per gift corner e membership",
          "pashmine cashmere per suite e ospiti VIP",
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
          "Il valore risiede nel dettaglio: materiali nobili, packaging Maison e una selezione costruita sull’identità dell’occasione.",
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
          "foulard seta come accessorio identitario",
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
          "Accessori leggeri, nobili e versatili, con una presenza discreta e coerente in boutique e pro shop.",
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
          "Foulard, cashmere e lino si integrano con naturalezza in consulenze di stile, guardaroba viaggio e gifting per clientela privata.",
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
          "Una linea Made in Como con materiali nobili, una narrazione di origine riconoscibile e un assortimento calibrato tra seta, cashmere e lino.",
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
          "Sviluppiamo capsule selettive per ospitalità, relazioni aziendali e clientela VIP.",
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
          "La proposta è pensata per partner che richiedono un assortimento selettivo, una struttura commerciale chiara, documentazione prodotto e continuità di riassortimento.",
        products: [
          "seta come proposta identitaria",
          "cashmere come continuativo alto",
          "lino/cotone per capsule stagionali",
        ],
        cta: "Possiamo inviare condizioni wholesale e campionario iniziale.",
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
  const sectorProposal = buildSectorProposal(focus);
  const sectorProposalTitle = sectorProposal.title.replace(
    /^Piano\s+/,
    "Proposta per ",
  );
  const sectorObjective = SECTOR_OUTREACH_OBJECTIVES[focus];
  const sectorActivation = SECTOR_OUTREACH_ACTIVATIONS[focus];
  const usesHospitalityProducts = HOSPITALITY_PRODUCT_FOCUSES.has(focus);
  const outreachProducts = getOutreachProducts(focus);
  const productStory = buildOutreachProductStory(focus);
  const executiveProject = usesHospitalityProducts
    ? "Capsule Hospitality Lago di Como"
    : "Capsule Twilly Como";
  const executiveMaterial = usesHospitalityProducts
    ? "Pura seta · 100% cotone · Made in Como"
    : "100% seta · Made in Como";
  const greeting = lead.contact_name
    ? `Gentile ${lead.contact_name},`
    : `Gentile Team ${lead.company_name},`;
  const location = [lead.city, lead.country].filter(Boolean).join(" - ");
  const trackingParams = new URLSearchParams({
    utm_source: "b2b_outreach",
    utm_medium: "email",
    utm_campaign: focus,
  });
  const collectionUrl = `${APP_URL}/it/foulard-seta?${trackingParams.toString()}`;
  const towelCollectionParams = new URLSearchParams(trackingParams);
  towelCollectionParams.set("utm_content", "telo_lago_collection");
  const towelCollectionUrl = `${APP_URL}/it/teli-mare?${towelCollectionParams.toString()}`;
  const collectionLinksHtml = usesHospitalityProducts
    ? `<a href="${escapeHtml(towelCollectionUrl)}" style="display:inline-block;background:#17130F;color:#FFFDF8;text-decoration:none;padding:13px 18px;margin:0 4px 8px 4px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;">Scopri il Telo Lago</a><a href="${escapeHtml(collectionUrl)}" style="display:inline-block;border:1px solid #17130F;color:#17130F;text-decoration:none;padding:12px 18px;margin:0 4px 8px 4px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;">Esplora i Twilly Como</a>`
    : `<a href="${escapeHtml(collectionUrl)}" style="display:inline-block;background:#17130F;color:#FFFDF8;text-decoration:none;padding:13px 22px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;">Esplora la collezione Twilly Como</a>`;
  const replySubject = `Approfondimento partnership — ${lead.company_name} × SILKinCOM`;
  const replyBody = `Gentile Marco,\n\nla ringraziamo per averci presentato la proposta SILKinCOM. Desideriamo approfondire una possibile collaborazione con ${lead.company_name}.\n\nSaremmo interessati a ricevere:\n- dossier commerciale e condizioni riservate\n- selezione campioni\n- disponibilità per un incontro introduttivo\n\nCordiali saluti,`;
  const replyUrl = `mailto:b2b@silkincom.com?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
  const noteBlock = notes.trim()
    ? `<div style="margin:24px 0 0 0;padding:18px 20px;background:#F8F3EA;border-left:2px solid #D8B443;">
        <p style="margin:0 0 6px 0;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#A87F1E;">Perché vi contattiamo</p>
        <p style="margin:0;font-size:14px;line-height:1.75;color:#4A443C;">${escapeHtml(notes.trim())}</p>
      </div>`
    : "";
  const productsHtml = outreachProducts.map((product) => {
    const productParams = new URLSearchParams(trackingParams);
    productParams.set("utm_content", product.slug.replaceAll("-", "_"));
    const productUrl = `${APP_URL}/it/prodotto/${product.slug}?${productParams.toString()}`;
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
  const extensionsHtml = focusCopy.products
    .map((product) => escapeHtml(product))
    .join(" · ");
  const subject = sanitizeEmailHeader(
    `Proposta riservata di partnership | SILKinCOM × ${lead.company_name}`,
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
  <div style="display:none;max-height:0;overflow:hidden;color:#F3EEE5;">${usesHospitalityProducts ? `Telo Lago Tivan e Twilly Como per hall, ospitalità e gifting di ${escapeHtml(lead.company_name)}.` : `Una proposta di partnership costruita per ${escapeHtml(lead.company_name)}, con una capsule Twilly in pura seta Made in Como.`}</div>
  <div style="max-width:680px;margin:0 auto;padding:28px 12px;">
    <div style="background:#11100E;color:#F8F3EA;padding:17px 22px;text-align:center;">
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:23px;letter-spacing:.08em;color:#F8F3EA;">SILKinCOM</p>
      <p style="margin:6px 0 0 0;font-size:8px;letter-spacing:.34em;text-transform:uppercase;color:#D8B443;">Partnership Office · Como, Italia</p>
    </div>
    <div class="email-content" style="background:#FFFDF8;border:1px solid #E5D8BE;border-top:0;padding:40px 34px;">
      <p style="font-size:14px;line-height:1.7;color:#4A443C;margin:0 0 20px 0;">${escapeHtml(greeting)}</p>
      <p style="font-size:9px;letter-spacing:.32em;text-transform:uppercase;color:#A87F1E;margin:0 0 14px 0;">Proposta riservata · ${escapeHtml(focusCopy.eyebrow)}</p>
      <h1 class="email-title" style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:36px;line-height:1.13;letter-spacing:-.015em;margin:0 0 20px 0;color:#17130F;">Una collaborazione dedicata,<br /><span style="color:#A87F1E;font-style:italic;">firmata Lago di Como.</span></h1>
      <p style="font-size:15px;line-height:1.8;color:#3B362F;margin:0 0 14px 0;">Sono <strong>Marco Di Benedetto</strong>, Founder di SILKinCOM. Le scrivo per sottoporre alla sua attenzione una possibile collaborazione tra la nostra Maison e <strong>${escapeHtml(lead.company_name)}</strong>${location ? `, con riferimento a ${escapeHtml(location)}` : ""}.</p>
      <p style="font-size:15px;line-height:1.8;color:#3B362F;margin:0 0 24px 0;">${escapeHtml(focusCopy.intro)} La proposta non nasce come catalogo standard, ma come progetto calibrato sul vostro posizionamento, sulla clientela e sul contesto di vendita o accoglienza.</p>

      <div style="background:#17130F;color:#FFFDF8;padding:22px 24px;margin:0 0 26px 0;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#D8B443;margin:0 0 14px 0;">Executive brief</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td class="brief-cell" valign="top" style="padding:0 12px 12px 0;border-bottom:1px solid #3B3832;">
              <p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#AFA79C;margin:0 0 5px 0;">Progetto</p>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.4;color:#FFFDF8;margin:0;">${escapeHtml(executiveProject)}</p>
            </td>
            <td class="brief-cell" valign="top" style="padding:0 0 12px 12px;border-bottom:1px solid #3B3832;">
              <p style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#AFA79C;margin:0 0 5px 0;">Materia</p>
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

      <div style="border-left:2px solid #D8B443;padding:2px 0 2px 18px;margin:0 0 28px 0;">
        <p style="font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:#A87F1E;margin:0 0 8px 0;">Rilevanza per ${escapeHtml(lead.company_name)}</p>
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.42;color:#17130F;margin:0;">${escapeHtml(focusCopy.angle)}</p>
      </div>

      <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 13px 0;">Architettura della collaborazione</p>
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:27px;line-height:1.25;color:#17130F;margin:0 0 20px 0;">${escapeHtml(sectorProposalTitle)}</h2>
      ${proposalStepsHtml}
      <p style="font-size:12px;line-height:1.7;color:#7B7369;margin:14px 0 0 0;"><strong style="color:#4A443C;">${usesHospitalityProducts ? "Applicazioni previste" : "Estensioni possibili"}:</strong> ${extensionsHtml}.</p>
      ${noteBlock}

      <div style="background:#F4EFE6;border:1px solid #E5D8BE;padding:22px;margin:28px 0 0 0;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#A87F1E;margin:0 0 12px 0;">Dossier di partnership</p>
        <p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.4;color:#17130F;margin:0 0 12px 0;">Una proposta completa per una decisione chiara.</p>
        <p style="font-size:13px;line-height:1.75;color:#5A534B;margin:0;">Su richiesta predisponiamo una selezione prodotti dedicata, line sheet, disponibilità, condizioni commerciali riservate, ipotesi di assortimento, materiali di presentazione e calendario operativo. La fase iniziale può essere impostata come progetto pilota, con successiva verifica dei risultati e riassortimento mirato.</p>
      </div>

      <div style="background:#17130F;color:#FFFDF8;padding:26px 24px;margin:30px 0 26px 0;text-align:center;">
        <p style="font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:#D8B443;margin:0 0 10px 0;">Invito riservato</p>
        <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;line-height:1.3;color:#FFFDF8;margin:0 0 12px 0;">Valutiamo insieme il formato più adatto a ${escapeHtml(lead.company_name)}.</h2>
        <p style="font-size:13px;line-height:1.7;color:#DED8CE;margin:0 0 12px 0;">Il primo confronto è finalizzato a verificare coerenza, applicazione, assortimento e condizioni dell’eventuale fase pilota.</p>
        <p style="font-size:13px;line-height:1.7;color:#FFFDF8;margin:0 0 18px 0;">Sarei lieto di presentarvi il progetto in un incontro introduttivo riservato. In alternativa, possiamo trasmettere direttamente il <strong style="color:#D8B443;">dossier commerciale</strong> o predisporre una <strong style="color:#D8B443;">selezione campioni</strong>.</p>
        <a href="${escapeHtml(replyUrl)}" style="display:inline-block;background:#D8B443;color:#17130F;text-decoration:none;padding:13px 21px;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;">Richiedi un approfondimento</a>
      </div>

      <p style="font-size:14px;line-height:1.7;color:#3B362F;margin:0;">Cordiali saluti,</p>
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.4;color:#17130F;margin:8px 0 2px 0;">Marco Di Benedetto</p>
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
      "UNA COLLABORAZIONE DEDICATA, FIRMATA LAGO DI COMO",
      `Sono Marco Di Benedetto, Founder di SILKinCOM. Le scrivo per sottoporre alla sua attenzione una possibile collaborazione tra la nostra Maison e ${lead.company_name}${location ? `, con riferimento a ${location}` : ""}.`,
      `${focusCopy.intro} La proposta non nasce come catalogo standard, ma come progetto calibrato sul vostro posizionamento, sulla clientela e sul contesto di vendita o accoglienza.`,
      "",
      "EXECUTIVE BRIEF",
      `Progetto: ${executiveProject}`,
      `Materia: ${executiveMaterial}`,
      `Attivazione: ${sectorActivation}`,
      `Obiettivo: ${sectorObjective}`,
      "",
      productStory.eyebrow.toUpperCase(),
      productStory.title,
      productStory.text,
      "",
      "Prodotti da valutare:",
      ...outreachProducts.flatMap((product) => {
        const productParams = new URLSearchParams(trackingParams);
        productParams.set("utm_content", product.slug.replaceAll("-", "_"));
        return [
          `- ${product.name}: ${product.detail}`,
          `  ${product.specs}`,
          `  ${APP_URL}/it/prodotto/${product.slug}?${productParams.toString()}`,
        ];
      }),
      ...(usesHospitalityProducts
        ? [
            `Telo Lago: ${towelCollectionUrl}`,
            `Twilly Como: ${collectionUrl}`,
          ]
        : [`Collezione completa: ${collectionUrl}`]),
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
      "DOSSIER DI PARTNERSHIP",
      "Su richiesta predisponiamo selezione prodotti, line sheet, disponibilità, condizioni commerciali riservate, ipotesi di assortimento, materiali di presentazione e calendario operativo. La fase iniziale può essere impostata come progetto pilota, con verifica dei risultati e riassortimento mirato.",
      "",
      "Il primo confronto è finalizzato a verificare coerenza, applicazione, assortimento e condizioni dell’eventuale fase pilota.",
      `Sarei lieto di presentare il progetto a ${lead.company_name} in un incontro introduttivo riservato. In alternativa, possiamo trasmettere il dossier commerciale o predisporre una selezione campioni.`,
      "Per approfondire, è sufficiente rispondere a questa email.",
      "",
      "Cordiali saluti,",
      "Marco Di Benedetto",
      "Founder · SILKinCOM",
      "b2b@silkincom.com · https://www.silkincom.com/it/b2b",
      "",
      "Questa proposta è inviata a un contatto business pubblico ritenuto pertinente. Per non ricevere ulteriori comunicazioni, basta rispondere STOP.",
    ]
      .filter(Boolean)
      .join("\n"),
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
