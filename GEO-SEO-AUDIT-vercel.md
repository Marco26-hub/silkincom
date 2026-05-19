# GEO + SEO Audit Report: SILKinCOM (sito Next.js)

**Audit Date:** 19 maggio 2026
**URL:** https://silkincom.vercel.app/
**Business Type:** E-commerce — accessori luxury in seta e cashmere, Made in Como (Next.js 15, Vercel)
**Pages Analyzed:** 20 (homepage, robots.txt, sitemap, llms.txt, /la-nostra-storia, /artigiani, /materiali, /contatti, /faq, 2 blog post, 3 product page, 2 collection page + altri)

> Nota: questo audit riguarda il **sito ricostruito su Next.js** (silkincom.vercel.app), non il Wix silkincom.com analizzato nel report precedente.

---

## Executive Summary

**Overall GEO Score: 57/100 — Poor (fascia alta)**

Il sito Next.js è tecnicamente molto più solido del Wix (28/100): rendering server-side completo, schema JSON-LD ricco e valido, llms.txt presente, tutti i crawler AI ammessi, security header eccellenti. Tre problemi però affossano il punteggio: due bug SEO critici nel codice (canonical dei prodotti che punta alla homepage; le 7 lingue servite sullo stesso URL via cookie, invisibili ai crawler), e l'assenza totale di footprint del brand fuori dal sito (nessun Wikipedia/Wikidata/Reddit/Trustpilot/recensioni).

### Score Breakdown

| Categoria | Punteggio | Peso | Pesato |
|---|---|---|---|
| AI Citability | 71/100 | 25% | 17.8 |
| Brand Authority | 14/100 | 20% | 2.8 |
| Content E-E-A-T | 58/100 | 20% | 11.6 |
| Technical GEO | 71/100 | 15% | 10.7 |
| Schema & Structured Data | 82/100 | 10% | 8.2 |
| Platform Optimization | 58/100 | 10% | 5.8 |
| **Overall GEO Score** | | | **57/100** |

---

## Problemi Critici (Risolvere Subito)

### C1 — Canonical dei prodotti punta alla homepage
**Pagine:** tutte le 41 `/prodotto/*`

`/prodotto/bellagio` dichiara `<link rel="canonical" href="https://silkincom.vercel.app">`. Dice a Google che ogni pagina prodotto è un duplicato della homepage → tutti i 41 prodotti verranno **deindicizzati** e non si posizioneranno mai. La homepage ha invece canonical corretto (self-referencing). Bug di metadata per-route.

**Fix:** generare canonical self-referencing per ogni pagina. In `prodotto/[slug]/page.tsx` `generateMetadata`, aggiungere `alternates: { canonical: \`/prodotto/${slug}\` }`. Verificare anche collezioni e blog.

### C2 — 6 lingue su 7 invisibili ai motori di ricerca
**Causa:** `localePrefix: 'never'` + locale via cookie `NEXT_LOCALE`

Tutte e 7 le lingue (it/en/es/fr/de/pt/nl) sono servite sullo **stesso URL**, cambiate solo dal cookie. Crawler e bot AI non inviano cookie → vedono **solo l'italiano**. Conseguenze:
- Nessuna pagina EN/ES/FR/DE/PT/NL indicizzabile esiste — solo `it` viene scansionata
- `hreflang` strutturalmente impossibile (nessun URL per-lingua a cui puntare)
- **Tutto il lavoro di traduzione inglese è invisibile** a Google, ChatGPT, Perplexity

Per un e-commerce luxury con clientela internazionale, annulla ~85% del valore SEO/GEO multilingua.

**Fix:** migrare a locale con prefisso path (`/en/`, `/fr/...`) o sottodomini; aggiungere `hreflang` reciproci + `x-default`; rigenerare sitemap con alternate `<xhtml:link>` per locale.

### C3 — Brand inesistente fuori dal sito
**Impatto:** Brand Authority 14/100, Platform 58/100

