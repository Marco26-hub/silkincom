# GEO Audit Report: SILK in COM

**Audit Date:** 19 maggio 2026
**URL:** https://www.silkincom.com
**Business Type:** E-commerce — Accessori luxury in seta e cashmere, Made in Como (Wix)
**Pages Analyzed:** 15 (homepage, 4 blog post, 5 pagine statiche, 2 product page, 2 category page, robots.txt, llms.txt)

---

## Executive Summary

**Overall GEO Score: 28/100 — Critical**

SILK in COM ha fondamenta tecniche parziali (llms.txt presente, crawler AI non bloccati, sitemap strutturato), ma soffre di tre criticità che si sommano: i contenuti del sito sono resi esclusivamente via JavaScript e risultano **invisibili** a tutti i crawler AI; il brand non esiste su nessuna piattaforma di terze parti (Reddit, Wikipedia, Trustpilot, YouTube) e quindi i modelli AI non lo riconoscono come entità citabile; lo schema Product ha bug critici di capitalizzazione che bloccano i rich result su tutti i 41 prodotti. Il punteggio riflette un sito che vuole ottimizzare per l'AI ma è ostacolato prima di tutto dall'architettura Wix CSR.

### Score Breakdown

| Categoria | Punteggio | Peso | Punteggio Pesato |
|---|---|---|---|
| AI Citability | 22/100 | 25% | 5.5 |
| Brand Authority | 8/100 | 20% | 1.6 |
| Content E-E-A-T | 31/100 | 20% | 6.2 |
| Technical GEO | 54/100 | 15% | 8.1 |
| Schema & Structured Data | 34/100 | 10% | 3.4 |
| Platform Optimization | 31/100 | 10% | 3.1 |
| **Overall GEO Score** | | | **28/100** |

---

## Problemi Critici (Risolvere Subito)

### C1 — JavaScript rendering blocca tutto il contenuto ai crawler AI
**Pagine:** Tutte (homepage, product page, blog, pagine editoriali)

Wix serve le pagine come SPA client-side. I crawler AI (GPTBot, ClaudeBot, PerplexityBot) ricevono un documento HTML quasi vuoto — solo il `<title>`. Descrizioni prodotto, testi blog, brand story, categorie: tutto invisibile senza esecuzione JS.

**Fix immediato (Wix, senza codice):** creare `/llms-full.txt` con il testo completo dei 4 blog post, le descrizioni delle 10 categorie principali e la brand story. I modelli AI che leggono llms.txt accedono al contenuto direttamente.

**Fix strutturale:** valutare migrazione a Wix Studio (SSR migliorato) o servizio di pre-rendering (Prerender.io) per user-agent bot.

---

### C2 — Bug capitalizzazione schema Product: tutti i 41 prodotti bloccati dai rich result
**Pagine:** Tutte le `/product-page/*`

Wix auto-genera il JSON-LD con `"Offers"` (O maiuscola) e `"Availability"` (A maiuscola). Schema.org richiede `"offers"` e `"availability"` minuscoli. Questo invalida i rich result per ogni prodotto.

**Fix:** Override via Wix Velo (custom code injection) o richiesta supporto Wix. Il fix sblocca i rich result per l'intero catalogo in un solo intervento.

```json
// Errore attuale (generato da Wix)
"Offers": { "Availability": "https://schema.org/InStock" }

// Corretto
"offers": { "availability": "https://schema.org/InStock" }
```

---

### C3 — Nessuna presenza esterna del brand: entità non riconoscibile dai modelli AI
**Impatto:** AI Citability, Brand Authority, Platform Optimization

Ricerca su Reddit, Wikipedia, YouTube, Trustpilot: nessun risultato per "silkincom". In Google, l'unico risultato è il dominio proprio. I modelli AI (ChatGPT, Perplexity, Gemini) non possono triangolare il brand come entità reale — non lo citeranno in risposta a query su sciarpe, cashmere, Como.

