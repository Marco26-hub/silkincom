# SILKinCOM — Handoff per nuova sessione

Documento di contesto per proseguire il lavoro. Leggere **interamente** prima di iniziare.
Ultimo aggiornamento: 19 maggio 2026 · ultimo commit di riferimento: `4e3e15d`.

---

## 1. Progetto

**SILKinCOM** — e-commerce luxury di accessori in seta, cashmere, lana, lino e cotone. Made in Como. Fondatore: **Marco Dibenedetto** (impresa individuale, P.IVA `03786790133`, sede Via Giuseppe Verdi 2/B, 22072 Cermenate CO).

- **Repo GitHub:** `Marco26-hub/silkincom` — branch `main`. Push su main → deploy automatico Vercel.
- **Deploy attuale:** `https://silkincom.vercel.app` (dominio preview Vercel).
- **Dominio target produzione:** `silkincom.com` — oggi ospita ancora il **vecchio sito Wix**. Migrazione del Next.js sul dominio reale = da fare (vedi §8).
- Esiste un sito Wix originale (`silkincom.com`) da cui è stato fatto lo scraping del catalogo. Il repo è la **ricostruzione Next.js**.

---

## 2. Stack tecnico

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS** + **framer-motion**
- **next-intl** — internazionalizzazione, 7 lingue
- **Supabase** — Postgres (backend transazionale: ordini, recensioni, magazzino, admin)
- Deploy: **Vercel**

Comandi: `npm run dev` · `npm run build` · `npm run type-check` (`tsc --noEmit`).

Nota build: `npm run build` in locale fallisce su `/api/google-merchant/feed.xml` con `SUPABASE_SERVICE_ROLE_KEY is not configured`. **Non è un bug** — è una env var assente in locale, presente su Vercel. tsc e la compilazione passano puliti.

---

## 3. Architettura dei dati — CRITICO

Il sito ha **due fonti di verità separate e NON collegate** per il catalogo:

### Frontend pubblico → file statici nel repo
Le pagine pubbliche (`src/app/[locale]/...`) leggono **file statici**, NON il database:
- `src/data/products.json` — 41 prodotti
- `src/data/catalog.ts` — costruisce i `Product`, mappa categoria/materiale/gruppo, getter locale-aware
- `src/data/catalog-i18n.json` — traduzioni metadata (categorie/collezioni/materiali/gruppi)
- `src/data/blog.json` + `src/data/posts.ts` — 4 articoli blog

### Admin → database Supabase
Le pagine admin (`src/app/[locale]/admin/...`) leggono/scrivono le tabelle Supabase (`products`, `categories`, `collections`, `colors`, `compositions`, `inventory`, `orders`, `reviews`, …).

### Conseguenza
**Modifiche dall'admin NON appaiono sul sito pubblico**, e viceversa. Sono due mondi.
- Dati **transazionali** (ordini, recensioni, magazzino, contatti, coupon) → passano tutti da Supabase, admin e frontend **collegati correttamente**.
- Dati **catalogo/contenuto** (prodotti, categorie, collezioni, materiali, pagine, blog) → frontend statico, admin DB → **scollegati**.

**Decisione architetturale ancora da prendere** (proposta all'utente, non ancora scelta):
- **A)** DB sorgente di verità → frontend legge dal DB (rewrite di `catalog.ts`/`posts.ts` come query)
- **B)** File sorgente di verità → admin catalogo sola lettura/rimosso
- **C)** Ibrido → file = catalogo, DB = solo transazionale

Finché non si decide, le due fonti vanno mantenute allineate a mano.

---

## 4. Sistema i18n

- **7 lingue:** it (default), en, es, fr, de, pt, nl
- **Routing:** `src/i18n/routing.ts` → `localePrefix: 'as-needed'`. Italiano senza prefisso (`/prodotto/x`), altre lingue con prefisso (`/en/prodotto/x`).
- **App sotto `src/app/[locale]/`** — migrazione fatta in questa sessione (C2).
- **Stringhe UI:** `messages/{locale}.json` — 756 chiavi, complete in tutte le 7 lingue.
- **Prodotti:** `products.json` → `name`/`description`/`composition` sono oggetti localizzati `{it, en, es, fr, de, pt, nl}`.
- **Metadata catalogo:** `catalog-i18n.json` — categorie/collezioni/materiali/gruppi in 7 lingue.
- **Blog:** `blog.json` → `title`/`description`/`body` localizzati in 7 lingue.
- **Fallback:** catena `locale → en → it`. `pick()` in `catalog.ts`/`posts.ts` — fallback **silenzioso** (se una lingua manca mostra en/it senza errore).
- **Helper SEO:** `localizedAlternates(locale, path)` in `routing.ts` — genera canonical self-referencing + hreflang per-locale.

