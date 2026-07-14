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
  source: 'google_cse';
};

export const LEAD_OUTREACH_FOCUS_VALUES = [
  'hospitality',
  'bed_breakfast',
  'hotel_boutique',
  'resort_beach_club',
  'spa_wellness',
  'wedding_events',
  'corporate_gifting',
  'concept_store',
  'museum_bookshop',
  'yacht_golf_club',
  'personal_shopper',
  'interior_architect',
  'tour_operator_luxury',
  'retail',
  'gifting',
  'wholesale',
] as const;

export type LeadOutreachFocus = typeof LEAD_OUTREACH_FOCUS_VALUES[number];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\d\s()./-]{6,}\d)/g;
const CONTACT_KEYWORDS = [
  'contact',
  'contacts',
  'contact-us',
  'contatti',
  'contatto',
  'about',
  'chi-siamo',
  'impressum',
  'info',
  'booking',
  'prenotazioni',
  'reservation',
  'reservations',
  'sales',
  'commercial',
  'partnership',
];

export function normalizeLeadUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
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
    const email = decodeURIComponent(match[1]).replace(/\?.*$/, '').trim();
    if (EMAIL_RE.test(email)) emails.add(email.toLowerCase());
    EMAIL_RE.lastIndex = 0;
  }
  const directMatches = html.match(EMAIL_RE) || [];
  for (const email of directMatches) emails.add(email.toLowerCase());
  return [...emails];
}

function extractPhones(html: string): string[] {
  const phones = new Set<string>();
  for (const match of html.matchAll(PHONE_RE)) {
    const phone = match[0].replace(/\s+/g, ' ').trim();
    if (phone.length >= 8) phones.add(phone);
  }
  return [...phones];
}

function extractCandidateLinks(html: string, baseUrl: string): string[] {
  const origin = toOrigin(baseUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const label = match[2].replace(/<[^>]+>/g, ' ').toLowerCase();
    const candidate = absoluteUrl(baseUrl, href);
    if (!candidate) continue;
    if (!candidate.startsWith(origin)) continue;
    if (CONTACT_KEYWORDS.some((keyword) => href.toLowerCase().includes(keyword) || label.includes(keyword))) {
      links.add(candidate);
    }
  }
  return [...links].slice(0, 4);
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'SILKinCOM Lead Discovery/1.0 (+https://silkincom.com)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreLead(params: { emails: string[]; phones: string[]; hasContactPage: boolean; title: string | null; industry?: string }) {
  let score = 10;
  if (params.emails.length > 0) score += 45;
  if (params.phones.length > 0) score += 10;
  if (params.hasContactPage) score += 15;
  if (params.title) score += 5;
  if (params.industry === 'hospitality') score += 5;
  return Math.min(100, score);
}