Nessun risultato per "silkincom" su Wikipedia, Wikidata, Reddit, Trustpilot, YouTube, LinkedIn, stampa, directory di settore. I modelli AI non hanno fonti terze per riconoscere "SILKinCOM" come entità. Aggravante: il nome collide con competitor dello stesso settore comasco (INCOMO, Silk of Como, SILKSILKY) — il retrieval AI rischia di citare i concorrenti.

**Fix sequenziale:** Wikidata entry → Google Business Profile (Cermenate/Como) → LinkedIn azienda → Trustpilot → menzioni su directory tessili comasche.

### C4 — Dominio preview Vercel, non dominio brand
Il sito gira su `silkincom.vercel.app` (dominio preview, segnala non-produzione). Lo schema usa `@id: "https://silkincom.com/#organization"` mentre tutto il resto usa `vercel.app` → grafo entità rotto, `publisher` non risolve. Inoltre `silkincom.com` è ancora il vecchio sito Wix: autorità e link si frammentano su due domini.

**Fix:** decidere dominio canonico unico, migrare il Next.js su `silkincom.com`, 301 dal vecchio, uniformare canonical/schema `@id`/llms.txt/sitemap.

---

## Problemi Alta Priorità (entro 1 settimana)

### H1 — Nessun hreflang
7 locale, zero tag `hreflang` (impossibili finché C2 non è risolto). Anche `og:locale` è hardcoded `it_IT` senza `og:locale:alternate` → condivisioni social in lingua non-IT mostrano metadata italiani.

### H2 — Widget recensioni vuoto su tutti i 41 prodotti
Ogni prodotto mostra "Sii il primo a recensire" — zero recensioni. Manca quindi `AggregateRating`/`Review` nello schema Product → niente stelle nei rich result, niente social proof per Perplexity. La promessa di social proof non mantiene nulla.

**Fix:** raccogliere recensioni reali (anche via Trustpilot/Google), poi emettere `aggregateRating` nello schema. Finché vuoto, valutare di nascondere il widget.

### H3 — Schema @id host non uniforme + LocalBusiness duplicato
- Organization/WebSite usano `@id` su `silkincom.com`, tutto il resto su `vercel.app` → riferimenti del grafo rotti
- `/contatti` emette un secondo nodo LocalBusiness (`#atelier`) con indirizzo DIVERSO ("Via dell'Atelier") e telefono placeholder `+39 031 0000000` vs l'Organization globale ("Via Giuseppe Verdi 2/B")

**Fix:** uniformare tutti gli `@id` a un solo host; un solo indirizzo reale; rimuovere placeholder.

### H4 — Founder invisibile + nessun byline
Marco Dibenedetto (fondatore) compare **solo in llms.txt**, mai in pagine HTML visibili. Nessun byline sui 4 blog post. Per un brand luxury artigianale l'identità umana è cardine dell'E-E-A-T.

**Fix:** sezione fondatore su `/la-nostra-storia` con foto, bio, background tessile comasco + Person schema. Byline autore sui blog post.

---

## Problemi Media Priorità (entro 1 mese)

- **M1 — P.IVA incoerente:** homepage `03786590133` vs llms.txt `03786790133`. Verificare quella corretta e uniformare ovunque.
- **M2 — `<title>` vuoto duplicato:** un `<title></title>` vuoto coesiste col title corretto (conflitto layout + page metadata). Risolvere.
- **M3 — Meta description prodotti = dump troncato:** "Composizione: 100% cashmere Dimensioni..." invece di copy 150-160 caratteri scritto apposta.
- **M4 — `og:type` prodotti = `website`:** dovrebbe essere `product`.
- **M5 — Sitemap 119 URL vs 72 attesi:** verificare URL stale/orfani. `lastmod` tutti su data futura clusterizzata (2026-05-19) — usare date reali.
- **M6 — Nessun ItemList/CollectionPage schema** sulle 10 pagine `/collezioni/*`.
- **M7 — BreadcrumbList** solo sui prodotti — manca su collezioni e blog.
- **M8 — Blog senza fonti esterne:** i post sintetizzano conoscenza nota, zero citazioni o dati originali.
- **M9 — No Bing Webmaster (`msvalidate.01`) né IndexNow** → Bing Copilot non accelera l'indicizzazione.
- **M10 — No LinkedIn, no YouTube, no Google Business Profile** → segnali ecosistema Gemini/Copilot vuoti.