### Pipeline di auto-traduzione
`scripts/translate-i18n.mjs` — l'italiano è la sorgente. Rileva campi `it` nuovi/modificati e traduce nelle altre 6 lingue via Anthropic API.
- `npm run translate:check` — dry run, mostra cosa manca/è cambiato
- `ANTHROPIC_API_KEY=sk-... npm run translate` — esegue
- Cache fingerprint: `scripts/.i18n-cache.json` — committata, hash di ogni sorgente `it`.
- Copre: `messages/*.json`, `products.json`, `blog.json`, `catalog-i18n.json`.
- **Regola operativa:** dopo aver modificato testo italiano, eseguire `npm run translate:check`; se ≠ 0 lanciare `npm run translate` e committare i file aggiornati + la cache.

---

## 5. Database Supabase

- **Progetto:** `silkincom` — project ref **`fjudulhxsafjizcmrifw`** — region eu-central-1.
- (Esistono anche `silkincom-content-factory` INACTIVE e `softi-reports` — non rilevanti.)
- Accesso usato in questa sessione: **Supabase MCP** (`mcp__b1038748-...__execute_sql` ecc.) — bypassa RLS, non serve service key.
- In locale lo script `npm run seed:products` (`scripts/seed-products.ts`) sincronizza `products.json` → DB, ma richiede `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

### Stato tabelle catalogo (sincronizzate in questa sessione)
- `products` — **41 righe**, allineate a `products.json` (name, description_long, composition, dimensions, price). `category_id`, `collection_id`, `color_id`, `composition_id`, `care_instructions` **tutti popolati 41/41**.
- `product_images` — 149 righe, ricostruite da `products.json`.
- `categories` — 10 (bellagio, cernobbio, tremezzo, varenna, twilly-como, darsena, lario, melzi, riva, tivan) + 3 vecchie orfane (Abbigliamento, Cappellini, Magliette) da rimuovere.
- `collections` — 3 (inverno, iconica, primavera) + 1 vecchia orfana (Estate).
- `colors` — 13. `compositions` — 10 (con qualche duplicato di casing, non ripulito).
- Inventario/ordini/recensioni **non toccati** durante i sync.

⚠️ Le modifiche al DB fatte in questa sessione sono **scritture dirette Supabase** — NON sono in git. `products.json` (repo) e DB sono attualmente allineati; restano due copie da tenere in sync a mano finché non si decide §3.

---

## 6. Lavoro fatto in questa sessione

**Catalogo:** scraping 41 prodotti dal sito live; aggiunti 5 Lario t-shirt (lario-2…6); corrette composizioni Lario (bianca/verde = 95% cotone + 5% elastan, colorate = 100% cotone); descrizioni Darsena (cappellini, logo Lago di Como).

**i18n:** `catalog.ts` reso locale-aware; `products.json` ristrutturato; messages completati in 7 lingue; stringhe hardcoded internazionalizzate (pagine Journal/artigiani/b2b/recensioni, componenti SizeGuide/ReturnForm/SalesNotification/InventoryBadge/newsletter, ProductReviews/ReviewForm, LegalPage eyebrow); blog localizzato; metadata catalogo tradotto; **41 prodotti + 4 blog tradotti in tutte le 7 lingue**.

**C2 — routing multilingua:** app spostata sotto `[locale]/`, middleware next-intl + Supabase concatenati, sitemap con hreflang, LanguageSwitcher naviga invece di cookie.

**Pipeline traduzioni:** `scripts/translate-i18n.mjs` creato.

**C1 — SEO:** canonical self-referencing per-locale + tag hreflang nel `<head>` (helper `localizedAlternates`); rimosso doppio suffisso `<title>`.

**Schema:** `@id` schema uniformati a `silkincom.vercel.app`; rimosso `LocalBusinessSchema` duplicato (aveva indirizzo/telefono placeholder); Article author → Person (Marco Dibenedetto) + speakable; CollectionPage/ItemList sulle pagine collezione; `og:locale` per-locale.

**DB:** 41 prodotti sincronizzati + categorizzati; colori/composizioni/cura materiale aggiunti.

**Audit GEO/SEO:** 2 round. Report nel repo (vedi §9). GEO Score: 57 → **62/100 (Fair)**.

---

## 7. Problemi noti / aperti

| # | Problema | Stato |
|---|---|---|
| Architettura | Decisione A/B/C su frontend statico vs DB (§3) | **Da decidere** |
| Dominio | Migrare il Next.js da `silkincom.vercel.app` a `silkincom.com` | Da fare (§8) |
| Brand Authority | GEO score basso (15/100) — serve presenza off-site | In corso (utente) |
| Wikidata | Entità SILKinCOM da creare. Account `SILKinCOM` registrato ma **troppo nuovo**: `Special:NewItem` non renderizza il CAPTCHA. Serve **autoconfirmed** = 4 giorni + 50 modifiche. Valori pronti nel guide dato all'utente. | Bloccato 4gg |
| Founder/E-E-A-T | Sezione fondatore visibile su `/la-nostra-storia` + byline blog | Da fare (contenuto) |
| GEO medi | Bing Webmaster/IndexNow; H1 homepage semantico; ISR cache catalogo; incoerenza prezzo/dimensioni Bellagio (home €120/180x45 vs scheda €180/180x70) | Da fare |
| T-shirt bianca | L'utente ha segnalato "manca una t-shirt bianca" Lario — da chiarire/aggiungere | In sospeso |
| Categorie orfane DB | Rimuovere da admin: categorie Abbigliamento/Cappellini/Magliette, collezione Estate | Da fare |

GEO audit completo con piano 30 giorni: vedi `GEO-AUDIT-REPORT.md`.

---

## 8. Migrazione dominio silkincom.com — checklist

Quando si passa al dominio reale:
- `NEXT_PUBLIC_APP_URL` → `https://silkincom.com` (env Vercel)
- Schema `@id` hardcoded `silkincom.vercel.app` in `src/app/[locale]/layout.tsx` (Organization, WebSite, publisher) → `silkincom.com`
- `llms.txt`, `robots.ts`/`sitemap.ts` baseUrl, eventuali URL hardcoded
- 301 redirect dal vecchio sito Wix
- Assicurarsi che `SUPABASE_SERVICE_ROLE_KEY` sia configurata su Vercel

