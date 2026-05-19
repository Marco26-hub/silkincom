# SILKinCOM — Handoff per nuova sessione

Documento di contesto per proseguire il lavoro. Leggere **interamente** prima di iniziare.
Ultimo aggiornamento: 19 maggio 2026 (parte 2) · ultimo commit di riferimento: `f676d6c`.

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

**Decisione architetturale: A — DB sorgente di verità.** Scelta e implementata. Frontend legge i prodotti dal DB Supabase via `catalog.ts` (client `createPublicClient` cookieless + `unstable_cache` 60s + tag `products`). Admin mutazioni (`POST/PATCH/DELETE /api/admin/products*`) chiamano `revalidateCatalog()` (`revalidateTag('products')` + `revalidatePath('/', 'layout')`) per refresh immediato.

Localizzazione prodotti: colonne JSONB `name_i18n` / `description_long_i18n` / `composition_i18n` sulla tabella `products` (migrazione `017_product_i18n_columns`). Italiano = sorgente (campo singolo). Altre 6 lingue: priorità DB *_i18n → `products.json` (legacy fallback) → italiano. Bottone "Traduci" nell'admin (auto al salvataggio se i testi cambiano) traduce IT → en/es/fr/de/pt/nl via OpenRouter (`google/gemma-4-31b-it:free`, override con `TRANSLATE_MODEL`) e popola le colonne `*_i18n`.

`products.json` resta in repo come fallback transitorio: per i prodotti mai tradotti dall'admin, le 6 lingue continuano a venire da lì. Quando tutti i prodotti sono passati per "Traduci", `products.json` può essere dismesso.

Collezioni: fonte unica `src/data/catalog-i18n.json`. `home.featured.items.*` rimosso dai messages; `FeaturedCollections` (homepage) usa `getCollections(locale)` come `/collezioni`. Aggiunte sezioni `collectionShortName` e `collectionAccent`.

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

### Sessione 19/05 — parte 2 (Arch A + admin operativo)

- **Architettura A**: rewrite `catalog.ts` legge da Supabase via `createPublicClient` (cookieless, OK dentro `unstable_cache`). Split `catalog-meta.ts` (client-safe: tipi, taxonomy, sync getters) ↔ `catalog.ts` (server-only DB).
- **Admin → frontend live**: `revalidateCatalog()` (`revalidateTag` + `revalidatePath`) chiamato da tutti gli endpoint admin products mutation (`route.ts`, `[id]/route.ts`, `[id]/images/route.ts`).
- **`localizeProduct`**: italiano sempre da DB; altre lingue priorità DB *_i18n → products.json → DB source.
- **Traduzione integrata admin**: migrazione `017` aggiunge colonne JSONB i18n; endpoint `POST /api/admin/products/[id]/translate` traduce via OpenRouter (chiamate sequenziali per il rate limit free). Bottone "Traduci" auto-eseguito da `save()` se name/description/composition cambiano.
- **Endpoint API**: `/api/catalog` nuovo (catalogo localizzato per il client); `/api/products` originale ripristinato.
- **Varianti admin**: aggiunta UI di modifica (pulsante matita + form condiviso create/edit + PATCH).
- **ProductCard**: la card mostra `description` reale dal DB (line-clamp-2) invece di `composition.split('.')[0]`.
- **DB seed**: tabella `materials` popolata (cashmere, lana, seta, lino, cotone) — dropdown variante materiale ora funziona.
- **Collezioni unificate**: `messages.home.featured.items.*` rimosso, dati migrati in `catalog-i18n.json` (`collectionShortName`, `collectionAccent`). `getCollections()` esteso. Homepage e `/collezioni` ora condividono i dati.

Commit di riferimento per la parte 2: `f51721b` → `f676d6c`.

---

## 7. Problemi noti / aperti

| # | Problema | Stato |
|---|---|---|
| Architettura | Arch A scelta e implementata (§3) | **✓ Fatto** |
| Vercel env | `OPENROUTER_API_KEY` da aggiungere alle env Vercel + Redeploy. Necessaria per il bottone "Traduci" admin. Senza, il save di un prodotto con testo cambiato dà errore 500. | **Da fare (utente)** |
| Compositions doppioni | DELETE manuale dei 2 duplicati casing nella tabella `compositions`: `100% cashmere` (id `10968fd8-…`, 0 prodotti) e `100% Cotone` (id `8987a45f-…`, 0 prodotti). Da Supabase Studio. | **Da fare (utente)** |
| Dati prodotti sporchi | DB `darsena-bianco.description_long` ha refuso "Il **cavallo** Darsena…" (→ "cappellino"). `darsena-blu`/`darsena-verde` `description_long` inizia con "Composizione:…" (scheda tecnica, non descrizione). Correggi dall'admin. | Da fare (contenuto) |
| ISR cache catalogo | `unstable_cache` 60s + `revalidateCatalog` on-demand | **✓ Fatto** |
| Bellagio prezzo/dimensioni | Era effetto del bug frontend statico vs DB. Risolto con Arch A: home e pagina prodotto leggono entrambe dal DB. | **✓ Fatto** |
| Dominio | Migrare il Next.js da `silkincom.vercel.app` a `silkincom.com` | Da fare (§8) |
| Brand Authority | GEO score basso (15/100) — serve presenza off-site | In corso (utente) |
| Wikidata | Entità SILKinCOM da creare. Account `SILKinCOM` registrato ma **troppo nuovo**: `Special:NewItem` non renderizza il CAPTCHA. Serve **autoconfirmed** = 4 giorni + 50 modifiche. Valori pronti nel guide dato all'utente. | Bloccato 4gg |
| Founder/E-E-A-T | Sezione fondatore visibile su `/la-nostra-storia` + byline blog | Da fare (contenuto) |
| GEO medi | Bing Webmaster/IndexNow; H1 homepage semantico (è poetico — decisione branding) | Da fare |
| T-shirt bianca | Confermata OK dall'utente | **✓ Chiuso** |
| Categorie orfane DB | Confermate aggiornate dall'utente | **✓ Chiuso** |

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