export async function discoverLeadFromWebsite(url: string, options: DiscoveryOptions = {}): Promise<DiscoveredContact> {
  const normalizedUrl = normalizeLeadUrl(url);
  if (!normalizedUrl) {
    throw new Error(`URL non valido: ${url}`);
  }

  const homepage = await fetchHtml(normalizedUrl);
  if (!homepage) {
    throw new Error(`Impossibile leggere il sito: ${normalizedUrl}`);
  }

  const candidatePages = extractCandidateLinks(homepage, normalizedUrl);
  const pages = [normalizedUrl, ...candidatePages].slice(0, 4);
  const visited = new Set<string>();
  const allEmails = new Set<string>();
  const allPhones = new Set<string>();
  let contactPage: string | null = candidatePages[0] || null;
  let title: string | null = extractMatch(homepage, /<title[^>]*>([\s\S]*?)<\/title>/i);
  let siteName: string | null = extractMatch(homepage, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  let city: string | null = extractMatch(homepage, /<meta[^>]+name=["']geo\.locality["'][^>]+content=["']([^"']+)["']/i);
  let country: string | null = extractMatch(homepage, /<meta[^>]+name=["']geo\.country["'][^>]+content=["']([^"']+)["']/i);

  for (const page of pages) {
    if (visited.has(page)) continue;
    visited.add(page);
    const html = page === normalizedUrl ? homepage : await fetchHtml(page);
    if (!html) continue;
    const emails = extractEmails(html);
    const phones = extractPhones(html);
    emails.forEach((email) => allEmails.add(email));
    phones.forEach((phone) => allPhones.add(phone));
    if (!title) {
      title = extractMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    }
    if (!siteName) {
      siteName = extractMatch(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
    }
    if (!contactPage) {
      const candidates = extractCandidateLinks(html, normalizedUrl);
      contactPage = candidates[0] || null;
    }
    if (!city) {
      city = extractMatch(html, /<meta[^>]+name=["']addressLocality["'][^>]+content=["']([^"']+)["']/i);
    }
    if (!country) {
      country = extractMatch(html, /<meta[^>]+name=["']addressCountry["'][^>]+content=["']([^"']+)["']/i);
    }
  }

  const cleanTitle = title?.replace(/\s*\|\s*.*$/, '').trim() || null;
  const companyName = siteName || cleanTitle || new URL(normalizedUrl).hostname.replace(/^www\./, '');
  const emails = [...allEmails];
  const phones = [...allPhones];

  return {
    company_name: companyName,
    website_url: normalizedUrl,
    source_url: normalizedUrl,
    public_contact_page: contactPage,
    contact_email: emails[0] || null,
    contact_phone: phones[0] || null,
    city: city || null,
    country: country || null,
    notes: options.notes?.trim() || '',
    discovery_query: options.query?.trim() || null,
    score: scoreLead({ emails, phones, hasContactPage: Boolean(contactPage), title: cleanTitle, industry: options.industry }),
  };
}

export async function searchLeadCandidates(params: {
  query: string;
  location?: string;
  maxResults?: number;
}): Promise<SearchLeadCandidate[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !searchEngineId) {
    throw new Error('Configura GOOGLE_SEARCH_API_KEY e GOOGLE_CSE_ID per abilitare la ricerca live.');
  }

  const liveQuery = [params.query, params.location].filter(Boolean).join(' ');
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', searchEngineId);
  url.searchParams.set('q', liveQuery);
  url.searchParams.set('num', String(Math.min(params.maxResults || 6, 10)));
  url.searchParams.set('safe', 'active');

  const response = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ricerca live non riuscita (${response.status}): ${body.slice(0, 180)}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items
    .map((item: any) => ({
      title: String(item.title || '').trim(),
      link: String(item.link || '').trim(),
      snippet: String(item.snippet || '').trim(),
      source: 'google_cse' as const,
    }))
    .filter((item: SearchLeadCandidate) => Boolean(normalizeLeadUrl(item.link)));
}

function buildFocusCopy(focus: LeadOutreachFocus) {
  switch (focus) {
    case 'bed_breakfast':
      return {
        subject: 'Una proposta SILKinCOM per il vostro B&B di charme',
        eyebrow: 'B&B charme · Guest experience',
        intro: 'Vi proponiamo una selezione semplice e premium per B&B, relais e dimore di charme che vogliono aumentare il valore dell’esperienza ospite.',
        angle: 'Per strutture intime, pochi prodotti giusti possono generare vendite naturali: un foulard, una pashmina o un piccolo gift diventano ricordo del soggiorno e racconto del territorio.',
        products: ['foulard in seta come souvenir alto', 'pashmine cashmere per ospiti e camere premium', 'gift set leggeri per welcome experience'],
        cta: 'Possiamo inviarvi una proposta essenziale con minimi sostenibili, listino riservato e prodotti facili da esporre.',
      };
    case 'hotel_boutique':
      return {
        subject: 'Una capsule SILKinCOM per la vostra boutique',
        eyebrow: 'Maison capsule · Boutique hospitality',
        intro: 'Vi proponiamo una capsule selettiva per boutique hotel, resort shop e corner d’accoglienza.',
        angle: 'Una selezione Made in Como che può diventare acquisto d’impulso premium, souvenir elegante o regalo dedicato agli ospiti più importanti.',
        products: ['foulard in seta per gifting e boutique', 'sciarpe e pashmine in cashmere', 'camicie in lino per resort e leisurewear'],
        cta: 'Possiamo inviarvi una selezione iniziale con listino riservato e proposta visual per il vostro spazio.',
      };
    case 'resort_beach_club':
      return {
        subject: 'Una selezione resortwear Made in Como per la vostra clientela',
        eyebrow: 'Resortwear · Beach club · Luxury travel',
        intro: 'Stiamo curando collaborazioni con luoghi di villeggiatura e club dove il prodotto deve essere immediato, leggero e memorabile.',
        angle: 'SILKinCOM può accompagnare la stagione con accessori e capi facili da esporre, adatti a boutique di resort, beach club e destinazioni lifestyle.',
        products: ['foulard seta leggeri per viaggio e serate', 'camicie lino e cotone per resortwear', 'pashmine cashmere per evening e yacht'],
        cta: 'Se ha senso per la vostra stagione, prepariamo una proposta rapida con prodotti, margini e tempi di consegna.',
      };
    case 'spa_wellness':
      return {
        subject: 'Una proposta SILKinCOM per spa, wellness e rituali premium',
        eyebrow: 'Wellness gifting · Spa retail',
        intro: 'Per spa e luoghi wellness proponiamo accessori tattili, naturali e coerenti con un’esperienza di cura alta.',
        angle: 'Cashmere, seta, lino e lana raccontano comfort e quiet luxury: ideali per gift corner, pacchetti wellness e upgrade per ospiti VIP.',
        products: ['pashmine cashmere per rituali e relax', 'foulard seta per gifting raffinato', 'selezioni regalo con packaging maison'],
        cta: 'Possiamo preparare una selezione per gift corner o pacchetti ospite con minimi sostenibili.',
      };
    case 'wedding_events':
      return {
        subject: 'Gift e dettagli Made in Como per eventi e wedding di fascia alta',
        eyebrow: 'Wedding · Event gifting',
        intro: 'Vi proponiamo una linea di accessori premium per eventi, wedding, welcome gift e ospiti internazionali.',
        angle: 'Il valore è nel dettaglio: materiali nobili, packaging elegante e prodotti facili da personalizzare in selezioni dedicate.',
        products: ['foulard in seta come cadeau ospite', 'pashmine per cerimonie e serate', 'gift set corporate o wedding con nota dedicata'],
        cta: 'Possiamo inviare una proposta per budget, quantità e timing del prossimo evento.',
      };
    case 'corporate_gifting':
      return {
        subject: 'Corporate gifting premium Made in Como',
        eyebrow: 'Corporate gifting · Executive clients',
        intro: 'SILKinCOM propone regali aziendali premium per clienti importanti, board, partner e hospitality business.',
        angle: 'Un dono tessile Made in Como ha percezione alta, uso reale e una narrazione più elegante del gadget tradizionale.',
        products: ['foulard seta per clienti VIP', 'pashmine cashmere per executive gift', 'packaging e biglietto dedicato alla vostra maison'],
        cta: 'Possiamo preparare una griglia per budget, quantità e personalizzazione leggera.',
      };
    case 'concept_store':
      return {
        subject: 'Una proposta SILKinCOM per il vostro concept store',
        eyebrow: 'Concept store · Curated retail',
        intro: 'Abbiamo selezionato una proposta per store curati che cercano prodotti con storia, materiali nobili e rotazione agile.',
        angle: 'SILKinCOM unisce accessibilità selettiva e racconto di filiera comasca: ideale per corner moda, lifestyle e gifting.',
        products: ['foulard seta come entry luxury', 'sciarpe cashmere come prodotto continuativo', 'camicie lino/cotone per capsule stagionali'],
        cta: 'Se vi interessa, inviamo line sheet e selezione consigliata per primo ordine.',
      };
    case 'museum_bookshop':
      return {
        subject: 'Accessori Made in Como per bookshop e spazi culturali',
        eyebrow: 'Culture retail · Museum shop',
        intro: 'Per bookshop, fondazioni e spazi culturali proponiamo accessori tessili con forte valore narrativo e gifting.',
        angle: 'Seta e Como dialogano bene con cultura, viaggio e memoria: una proposta elegante per visitatori e clienti internazionali.',
        products: ['foulard in seta come souvenir alto', 'gift set con storytelling maison', 'capsule colore coerenti con mostre o stagioni'],
        cta: 'Possiamo condividere una proposta editoriale/prodotto pensata per il vostro pubblico.',
      };
    case 'yacht_golf_club':
      return {
        subject: 'Una selezione SILKinCOM per club privati e ospiti premium',
        eyebrow: 'Private clubs · Yacht · Golf',
        intro: 'Stiamo proponendo capsule tessili per club privati, yacht club, golf club e luoghi dove il gifting deve restare discreto e alto.',
        angle: 'Prodotti leggeri, nobili e facili da acquistare o regalare, con una presenza elegante in boutique e pro shop.',
        products: ['pashmine cashmere per club e travel', 'foulard seta per gifting soci', 'camicie lino per capsule leisure'],
        cta: 'Possiamo inviare una selezione club con quantità contenute e packaging dedicato.',
      };
    case 'personal_shopper':
      return {
        subject: 'Una selezione SILKinCOM per clienti privati e styling',
        eyebrow: 'Personal shopping · Private client',
        intro: 'Vi proponiamo SILKinCOM come selezione accessori per clienti privati, styling, guardaroba viaggio e gifting.',
        angle: 'Foulard, cashmere e lino permettono proposte eleganti, trasversali e facili da inserire in consulenze moda di fascia alta.',
        products: ['foulard seta per styling e colore', 'pashmine cashmere per guardaroba viaggio', 'camicie lino/cotone per capsule estive'],
        cta: 'Possiamo preparare una selezione privata con prodotti consigliati e condizioni dedicate.',
      };
    case 'interior_architect':
      return {
        subject: 'Textile gifting Made in Como per progetti hospitality e interior',
        eyebrow: 'Interior · Hospitality procurement',
        intro: 'Per studi interior e architettura proponiamo accessori tessili premium da integrare in progetti hospitality, suite e gift experience.',
        angle: 'Un prodotto tessile selezionato completa il racconto dello spazio: non arredo, ma gesto finale di accoglienza.',
        products: ['pashmine cashmere per suite e VIP gift', 'foulard seta per welcome experience', 'selezioni colore coordinate al progetto'],
        cta: 'Possiamo condividere una proposta per progetto, palette e budget.',
      };
    case 'tour_operator_luxury':
      return {
        subject: 'Welcome gift Made in Como per viaggi luxury',
        eyebrow: 'Luxury travel · Concierge gifting',
        intro: 'SILKinCOM può diventare un welcome gift o una proposta concierge per viaggiatori premium in Italia e sul Lago di Como.',
        angle: 'Un accessorio Made in Como crea memoria del viaggio e aumenta il valore percepito dell’esperienza.',
        products: ['foulard seta per welcome gift', 'pashmine cashmere per itinerari serali', 'gift set viaggio con packaging maison'],
        cta: 'Possiamo preparare una proposta per itinerari, gruppi privati e clienti VIP.',
      };
    case 'retail':
      return {
        subject: 'Una proposta per la vostra boutique firmata SILKinCOM',
        eyebrow: 'Boutique retail · Premium accessories',
        intro: 'Abbiamo selezionato una proposta adatta a boutique indipendenti, spazi retail selettivi e corner di stile.',
        angle: 'Una linea Made in Como con materiali nobili, buon racconto prodotto e assortimento agile tra seta, cashmere e lino.',
        products: ['foulard in seta', 'sciarpe e pashmine in cashmere', 'camicie in lino e cotone'],
        cta: 'Possiamo inviarvi line sheet e selezione consigliata per primo ordine.',
      };
    case 'gifting':
      return {
        subject: 'Una proposta per gifting e ospitalità firmata SILKinCOM',
        eyebrow: 'Gifting · Hospitality amenities',
        intro: 'Lavoriamo su piccoli lotti e selezioni premium pensate per ospitalità, regali aziendali e clienti VIP.',
        angle: 'Il regalo diventa memorabile quando è utile, tattile e racconta una provenienza autentica.',
        products: ['foulard seta per cadeau', 'pashmine cashmere per VIP gift', 'packaging e biglietto dedicato'],
        cta: 'Possiamo preparare una proposta per budget e quantità con tempi rapidi.',
      };
    case 'wholesale':
      return {
        subject: 'Proposta di collaborazione wholesale con SILKinCOM',
        eyebrow: 'Wholesale · B2B selection',
        intro: 'Se cercate una fornitura affidabile di accessori Made in Como, possiamo preparare una selezione dedicata.',
        angle: 'La proposta è pensata per partner che vogliono un assortimento premium senza complessità: materiali chiari, schede prodotto, margini e riordini.',
        products: ['seta come entry luxury', 'cashmere come continuativo alto', 'lino/cotone per capsule stagionali'],
        cta: 'Possiamo inviare condizioni wholesale e campionario iniziale.',
      };
    default:
      return {
        subject: 'Una proposta di collaborazione per la vostra struttura',
        eyebrow: 'Hospitality · Maison collaboration',
        intro: 'Stiamo proponendo una selezione di accessori e capi Made in Como per hospitality, accoglienza e boutique interne.',
        angle: 'L’obiettivo è trasformare l’esperienza dell’ospite in vendita naturale: prodotto bello, facile da capire, coerente con un contesto premium.',
        products: ['foulard in seta per boutique e gifting', 'pashmine cashmere per suite e ospiti VIP', 'camicie lino/cotone per resortwear'],
        cta: 'Possiamo preparare una proposta riservata con prodotti, margini e selezione campioni.',
      };
  }
}

export function buildLeadOutreachCopy(
  lead: { company_name: string; city?: string | null; country?: string | null; contact_name?: string | null; website_url: string },
  focus: LeadOutreachFocus,
  notes = '',
) {
  const focusCopy = buildFocusCopy(focus);
  const greeting = lead.contact_name ? `Gentile ${lead.contact_name},` : 'Gentile team,';
  const location = [lead.city, lead.country].filter(Boolean).join(' - ');
  const noteBlock = notes.trim() ? `<p style="margin:16px 0 0 0;">${escapeHtml(notes.trim())}</p>` : '';
  const productsHtml = focusCopy.products
    .map((product) => `<li style="margin:0 0 8px 0;">${escapeHtml(product)}</li>`)
    .join('');
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
      <p style="font-size:15px;line-height:1.75;color:#4A443C;margin:0 0 12px 0;">Per ${escapeHtml(lead.company_name)}${location ? `, ${escapeHtml(location)}` : ''} immaginiamo una selezione molto concreta:</p>
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
      '',
      `SILKinCOM · ${focusCopy.eyebrow}`,
      '',
      focusCopy.intro,
      '',
      `SILKinCOM disegna e confeziona accessori e capi in seta, cashmere, lino, lana e cotone nel distretto tessile di Como.`,
      focusCopy.angle,
      `Possiamo preparare una proposta dedicata per ${lead.company_name}${location ? `, ${location}` : ''}.`,
      '',
      'Prodotti suggeriti:',
      ...focusCopy.products.map((product) => `- ${product}`),
      notes.trim() ? `Note: ${notes.trim()}` : null,
      '',
      focusCopy.cta,
      '',
      'Per non ricevere ulteriori messaggi, basta rispondere “stop”.',
      `Sito: ${lead.website_url}`,
    ].filter(Boolean).join('\n'),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