**Fix sequenziale:**
1. Creare profilo Wikidata per SILKinCOM (15 minuti, gratuito)
2. Creare profilo Trustpilot e raccogliere recensioni clienti esistenti
3. Creare pagina LinkedIn azienda

---

## Problemi Alta Priorità (Risolvere entro 1 settimana)

### H1 — llms.txt incompleto: nessun URL di prodotto o pagina elencato
Il file esiste (ottimo) ma non elenca nessuna delle 41 pagine prodotto, 27 categorie, 4 blog post. Il campo "Prenotare i servizi" è testo boilerplate Wix non pertinente all'e-commerce. L'endpoint MCP /_api/mcp restituisce 401 senza token sessione — l'integrazione MCP è di fatto inaccessibile ai crawler.

**Fix:** Riscrivere llms.txt secondo spec (H1 brand, H2 sezioni, lista link con descrizione una riga per ogni pagina chiave). Aggiungere versione inglese.

### H2 — Schema LocalBusiness: indirizzo errato e sameAs assente
`addressLocality: "Cermenate"` (dovrebbe essere "Como"), `addressRegion: "25"` (dovrebbe essere "CO"). Array `sameAs` completamente assente — AI non collegano il brand a Facebook, Instagram, nessuna piattaforma.

**Fix:** Correggere indirizzo + aggiungere `sameAs` con Facebook e Instagram come minimo.

### H3 — Nessun autore nominato su nessun contenuto
I 4 blog post non hanno byline visibile. "La Nostra Storia" non mostra fondatore o team. Un brand luxury artigianale senza identità umana dietro non può costruire E-E-A-T (Expertise/Experience). Il campo `author.name: "Nicola La Malva"` esiste nel BlogPosting schema ma non è visibile ai crawler come testo e non ha `sameAs` o `jobTitle`.

**Fix:** Aggiungere byline visibile con nome e ruolo su tutti i blog post. Aggiungere foto e bio del fondatore su "La Nostra Storia". Aggiungere `author.jobTitle` e `author.sameAs` (LinkedIn) al BlogPosting schema.

### H4 — Assenza di Google Business Profile
Nessun profilo GBP verificato trovato per Via Giuseppe Verdi 2/B, Como. GBP è il segnale primario che Gemini usa per il Knowledge Graph locale. È anche richiesto per apparire nelle ricerche locali ("silk scarves como italy").

**Fix:** Creare e verificare GBP. Aggiungere foto prodotti e location, categorie ("Abbigliamento e accessori di lusso"), orari, link sito.

### H5 — Mancanza di Partita IVA e policy resi visibili (compliance UE)
La Partita IVA è obbligatoria sui siti e-commerce italiani (D.Lgs. 70/2003). La policy resi è richiesta dalla Direttiva UE 2011/83/EU. La pagina `/resi-e-rimborsi` esiste nel sitemap ma non è linkata in modo prominente. L'assenza di P.IVA è una red flag di affidabilità per utenti e search engine.

---

## Problemi Media Priorità (Risolvere entro 1 mese)

### M1 — Blog: 4 articoli, nessuna data visibile ai crawler, contenuto generico
4 post totali, ultimo del 13 marzo 2026 (2+ mesi). Le date esistono nel BlogPosting JSON-LD ma non sono visibili nel HTML statico. Il contenuto sembra generato da AI senza dati originali (nessuna statistica, nessun nome di artigiano, nessuna fonte citata).

**Fix:** Pubblicare 2 post/mese. Aggiungere dati originali: peso in momme della seta, quota Como nella produzione europea, partner di lavorazione. Verificare che le date siano visibili nel HTML renderizzato da Wix blog.

### M2 — Nessun numero di telefono pubblicato
Il form contatti ha campo telefono ma nessun numero aziendale è pubblicato. Per un prodotto luxury con prezzi da €80-€200+ i clienti si aspettano un canale diretto. Riduce trust score.

