# GEO + SEO Audit Report: SILKinCOM (re-audit)

**Audit Date:** 19 maggio 2026
**URL:** https://silkincom.vercel.app/
**Business Type:** E-commerce — accessori luxury in seta/cashmere, Made in Como (Next.js 15)
**Pages Analyzed:** ~22 (homepage, robots, sitemap, llms.txt, prodotti, collezioni, materiali, blog, contatti, faq, la-nostra-storia, artigiani — IT + EN/FR/DE campioni)

> Re-audit del sito Next.js dopo gli interventi i18n/SEO. Audit precedente: **57/100 Poor**.

---

## Executive Summary

**Overall GEO Score: 62/100 — Fair** (da 57 Poor)

Il sito è migliorato: contenuti tradotti e indicizzabili in 7 lingue, URL con prefisso locale, sitemap con hreflang, canonical aggiunto, schema solido. Citabilità AI e qualità contenuti salgono. Ma due regressioni critiche nel codice frenano il punteggio: **il canonical è corretto solo in italiano** — su EN/ES/FR/DE/PT/NL punta all'URL italiano, dicendo a Google che le 6 lingue sono duplicati (vanifica la migrazione multilingua). E la brand authority off-site resta a zero.

### Score Breakdown

| Categoria | Punteggio | Peso | Pesato | Δ vs 57 |
|---|---|---|---|---|
| AI Citability | 78/100 | 25% | 19.5 | +7 |
| Brand Authority | 15/100 | 20% | 3.0 | +1 |
| Content E-E-A-T | 64/100 | 20% | 12.8 | +6 |
| Technical GEO | 78/100 | 15% | 11.7 | +7 |
| Schema & Structured Data | 84/100 | 10% | 8.4 | +2 |
| Platform Optimization | 61/100 | 10% | 6.1 | +3 |
| **Overall GEO Score** | | | **62/100** | **+5** |

---

## Problemi Critici (Risolvere Subito)

### C1 — Canonical sbagliato su 6 lingue su 7
**Pagine:** tutte le pagine non-italiane (`/en/*`, `/es/*`, `/fr/*`, `/de/*`, `/pt/*`, `/nl/*`)

`/en/prodotto/bellagio` dichiara `<link rel="canonical" href="https://silkincom.vercel.app/prodotto/bellagio">` — punta all'URL **italiano**, non a sé stesso. Idem `/fr`, `/de` ecc. → la homepage IT è il canonical di tutte le lingue.

Causa: in `generateMetadata` il canonical è `/prodotto/${slug}` (path relativo senza prefisso locale); risolto contro `metadataBase` perde il segmento `/en`, `/fr`…

Effetto: Google tratta le 6 lingue tradotte come duplicati dell'italiano → **de-indicizzazione di 6 lingue su 7**. Annulla quasi del tutto la migrazione multilingua (C2) e tutto il lavoro di traduzione.

**Fix:** costruire canonical per-locale. In ogni `generateMetadata` includere il prefisso locale: per locale ≠ it → `/{locale}/prodotto/{slug}`; per it → `/prodotto/{slug}`. Vale per prodotti, collezioni, blog, pagine statiche, homepage.

### C2 — Schema @id su host sbagliato + LocalBusiness placeholder
- Organization/WebSite usano `@id: "https://silkincom.com/#organization"` / `#website` mentre tutto il resto (e il sito live) è su `silkincom.vercel.app` → identificatore d'entità incoerente.
- `/contatti` emette un **secondo** nodo LocalBusiness (`#atelier`) con indirizzo placeholder "Via dell'Atelier", telefono finto **`+39 031 0000000`**, email diversa da quella reale. Due business in conflitto + dati finti = rischio trust per Google/AI.

**Fix:** uniformare gli `@id` a `silkincom.vercel.app`; rimuovere il nodo `#atelier` (o riempirlo con dati reali). Mai pubblicare il telefono placeholder.

---

## Problemi Alta Priorità (entro 1 settimana)

### H1 — Nessun tag `<link rel="alternate" hreflang>` nell'`<head>`
Gli hreflang esistono solo in `sitemap.xml` e nell'header HTTP `Link:`. Mancano dai `<head>` delle pagine. Googlebot li onora via header, ma diversi crawler AI e i generatori di anteprime leggono solo l'HTML renderizzato. **Fix:** `metadata.alternates.languages` in `generateMetadata` → tag hreflang nel head.