---

## 9. Riferimenti rapidi

**File chiave**
- `src/data/products.json` · `src/data/catalog.ts` · `src/data/catalog-i18n.json` · `src/data/blog.json` · `src/data/posts.ts`
- `src/i18n/routing.ts` · `src/i18n/request.ts` · `src/i18n/navigation.ts` · `src/middleware.ts`
- `messages/{it,en,es,fr,de,pt,nl}.json`
- `scripts/translate-i18n.mjs` · `scripts/.i18n-cache.json` · `scripts/seed-products.ts`

**Report audit nel repo**
- `GEO-AUDIT-REPORT.md` — re-audit completo (62/100), piano 30 giorni
- `GEO-SEO-AUDIT-vercel.md` · `GEO-BRAND-MENTIONS.md` · `GEO-REPORT-SILKinCOM.pdf`

**Identificatori**
- Supabase project ref: `fjudulhxsafjizcmrifw`
- GitHub: `Marco26-hub/silkincom` (branch `main`)
- 10 categorie / slug: bellagio, cernobbio, tremezzo, varenna, twilly-como, darsena, lario, melzi, riva, tivan
- 3 collezioni: inverno, iconica, primavera · 2 gruppi: abbigliamento, accessori

**Comandi**
```
npm run dev              # sviluppo
npm run type-check       # tsc --noEmit
npm run build            # build (fallisce in locale su google-merchant — env)
npm run translate:check  # cosa manca da tradurre
npm run translate        # traduce (serve ANTHROPIC_API_KEY)
npm run seed:products    # sync products.json -> DB (serve SUPABASE_SERVICE_ROLE_KEY)
```

---

## 10. Come continuare — task comuni

- **Aggiungere/modificare un prodotto:** editare `src/data/products.json` (campi `it`); `npm run translate` per le altre lingue; per allineare l'admin sincronizzare anche il DB (`npm run seed:products` o via Supabase MCP `execute_sql` UPSERT su `products`).
- **Modificare testo UI:** editare `messages/it.json`; `npm run translate`.
- **Modificare categorie/collezioni/materiali:** `src/data/catalog.ts` (struttura) + `catalog-i18n.json` (traduzioni).
- **Sync DB ↔ file:** finché §3 non è deciso, ogni modifica al catalogo va replicata su entrambi.
- **Verifica pre-deploy:** `npm run type-check` + `npm run translate:check` (atteso 0).
- **Dopo ogni modifica testo italiano:** lanciare la pipeline di traduzione, altrimenti le altre 6 lingue restano vecchie (fallback silenzioso, vedi §4).