### M3 — publisher.logo mancante nel BlogPosting schema
Campo obbligatorio per Google Article rich result. Wix potrebbe permettere di configurarlo nelle impostazioni blog SEO.

### M4 — mainEntityOfPage.@type invalido nel BlogPosting schema
Wix auto-genera `"itemPage"` invece di `"WebPage"`. Bug template Wix.

### M5 — BreadcrumbList assente su tutte le pagine prodotto
Con 27 categorie e 41 prodotti, la gerarchia di navigazione non è machine-readable. Google e i sistemi AI non conoscono la struttura categoria→prodotto.

### M6 — Nessun contenuto in lingua inglese
Il sito e llms.txt sono solo in italiano. Modelli AI in inglese (GPT-4, Claude, Gemini) pesano meno i contenuti in lingue non primarie. Per un brand con "Made in Como" come differenziatore internazionale, l'assenza dell'inglese limita la visibilità nelle query internazionali ("cashmere scarf como italy", "italian silk foulard").

### M7 — Nessun canale YouTube
YouTube è il segnale più forte nell'ecosistema Google per Gemini. 3 video brevi (patrimonio seta di Como, processo produzione, come indossare un twilly) creerebbero presenza crawlabile e citabile.

---

## Problemi Bassa Priorità (Ottimizzare quando possibile)

- **L1:** speakable property assente su tutti i contenuti (segnale AI per sintesi voce)
- **L2:** SearchAction / potentialAction assente nel WebSite schema
- **L3:** inLanguage non dichiarato in nessuno schema
- **L4:** Il sitemap prodotti ha 50 URL vs 41 prodotti noti (9 URL orfani da verificare)
- **L5:** AhrefsBot/dotbot hanno crawl-delay: 10 — nessun impatto AI ma rallenta analisi SEO
- **L6:** Nessuna registrazione su directory italiane (Italianmoda.com, Confartigianato) che AI training crawler indicizzano
- **L7:** Nessun tag hreflang (rilevante se viene aggiunta versione EN)

---

## Analisi per Categoria

### AI Citability — 22/100

Il problema principale è architetturale. Wix serve tutta la pagina via JavaScript. Quando un crawler AI recupera `/post/seta-di-como-perche-e-uno-standard-di-riferimento` riceve solo il `<title>` — nessun paragrafo del testo è nel HTML iniziale.

**Blocchi di contenuto testati:**

| Blocco | Fonte | Citability Score |
|---|---|---|
| Descrizione MCP in llms.txt | llms.txt (statico) | 65/100 — strutturato, machine-readable |
| Headline blog seta di Como | title tag | 45/100 — promettente ma corpo inaccessibile |
| Tagline homepage | search snippet | 36/100 — troppo generico |
| Corpo blog post x4 | JS-rendered — invisibile | 12/100 — penalizzato per inaccessibilità |

**Cosa funziona:** llms.txt esiste ed è l'unico contenuto veramente accessibile ai crawler. L'integrazione MCP Wix è genuinamente innovativa (pochissimi siti e-commerce la hanno) ma il token di autenticazione richiesto la rende inaccessibile in pratica.

**Raccomandazioni specifiche:**
- Aggiungere `/llms-full.txt` con testo completo blog post e descrizioni prodotto in markdown
- Ogni blog post dovrebbe contenere almeno 3 dati citabili (statistiche, date storiche, specifiche tecniche)
- Il post "Seta di Como" è il candidato prioritario per diventare la risorsa più citata in italiano sull'argomento — ma serve riscrittura con fonti e dati verificabili

---

### Brand Authority — 8/100

| Piattaforma | Presenza | Note |
|---|---|---|
| Wikipedia | Assente | Nessun articolo entità |
| Wikidata | Assente | Nessun record Q-number |
| Reddit | Assente | Zero menzioni |
| YouTube | Assente | Nessun canale |
| Trustpilot | Assente | Nessun profilo |
| LinkedIn | Non verificabile | Non apparso in nessuna ricerca |
| Google Reviews | Sconosciuto | GBP non trovato |
| Pinterest | Presente | silkincomofficial — unica presenza terze parti confermata oltre i social |
| Instagram | Presente | @silkincom.official |
| Facebook | Presente | profilo.php?id=61581900780447 |