### H2 — `og:locale` sempre `it_IT` + OG tag globali
Le pagine EN/FR servono `og:locale: it_IT` e `og:title`/`og:description`/`og:url` della homepage italiana. Anteprime social/AI in lingua sbagliata. **Fix:** mappare locale → `en_US`/`fr_FR`/… + `og:locale:alternate`; generare OG per pagina e locale.

### H3 — Brand inesistente off-site
Brand Authority 15/100. Zero Wikipedia/Wikidata/Reddit/LinkedIn/Trustpilot/stampa. Collisione di nome con competitor (INCOMO, Silk of Como, SILKSILKY, Creasilk, Larioseta) — l'AI cita i concorrenti. Tappo strutturale alla visibilità AI reale.

### H4 — Fondatore invisibile + nessun byline
Marco Dibenedetto solo in `llms.txt`, mai in HTML visibile. `/la-nostra-storia` ~280 parole (sotto soglia thin content). 4 blog post attribuiti a "SILKinCOM (Organization)", nessun autore umano. Leva E-E-A-T più forte, inutilizzata.

### H5 — Nessun ItemList/CollectionPage schema sulle 10 collezioni
`/collezioni/*` emette solo Organization+WebSite. Prodotti non enumerati per l'AI.

---

## Problemi Media Priorità (entro 1 mese)

- **M1 — `<title>` doppio suffisso:** `Bellagio — Cashmere | SILKinCOM | SILKinCOM` — il template `%s | SILKinCOM` si applica a un titolo che già finisce con "| SILKinCOM". Fix: togliere il suffisso dal titolo di pagina (lo aggiunge il template).
- **M2 — Article author = Organization** invece di Person (Marco Dibenedetto). Caratteri U+FEFF residui in headline/description di un post.
- **M3 — Incoerenza prezzo/dimensioni Bellagio:** homepage €120 / 180x45 cm, scheda prodotto €180 / 180x70 cm. Un fatto canonico per prodotto.
- **M4 — `Cache-Control: private, no-cache, no-store`** sulle pagine prodotto — disabilita la cache CDN, peggiora TTFB/LCP. Usare ISR/`s-maxage` sul catalogo.
- **M5 — Bing:** nessun `msvalidate.01`, nessun file IndexNow → Bing Copilot non accelerato.
- **M6 — H1 homepage decorativo/frammentato** ("lago_tessuta__a__Como" con underscore) — non citabile. Servono H1 semantico + H2 a domanda con paragrafi-risposta 40-60 parole.
- **M7 — Blog senza citazioni esterne** — nessun link ad autorità tessili / distretto serico / standard fibre.

## Problemi Bassa Priorità

- **L1 — `speakable`** assente su Article/FAQ.
- **L2 — `© 2026`** copyright statico — rendere dinamico.
- **L3 — sameAs solo 3 social** — aggiungere Wikidata, LinkedIn, Google Business.
- **L4 — Descrizioni prodotto corte** (~95 parole) — portare a 150+ con cura prodotto inline.
- **L5 — llms.txt** manca `llms-full.txt`.

---

## Category Deep Dives

### AI Citability — 78/100 (da 71)
SSR completo, contenuti estraibili. Passaggi citabili forti: guida materiali (micron seta 10-12μm, cashmere 14-16μm, assorbimento umidità) 88/100; scheda Bellagio (composizione, 180x70 cm, €180, codice) 82/100; checklist comparativa materiali 81/100. Deboli: heading homepage con underscore (~25/100). Multilingua aiuta la citabilità in lingue non-IT.

### Brand Authority — 15/100 (da 14)
Quasi invariato. Zero footprint terze parti. Collisione nome peggiore del previsto — le ricerche restituiscono Silk Maison, SILKSILKY, Creasilk. Senza ancora Wikipedia/Wikidata l'AI non può disambiguare il brand.

### Content E-E-A-T — 64/100 (da 58)
Experience 14/25, Expertise 16/25, Authoritativeness 15/25, Trust 19/25. Migliorato da: localizzazione 7 lingue, blog datato e approfondito (580-850 parole, dati tecnici), materiali strutturati. Gap: fondatore invisibile, zero byline, /la-nostra-storia thin, nessuna citazione esterna.

### Technical GEO — 78/100 (da 71)
Migliorato: SSR, routing locale path-prefix, sitemap 140+ URL con hreflang, security header eccellenti (HSTS, CSP, nosniff). Critico: canonical per-locale rotto (C1). Alto: hreflang non nel head, og:locale errato.