---

## Problemi Bassa Priorità

- **L1 — `speakable` assente** su Article e FAQPage.
- **L2 — Article `author` = Organization** invece di Person (Marco Dibenedetto).
- **L3 — Caching:** homepage `cache-control: private, no-cache, no-store` — abilitare ISR / `s-maxage` su catalogo statico per ridurre TTFB.
- **L4 — Immagini senza `width`/`height` espliciti** → rischio CLS.
- **L5 — llms.txt:** manca `## Optional`, nessun `llms-full.txt`, solo italiano.
- **L6 — `/artigiani` e `/la-nostra-storia` corti** (200-520 parole); prodotti senza grammatura (GSM).

---

## Category Deep Dives

### AI Citability — 71/100
SSR rende tutto crawlabile. Contenuti tecnici forti e citabili: tabella materiali (seta filamento 10-12μm, 30% assorbimento umidità, cashmere "2-8x più caldo della lana") **88/100**; articolo seta di Como **80/100**; spec prodotti **75/100**. Deboli: tagline homepage e descrizioni prodotto emotive ("accessorio dal fascino naturale") **30-42/100**. Inserire 1-2 frasi fattuali (micron, dimensioni, origine fibra) in ogni descrizione prodotto.

### Brand Authority — 14/100
Quasi zero footprint terze parti. Nessun Wikipedia, Wikidata, Reddit, Trustpilot, YouTube, stampa. Collisione di nome con competitor comaschi. È il tappo principale alla visibilità AI reale.

### Content E-E-A-T — 58/100
| Dimensione | Punteggio |
|---|---|
| Experience | 15/25 — artigiano reale nominato (Lorenzo M.), foto di processo autentiche |
| Expertise | 13/25 — buona profondità tecnica tessile, ma nessun autore umano attribuito |
| Authoritativeness | 11/25 — provenance Como forte, zero citazioni/menzioni esterne |
| Trustworthiness | 17/25 — HTTPS, P.IVA, garanzia 24 mesi, resi 14 gg; ma recensioni vuote |

### Technical GEO — 71/100
Eccellenti: SSR completo (Next.js 15), security header (HSTS, CSP, X-Frame-Options, nosniff). Critici: C1 (canonical) e C2 (cookie-locale). URL puliti. CWV rischio medio (immagini senza dimensioni).

### Schema & Structured Data — 82/100
Implementazione genuinamente forte, tutto JSON-LD server-rendered e valido: Organization+LocalBusiness, WebSite+SearchAction globali; Product+Offer+BreadcrumbList sui prodotti; **FAQPage** su /faq; Article sui blog. Difetti: `@id` host non uniforme, LocalBusiness duplicato con placeholder, manca ItemList sulle collezioni, `sameAs` solo 3 social.

### Platform Optimization — 58/100
| Piattaforma | Score |
|---|---|
| Google AI Overviews | 64/100 — la più forte (SSR + schema) |
| ChatGPT Web Search | 60/100 |
| Google Gemini | 55/100 |
| Bing Copilot | 50/100 |
| Perplexity AI | 44/100 — la più debole (zero community validation) |

---

## Quick Wins (questa settimana)