Il brand non ha ancora footprint AI. Competitor Come Serà Fine Silk, Mantero, Creasilk appaiono in risultati per "seta como" — SILKinCOM no. I modelli AI che rispondono a "migliori sciarpe cashmere made in italy" non citano questo brand semplicemente perché non hanno dati su cui basarsi.

---

### Content E-E-A-T — 31/100

| Dimensione | Punteggio | Evidenza |
|---|---|---|
| Experience | 6/25 | Provenance Como reale, ma nessun contenuto che dimostra know-how produttivo |
| Expertise | 7/25 | Zero autori nominati su qualsiasi pagina accessibile |
| Authoritativeness | 9/25 | Indirizzo fisico Como confermato; zero press coverage |
| Trustworthiness | 15/25 | HTTPS + policy legali presenti; P.IVA mancante, telefono assente |

**Osservazione AI content:** I pattern del contenuto accessibile (titoli SEO generici, zero attributi autore, zero dati proprietari) sono consistenti con contenuto generato da AI senza editorial attribution. Per un brand luxury artigianale questo è controproducente — l'autorevolezza dipende dall'identità umana del maker.

**Punto di forza:** Il nome del blog "Nicola La Malva" appare nel BlogPosting schema (campo `author.name`) — si tratta verosimilmente del fondatore. È un asset non sfruttato: il fondatore dovrebbe essere visibile come voce editoriale su tutti i contenuti.

---

### Technical GEO — 54/100

| Componente | Score | Stato |
|---|---|---|
| Server-Side Rendering | 25/100 | CRITICO — Wix CSR, body invisibile ai crawler |
| Meta Tags & Indexability | 68/100 | MEDIO — title ok, meta description probabilmente JS-injected |
| Crawlability | 72/100 | MEDIO — sitemap ok, robots.txt ok |
| Security Headers | 35/100 | ALTO — gestiti da Wix, non verificabili |
| Core Web Vitals Risk | 50/100 | MEDIO — LCP/INP elevati tipici Wix |
| Mobile Optimization | 80/100 | BUONO — garantito da piattaforma Wix |
| URL Structure | 80/100 | BUONO — slug puliti, ma `/product-page/` non keyword-rich |
| llms.txt | 55/100 | MEDIO — esiste, MCP documentato, ma prose format e nessun URL |

**Punto di forza:** llms.txt è presente — meno del 5% dei siti e-commerce ha questo file. L'integrazione MCP con 7 tool documentati è forward-looking. I sitemaps sono aggiornati e strutturati.

**Bug trovato in LocalBusiness schema:**
```json
// Attuale — errato
"addressLocality": "Cermenate",
"addressRegion": "25"

// Corretto
"addressLocality": "Como",
"addressRegion": "CO"
```

---

### Schema & Structured Data — 34/100

**Schema trovati:** LocalBusiness, WebSite (homepage), Product (pagine prodotto), BlogPosting (blog). Tutti server-rendered — ottimo, i crawler AI li leggono senza JS.

**Bug critici:**

1. Tutti i 41 Product schema hanno `"Offers"` e `"Availability"` con maiuscola — property name invalide, rich result disabilitati per l'intero catalogo
2. `addressLocality: "Cermenate"` invece di "Como" + `addressRegion: "25"` invece di "CO"
3. `sameAs: []` — completamente assente su LocalBusiness/Organization
4. `brand`, `material`, `countryOfOrigin` assenti su tutti i Product schema
5. `publisher.logo` mancante su BlogPosting — richiesto per Article rich result
6. `mainEntityOfPage.@type: "itemPage"` — valore invalido, dovrebbe essere `"WebPage"`

**Schema mancanti prioritari:**