### Schema & Structured Data — 84/100 (da 82)
Forte e tutto server-rendered: Organization/LocalBusiness/WebSite+SearchAction, Product+Offer+BreadcrumbList, FAQPage (25 Q&A), Article. Difetti: @id host incoerente, LocalBusiness duplicato con placeholder, no ItemList collezioni, author=Organization.

### Platform Optimization — 61/100 (da 58)
Google AI Overviews 66, ChatGPT 67, Gemini 60, Bing Copilot 52, Perplexity 46. Multilingua + SSR + llms.txt aiutano ChatGPT/Gemini. Perplexity resta basso (zero community validation). Canonical e hreflang frenano AIO/Gemini.

---

## Quick Wins (questa settimana)

1. **Fix canonical per-locale** — includere il prefisso locale nel canonical di ogni `generateMetadata`. Sblocca l'indicizzazione di 6 lingue. Impatto massimo, una modifica di codice.
2. **hreflang nel `<head>`** — `metadata.alternates.languages` con tutti i locale + `x-default`.
3. **`og:locale` per locale** + OG title/description/url per pagina.
4. **Fix `<title>` doppio suffisso** — togliere "| SILKinCOM" dai titoli di pagina.
5. **Schema:** uniformare `@id` a `silkincom.vercel.app`, rimuovere LocalBusiness placeholder.
6. **Creare Wikidata entry** SILKinCOM (fondatore, P.IVA, sede Cermenate/Como).

## Piano 30 Giorni

### Settimana 1 — Fix SEO critici di codice
- [ ] Canonical per-locale su prodotti/collezioni/blog/pagine/homepage
- [ ] hreflang `<link>` nel head + `x-default`
- [ ] og:locale + OG per pagina/locale
- [ ] Titolo: rimuovere doppio suffisso

### Settimana 2 — Schema & dati
- [ ] Uniformare `@id` host; rimuovere nodo `#atelier` placeholder
- [ ] ItemList/CollectionPage sulle 10 collezioni
- [ ] Article author = Person (Marco Dibenedetto); pulire U+FEFF
- [ ] Riconciliare prezzo/dimensioni Bellagio

### Settimana 3 — Entity & autorità
- [ ] Wikidata + Google Business Profile + LinkedIn azienda
- [ ] Trustpilot + raccolta recensioni reali
- [ ] 3-5 menzioni terze (directory artigiane comasche, stampa moda IT)

### Settimana 4 — Contenuto
- [ ] Sezione fondatore visibile su /la-nostra-storia + Person schema (~600-800 parole)
- [ ] Byline autore sui 4 blog post + 2-4 citazioni esterne per post
- [ ] H1 homepage semantico + H2 a domanda
- [ ] Bing Webmaster + IndexNow
- [ ] ISR/cache sul catalogo

---

## Appendice — Pagine Analizzate

| URL | Note |
|---|---|
| / | SSR ok, H1 decorativo, OG globali |
| /prodotto/bellagio | canonical ok (IT), title doppio suffisso, Product schema valido |
| /en/prodotto/bellagio | **canonical → URL IT (critico)** |
| /collezioni/bellagio | nessun ItemList schema |
| /la-nostra-storia | ~280 parole, fondatore assente |
| /artigiani | 1 artigiano nominato, contenuto atmosferico |
| /materiali | contenuto tecnico forte e citabile |
| /faq | FAQPage schema valido (25 Q&A) |
| /contatti | LocalBusiness duplicato + placeholder telefono |
| /trame-di-como/* | Article schema, author=Organization, no byline, no fonti |
| robots.txt | crawler AI ammessi |
| sitemap.xml | 140+ URL, hreflang 7 locale |
| llms.txt | presente, valido, no llms-full.txt |

---

## Confronto Audit Precedente

| | Audit 1 (57) | Re-audit (62) |
|---|---|---|
| GEO Score | 57 Poor | **62 Fair** |
| Multilingua | cookie, 1 lingua indicizzabile | 7 lingue path-prefix + sitemap hreflang |
| Canonical | tutti → homepage | IT ok, 6 lingue ancora rotte |
| Contenuti | IT/EN | tradotti 7 lingue |
| Technical | 71 | 78 |
| Citability | 71 | 78 |

Progresso reale. Il blocco residuo: **fix canonical per-locale** (settimana 1) + **brand authority off-site** (lavoro continuativo).

---

*Report generato — GEO+SEO re-audit, 5 subagent specializzati (AI Visibility, Platform, Technical, Content E-E-A-T, Schema).*