1. **Fix canonical prodotti** — una riga in `generateMetadata` di `prodotto/[slug]/page.tsx`: `alternates: { canonical: \`/prodotto/${slug}\` }`. Sblocca l'indicizzazione di 41 pagine. **Impatto enorme.**
2. **Uniformare schema `@id`** all'host reale + rimuovere il LocalBusiness placeholder su /contatti (telefono `+39 031 0000000`, "Via dell'Atelier").
3. **Correggere P.IVA** — verificare 03786590133 vs 03786790133, uniformare.
4. **Rimuovere `<title>` vuoto duplicato** + `og:type: product` sui prodotti.
5. **Creare Wikidata entry** SILKinCOM (fondatore, P.IVA, Como) — seed entity recognition.
6. **Creare Google Business Profile** a Cermenate/Como.

## Piano 30 Giorni

### Settimana 1 — Bug SEO critici
- [ ] Canonical self-referencing su prodotti/collezioni/blog
- [ ] Uniformare `@id` schema, rimuovere placeholder LocalBusiness
- [ ] Correggere P.IVA, rimuovere title vuoto, `og:type` product
- [ ] Sitemap: verificare 119 vs 72 URL, date `lastmod` reali

### Settimana 2 — Multilingua indicizzabile
- [ ] Migrare a locale con prefisso path (`/en/`, `/fr/`...)
- [ ] Aggiungere `hreflang` + `x-default` + `og:locale:alternate`
- [ ] Sitemap con alternate per-locale

### Settimana 3 — Entity & autorità
- [ ] Wikidata + Google Business Profile + LinkedIn azienda
- [ ] Trustpilot + raccolta recensioni → poi `aggregateRating` schema
- [ ] Decidere dominio canonico (silkincom.com vs vercel), pianificare migrazione + 301

### Settimana 4 — Contenuto & schema
- [ ] Sezione fondatore Marco Dibenedetto su /la-nostra-storia + Person schema
- [ ] Byline autore sui 4 blog post + 2-3 fonti esterne per post
- [ ] ItemList/CollectionPage schema sulle 10 collezioni
- [ ] BreadcrumbList su collezioni e blog; `speakable` su Article/FAQ
- [ ] Frasi fattuali (micron, GSM, dimensioni) nelle descrizioni prodotto
- [ ] Bing Webmaster Tools + IndexNow

---

## Appendice — Pagine Analizzate

| URL | Note GEO/SEO |
|---|---|
| / | SSR ok, schema Organization/WebSite, canonical ok, title vuoto duplicato |
| /prodotto/bellagio | **canonical → homepage (critico)**, Product schema valido, meta desc troncata |
| /collezioni/bellagio | nessun ItemList schema |
| /la-nostra-storia | brand story ~520 parole, fondatore assente |
| /artigiani | artigiano reale Lorenzo M., contenuto ~200 parole |
| /materiali | contenuto tecnico forte e citabile |
| /contatti | LocalBusiness duplicato + placeholder telefono/indirizzo |
| /faq | FAQPage schema presente — buono |
| /trame-di-como/* (4 post) | Article schema ok, author=Organization, no byline, no fonti |
| robots.txt | tutti i crawler AI ammessi, path sensibili bloccati — ok |
| llms.txt | presente, valido, ma solo IT, no llms-full.txt |
| sitemap.xml | 119 URL (attesi ~72) — verificare orfani |

---

## Confronto col Wix (report precedente)

| | silkincom.com (Wix) | silkincom.vercel.app (Next.js) |
|---|---|---|
| GEO Score | 28/100 Critical | **57/100 Poor** |
| Rendering | CSR — invisibile ai crawler | SSR — tutto crawlabile |
| Schema | 34/100 (bug capitalizzazione) | 82/100 (valido) |
| Technical | 54/100 | 71/100 |

Il sito Next.js è nettamente superiore. I due colli di bottiglia residui sono **bug di codice risolvibili** (canonical, locale) e **brand authority** (lavoro off-site).

---

*Report generato da GEO+SEO Audit — 5 subagent specializzati (AI Visibility, Platform, Technical, Content E-E-A-T, Schema)*