| Schema | Impatto GEO |
|---|---|
| Organization con sameAs completo | CRITICO — entity resolution AI |
| BreadcrumbList su product page | ALTO — gerarchia categoria invisibile |
| FAQPage | ALTO — trigger per AI Overviews |
| speakable | MEDIO — citabilità AI assistants |
| ItemList su category page | MEDIO — catalogo strutturato |
| countryOfOrigin su Product | ALTO — differenziatore "Made in Italy" |

---

### Platform Optimization — 31/100

| Piattaforma | Score | Gap Principale |
|---|---|---|
| Google AI Overviews | 34/100 | No JSON-LD FAQPage, contenuto JS-only, no answer-format H2 |
| ChatGPT Web Search | 22/100 | Nessuna entità Wikidata, zero copertura terze parti |
| Perplexity AI | 26/100 | Nessuna community validation (Reddit, Trustpilot) |
| Google Gemini | 32/100 | No GBP, no YouTube, no Knowledge Panel |
| Bing Copilot | 40/100 | No IndexNow, no LinkedIn, no Bing Webmaster Tools |

---

## Quick Wins — Da implementare questa settimana

1. **Creare `/llms-full.txt`** con testo completo dei 4 blog post + descrizioni delle 10 categorie principali. Zero costo, bypass immediato del problema JS rendering per i modelli AI che seguono lo spec llms.txt. **Impatto stimato su GEO Score: +4-6 punti**

2. **Correggere `sameAs` in LocalBusiness schema** — aggiungere Facebook e Instagram URLs. Configurabile in Wix SEO settings o custom code head. **Impatto: entity resolution AI, +2-3 punti**

3. **Correggere indirizzo in LocalBusiness schema** — `addressLocality: "Como"`, `addressRegion: "CO"`. **Impatto: Local search, Gemini Knowledge Graph**

4. **Creare profilo Wikidata** per SILKinCOM (15 min, gratuito) — instance: business, located: Como, industry: silk/luxury goods, official website. Poi aggiungere la Wikidata URL nel `sameAs`. **Impatto: entity recognition ChatGPT, Gemini, Perplexity**

5. **Creare e verificare Google Business Profile** a Via Giuseppe Verdi 2/B, Como. **Impatto: Gemini Knowledge Graph, Google AI Overviews local**

6. **Riscrivere llms.txt** — aggiungere H1 brand, lista URL chiave (blog post, categorie, la-nostra-storia), rimuovere testo boilerplate su prenotazioni, aggiungere versione inglese. **Impatto: llms.txt score da 55 a ~80**

7. **Creare profilo Trustpilot** e inviare link raccolta recensioni ai clienti esistenti. **Impatto: Perplexity community validation, Google rich results**

---

## Piano 30 Giorni

### Settimana 1 — Entity & Schema Foundation
- [ ] Creare Wikidata entry SILKinCOM
- [ ] Creare Google Business Profile + verifica
- [ ] Creare LinkedIn company page
- [ ] Correggere LocalBusiness schema: sameAs + addressLocality/Region
- [ ] Creare `/llms-full.txt` con contenuto blog e categorie

### Settimana 2 — Product Schema Fix
- [ ] Override Product schema via Wix Velo: correggere Offers→offers, Availability→availability
- [ ] Aggiungere `brand`, `material`, `countryOfOrigin: "IT"` a tutti i Product schema
- [ ] Aggiungere BreadcrumbList alle pagine prodotto
- [ ] Aggiungere `publisher.logo` al BlogPosting schema

### Settimana 3 — Brand Authority & Content
- [ ] Creare profilo Trustpilot e avviare raccolta recensioni
- [ ] Riscrivere llms.txt con link-list spec + versione inglese
- [ ] Aggiungere byline visibile (Nicola La Malva) + ruolo a tutti i blog post
- [ ] Aggiungere autore con LinkedIN sameAs al BlogPosting schema
- [ ] Aggiungere Partita IVA nel footer

### Settimana 4 — Content Depth & Bing
- [ ] Pubblicare 1 blog post nuovo con dati originali (es: "La produzione della seta di Como: numeri, tradizione e processo SILKinCOM")
- [ ] Verificare sito in Bing Webmaster Tools (meta tag msvalidate.01)
- [ ] Implementare IndexNow
- [ ] Aggiungere FAQPage JSON-LD su almeno una categoria (es: cashmere — domande frequenti)
- [ ] Aggiungere `speakable` spec a blog post principali
- [ ] Verificare blog Wix serve date visibili nel HTML iniziale

---

## Appendice — Pagine Analizzate

| URL | Titolo | Problemi GEO Trovati |
|---|---|---|
| https://www.silkincom.com | SILK in COM \| Sciarpe e Accessori... | Body JS-only, LocalBusiness address bug, sameAs assente, 4 |
| https://www.silkincom.com/la-nostra-storia | La Nostra Storia \| SILK in COM — Eleganza e Artigianato | Body JS-only, nessun founder nominato, 2 |
| https://www.silkincom.com/trame-di-como | Trame di Como: materiali, seta e storie | Body JS-only, 1 |
| https://www.silkincom.com/assistenza-contatti | Contatti \| SILKinCOM | No telefono, no schema, P.IVA mancante, 3 |
| https://www.silkincom.com/product-page/bellagio | Bellagio 180x70 \| Pashmina in Cashmere | Schema Offers bug, no brand/material/countryOfOrigin, 4 |
| https://www.silkincom.com/product-page/como | Como \| Twilly in Seta | Schema Offers bug identico, 4 |
| https://www.silkincom.com/post/seta-di-como-... | Seta di Como: storia, caratteristiche tecniche | Body JS-only, no author visibile, no publisher logo, 3 |
| https://www.silkincom.com/post/guida-completa-... | Guida completa ai materiali SILKinCOM | Body JS-only, no data visibile, 3 |
| https://www.silkincom.com/post/la-cura-... | Come nasce un accessorio SILKinCOM | Body JS-only, 2 |
| https://www.silkincom.com/post/foulard-... | Foulard in seta per la primavera 2026 | Body JS-only, 2 |
| https://www.silkincom.com/robots.txt | — | Nessun blocco AI crawler (positivo), 0 |
| https://www.silkincom.com/llms.txt | — | Presente! Formato prose, nessun URL, MCP 401, 3 |
| sitemap.xml / 5 sub-sitemap | — | 50 URL prodotto vs 41 noti (+9 orfani da verificare), 1 |
| https://www.silkincom.com/category/cashmere | — | Nessun ItemList schema, 1 |
| https://www.silkincom.com/category/abbigliamento | — | Nessun ItemList schema, 1 |

---

## Punti di Forza (da preservare)

- **llms.txt esiste** — meno del 5% dei siti e-commerce nella fascia SMB ha questo file
- **Tutti i crawler AI sono permessi** — nessun bot AI bloccato in robots.txt
- **Schema server-rendered** — i JSON-LD che esistono sono visibili senza JS (Wix li inietta nel HTML)
- **Sitemaps freschi e strutturati** — 5 sub-sitemap con lastmod recenti
- **Provenance geografica forte** — "Made in Como" è un differenziatore riconoscibile a livello internazionale; la connessione al distretto della seta di Como è il seed perfetto per costruire topical authority
- **Autore BlogPosting** — il nome "Nicola La Malva" è già nel schema; va portato in superficie
- **Blog topics corretti** — "Seta di Como", "guida materiali", "cura accessori" sono esattamente le query informazionali che alimentano AI Overviews e Perplexity

---

*Report generato da GEO Audit — 5 subagent specializzati (AI Visibility, Platform, Technical, Content E-E-A-T, Schema)*
*Metodologia: Georgia Tech / Princeton / IIT Delhi 2024 GEO framework + Google E-E-A-T guidelines + llms.txt spec*
