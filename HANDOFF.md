# SILKinCOM — Handoff per nuova sessione

Documento di contesto per proseguire il lavoro. Leggere **interamente** prima di iniziare.
Ultimo aggiornamento: 20 maggio 2026 · ultimo commit di riferimento: `b7cabfc`.

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

### Sessione 20/05 — go-live prep (test + SEO/GEO premium + content)

**Test smoke completo (commit `0a2c124`, `f9cc325`):**
- 59/59 endpoint testati 200 su Vercel prod (silkincom.vercel.app)
- Fix conflitto `public/icon.svg` ↔ `src/app/icon.svg` (Next 13 metadata pipeline)
- Fix mancanti `alternates` SEO su `/faq` e `/trame-di-como` (canonical + 8 hreflang)
- `LAUNCH-CHECKLIST.md` creata (go-live runbook completo)

**SEO quick wins (commit `141aac2`, `214e383`):**
- Trust badges contrast fix (`text-soft-grey font-light` → `text-soft-black/75 font-normal`)
- Title duplicati `SILKinCOM | SILKinCOM` rimossi su `/collezioni/[slug]` e `/artigiani`
- `/materiali` ora ha metadata custom (era default home)
- Meta description prodotto CTA-driven (`${name} ${color} in ${material}. €dim. Sciarpa luxury Made in Como, spedizione gratuita oltre €200`)
- H1 prodotto include colore (`Cernobbio Azzurra`)
- Alt img prodotto include color + material

**Content pillar + 3 blog quick-win (commit `9d91c07`, `ad16b30`, `bde9cee`, `b0d1730`, `d35efd5`):**
- Pillar heritage `/trame-di-como/storia-della-seta-a-como` (~5000 chars, 10 paragrafi, sei secoli di storia + Mantero/Ratti dynasties)
- Blog `come-riconoscere-seta-vera` (7 prove pratiche)
- Blog `pashmina-vs-sciarpa-differenze` (comparison + dimensioni + fibra)
- Blog `cashmere-mongolo-vs-cinese` (origine + micronaggio + prezzi)
- 4 post × 7 lingue = 28 versioni live (8 via OpenRouter `gemma-4-31b:free`, 16 manualmente, 4 riscritti per QA premium editorial)

**Split /cura-prodotto (commit `c20ce52`):**
- `/cura-prodotto/[material]` dynamic per seta/cashmere/lana/lino/cotone
- Title keyword-rich + cross-links + sitemap entries

**GEO/SEO premium batch (commit `152dd18`, `5c30474`, `8e891a7`, `5f3a2e9`):**
- `llms.txt` da 37 → 101 righe (heritage, differenziatori, catalog completo, FAQ, prezzi, social, lingue)
- HowTo schema su `come-riconoscere-seta-vera` (7 HowToStep) e su 5 `/cura-prodotto/[material]`
- BreadcrumbList schema su blog post + cura sub + materiali
- AboutPage schema su `/la-nostra-storia` (mainEntity = Organization + founder)
- ItemList schema su `/materiali` (5 Product entries)

**GEO E-E-A-T quick wins x6 (commit `22c9a17`):**
- Byline visibile sui blog post ("di Marco Dibenedetto — Fondatore") con link a `/maison/marco-dibenedetto`
- Organization schema ContactPoint (email + 7 lingue + areaServed IT/EU/Worldwide)
- `/artigiani` con CollectionPage + ItemList × 3 Person schema
- **Nuova** `/maison/marco-dibenedetto` — bio editorial + Person schema completo (knowsAbout, affiliation, nationality, homeLocation)
- **Nuova** `/press` — press kit (boilerplate, fact sheet, logo, contatti, story angles) + WebPage schema
- Citation references su tutti i 4 nuovi blog post (Wikipedia, Mantero, Ratti, Camera di Commercio)

**Schema coverage finale per tipo pagina:**
- Home: WebSite + Organization+LocalBusiness + Brand + SearchAction + ContactPoint
- Prodotto: Product + Offer + BreadcrumbList + ReviewSchema (quando reviews > 0)
- Collezione: CollectionPage + ItemList + Offer
- Blog post: Article + Speakable + BreadcrumbList (+ HowTo se step-by-step)
- FAQ: FAQPage + Question + Answer
- Cura/[material]: HowTo + HowToStep + BreadcrumbList
- Materiali: ItemList + Product + BreadcrumbList
- La nostra storia: AboutPage + Organization + Person (founder)
- Artigiani: CollectionPage + ItemList + Person × N
- Maison/marco-dibenedetto: Person + Country + Place + BreadcrumbList
- Press: WebPage + BreadcrumbList

**Sitemap finale**: 83 URL + 567 hreflang alternates xhtml:link.

**Metriche stimate GEO score**: 78 → ~95/100 (residuo = brand authority off-site).

Commit di riferimento sessione 20/05: `f9cc325` → `22c9a17`.

**Asset editorial blog (commit `241d4eb`, `b7cabfc`):**
- `public/journal/telaio.jpg` (245 KB) → hero `storia-della-seta-a-como`
- `public/journal/foto_sciarpe_1.png` (2.4 MB) → hero `cashmere-mongolo-vs-cinese`

### Sessione 20/05 — parte 3 (Home CMS — Hero slides + Featured Collections)

**Migration `018_home_slides`** (commit `61a151c`):
- Nuova tabella `home_slides` (id, image_url, storage_path, title_i18n/subtitle_i18n/alt_i18n JSONB, focus, display_order, is_active) + RLS + bucket Storage `home-slides`.
- Hero refactored: accetta prop `slides`, titolo/sottotitolo per-slide con animazione remount, separatore `||` per accent gold, fallback hardcoded `FALLBACK_SLIDES` se DB vuoto.
- Loader server-only [`src/data/home-slides.ts`](src/data/home-slides.ts) con `unstable_cache` + tag `home-slides`. Helper `revalidateHomeSlides()` in [`src/lib/revalidate.ts`](src/lib/revalidate.ts).
- API admin: GET/POST `/api/admin/home-slides`, PATCH/DELETE `/api/admin/home-slides/[id]`, POST `/api/admin/home-slides/reorder`, POST `/api/admin/home-slides/[id]/translate`.
- UI admin `/admin/foto-home` ([`HomeSlidesManager.tsx`](src/components/admin/HomeSlidesManager.tsx)): upload, edit form, reorder ↑/↓, toggle attiva, traduci, elimina.
- 3 slide seed (ig-06/02/01 con testi IT estratti da messages.home.hero + 2 fittizi twilly/cotone).

**Helper traduzione condiviso** ([`src/lib/translate.ts`](src/lib/translate.ts), commit `61a151c`):
- `translateFields(targetLang, fields, context)` — OpenRouter (`google/gemma-4-31b-it:free`, override `TRANSLATE_MODEL`), JSON-out, gestione `<think>` tag.
- `translateToAllLocales(it, ctx)` — sequenziale per rate limit free tier.
- `buildI18nMap(itValue, perLocale, key)` — costruisce `{it, en, es, fr, de, pt, nl}`.

**Migration `019_collections_i18n`** (commit `8f06c61`):
- ALTER `collections` + colonne JSONB `name_i18n/tagline_i18n/short_name_i18n/accent_i18n/description_i18n` + `storage_path` + bucket Storage `collections`.
- Seed 3 collezioni (inverno/iconica/primavera) da `catalog-i18n.json` con tutte le 7 lingue.
- Loader [`src/data/collections-db.ts`](src/data/collections-db.ts) — `getFeaturedCollections(locale)` + `getFeaturedCollection(slug, locale)`. Cache tag `collections-meta`.
- API admin: GET `/api/admin/collections-content`, PATCH/translate/upload-image `/api/admin/collections-content/[id]/*`.
- UI admin `/admin/collezioni-home` ([`CollectionsContentManager.tsx`](src/components/admin/CollectionsContentManager.tsx)) — modifica per collezione: nome/short/accent/tagline/descrizione + upload foto + traduci.

**Tutti i lettori di collezioni passati a DB** (commit `efd3a44`):
- `FeaturedCollections.tsx` (homepage) → accetta prop `collections`, immagini da DB con fallback per slug.
- `/it/collezioni/page.tsx` → `getFeaturedCollections(locale)` async.
- `/it/collezioni/[slug]/page.tsx` → `getFeaturedCollection(slug, locale)` per metadata + lookup; `ProductFilters` riceve DB collections.

**Image-only replace** (commit `efd3a44`):
- POST `/api/admin/home-slides/[id]/image` (multipart `file`) — sostituisce SOLO foto slide hero, mantiene tutti gli altri campi, cancella storage object precedente (skip `legacy:` markers).
- Bottone "Cambia foto" (icona quadro) su ogni riga slide hero + ogni riga collezione → file picker → upload → cache invalidata.
- Endpoint analogo già esistente `POST /api/admin/collections-content/[id]/image` per collezioni.

**Sidebar admin** ([`AdminSidebar.tsx`](src/components/admin/AdminSidebar.tsx)): 2 nuove entry sotto "Clienti & Contenuti": **Foto Home** + **Collezioni Home**.

**Cleanup DB**: `collections.slug='estate'` (orfana, già flaggata in §5) settata `is_active=false` per non apparire più in `/collezioni` ora che la pagina è DB-driven.

**Stato traduzioni**: 3 slide seed hanno solo IT (`slides_en_translated: 0`); le 6 lingue derivano da fallback IT in `pickI18n`. User deve hit "Traduci" su ogni slide da admin (richiede `OPENROUTER_API_KEY` su Vercel) per popolare. Le 3 collezioni hanno già 7 lingue (seed da `catalog-i18n.json`).

**Smoke prod (`silkincom.vercel.app`, commit `efd3a44` live)**:
- `/` 200 + render 3 slide hero + 3 collezioni DB
- `/it/collezioni` 200 + render DB (Inverno/Iconica/Primavera + tagline/accent)
- `/it/collezioni/inverno` 200 + DB metadata
- `/en/collezioni` 200 (i18n fallback IT funzionante)
- `/it/admin/foto-home` + `/it/admin/collezioni-home` 200 (login gated)
- `/api/admin/home-slides` + `/api/admin/collections-content` GET/POST 401 (auth required) ✓
- robots.txt: `/admin/` + `/api/` disallow ✓
- sitemap: 83 URL invariato, nessuna leak admin ✓
- bucket `home-slides` + `collections` presenti su Storage ✓

Commit di riferimento parte 3: `61a151c` → `8f06c61` → `efd3a44`.

### Sessione 20/05 — parte 4 (Home CMS — BrandStory + EditorialBanner + InstagramFeed + Materials)

**Migration `020_home_content`** (commit `b1ae3f2`):
- Nuova tabella `home_sections` (id, section_key UNIQUE, content_i18n JSONB nested per-field, images JSONB array `{url, storage_path, alt_i18n}`, social_links JSONB, is_active) + RLS pubblica read, admin write.
- ALTER `materials` + colonne JSONB i18n: `name_i18n`, `description_i18n`, `origin_title_i18n`, `origin_body_i18n`, `characteristics_title_i18n`, `characteristics_body_i18n`, `benefit_title_i18n`, `benefit_body_i18n`, `slug` UNIQUE, `href`, `storage_path`, `is_active`.
- Bucket Storage `home-content` (public read, RLS admin write) — usato sia per home_sections.images sia per materials.image_url.

**Seed completo** (tutti 7 lingue già popolate da `messages/*.json` + `catalog-i18n.json`):
- `home_sections.brand_story` — eyebrow, titlePlain, titleAccent, paragraph1, paragraph2, cta, quote, quoteAuthor, imageMainAlt, imageTileAlt + 2 immagini Wix.
- `home_sections.editorial_banner` — eyebrow, titlePlain, titleAccent, description, cta + 1 background Wix.
- `home_sections.instagram_feed` — titleStart, titleEmphasis, description, followEyebrow + 18 foto Wix + social_links {instagram, facebook, pinterest}.
- `materials` — 5 righe (seta/cashmere/lana/cotone/lino) con tutti i campi i18n popolati 7/7 lingue.

**Loader server-only** [`src/data/home-content.ts`](src/data/home-content.ts):
- `getHomeSection(key, locale)` con `unstable_cache(60s)` + tag `home-sections` + `home-section:{key}`.
- `getHomeMaterials(locale)` con `unstable_cache(60s)` + tag `home-materials`.

**Revalidate helpers** ([`src/lib/revalidate.ts`](src/lib/revalidate.ts)):
- `revalidateHomeSections(sectionKey?)` — `revalidateTag('home-sections')` + ottionalmente `home-section:{key}` + `revalidatePath('/', 'layout')`.
- `revalidateHomeMaterials()` — `revalidateTag('home-materials')` + `revalidatePath`.

**API admin**:
- `GET /api/admin/home-sections` — list all.
- `PATCH /api/admin/home-sections/[key]` — update content_it (subset di field), is_active, social_links, images array. Auto-translate via OpenRouter se IT cambia (`body.translate !== false`).
- `POST /api/admin/home-sections/[key]/image[?index=N]` — upload nuova foto. Se `index` query, sostituisce N-esima; altrimenti append. Cancella storage object precedente (skip `legacy:`).
- `DELETE /api/admin/home-sections/[key]/image?index=N` — rimuove foto N + storage.
- `GET /api/admin/home-materials` — list 5 card.
- `PATCH /api/admin/home-materials/[id]` — update qualsiasi `*_it` field, auto-translate, sync legacy text columns (`name`, `description`, `origin`, `characteristics`, `benefits`).
- `POST /api/admin/home-materials/[id]/image` — replace foto material card.

**Frontend refactor** (`page.tsx` server fetch parallel `Promise.all`):
- `BrandStory` accetta `section: HomeSectionLocalized | null`. Fallback a `useTranslations` se DB empty.
- `EditorialBanner` accetta `section`. Background image da DB o fallback Wix.
- `InstagramFeed` accetta `section`. 18 foto + social URL da DB. Se images vuoto → `return null`.
- `Materials` accetta `materials: HomeMaterialCard[]`. Card titolo/descrizione/3-tabs/foto da DB. Se materials vuoto → `return null`.

**Admin UI** ([`HomeSectionsManager.tsx`](src/components/admin/HomeSectionsManager.tsx), [`HomeMaterialsManager.tsx`](src/components/admin/HomeMaterialsManager.tsx)):
- `/admin/sezioni-home` — 3 card sezioni con grid foto (replace inline + delete + add), edit form testi auto-traduzione, editor link social (solo instagram_feed).
- `/admin/materiali-home` — 5 card material con foto thumbnail, toggle attiva, cambia foto button, edit form 8 campi i18n (name/description + 3 tab × title+body).

**Sidebar admin**: 2 nuove entry "Sezioni Home" + "Materiali Home" sotto "Clienti & Contenuti".

**Smoke prod (`silkincom.vercel.app`, commit `b1ae3f2` live)**:
- `/` 200 + render completo DB: Hero + Featured + BrandStory ("La Maison", "Dal 1400") + Materials ("Fibra extra") + EditorialBanner ("Atelier privato") + InstagramFeed ("Trame di Como").
- `/it/admin/sezioni-home` + `/it/admin/materiali-home` 307 → login gated ✓
- `/api/admin/home-sections` + `/api/admin/home-materials` 401 ✓
- DB integrity: 3 home_sections, 5 materials con slug+i18n, 3 bucket Storage (home-slides/collections/home-content).

Commit di riferimento parte 4: `b1ae3f2`.

---

## 7. Problemi noti / aperti

| # | Problema | Stato |
|---|---|---|
| Architettura | Arch A scelta e implementata (§3) | **✓ Fatto** |
| Vercel env | `OPENROUTER_API_KEY` da aggiungere alle env Vercel + Redeploy. Necessaria per il bottone "Traduci" admin prodotti. | **Da fare (utente)** |
| Compositions doppioni | DELETE manuale dei 2 duplicati casing nella tabella `compositions`: `100% cashmere` (id `10968fd8-…`, 0 prodotti) e `100% Cotone` (id `8987a45f-…`, 0 prodotti). Da Supabase Studio. | **Da fare (utente)** |
| Dati prodotti sporchi | `darsena-bianco` refuso "cavallo→cappellino" + intro narrativa per `darsena-blu`/`darsena-verde` | **✓ Fatto** (UPDATE DB) |
| ISR cache catalogo | `unstable_cache` 60s + `revalidateCatalog` on-demand | **✓ Fatto** |
| Bellagio prezzo/dimensioni | Risolto con Arch A | **✓ Fatto** |
| Dominio | Migrare il Next.js da `silkincom.vercel.app` a `silkincom.com` | **Da fare** ven 22/05 (§8) |
| Codice pre-cutover | URL hardcoded `silkincom.vercel.app` → `silkincom.com` in 13 file | **✓ Fatto** (commit `c7920f6`) |
| Brand Authority off-site | Wikidata, Wikipedia, press release | In corso (utente) |
| Wikidata | Entità SILKinCOM da creare. Sbloccato dopo autoconfirmed (4 giorni). | Bloccato 4gg |
| Founder/E-E-A-T | Pagina `/maison/marco-dibenedetto` + Person schema + byline blog + ContactPoint + press kit | **✓ Fatto** (commit `22c9a17`) |
| Press / Media kit | Pagina `/press` con press kit + WebPage schema | **✓ Fatto** (commit `22c9a17`) |
| IndexNow | Bloccato dal classifier (token file). Da fare con permission rule o manualmente. | Da fare (utente) |
| H1 home keyword-rich | "L'eleganza del lago tessuta a Como" — branding/poetico. Cambio = decisione branding. | Aperto |
| Lighthouse / Core Web Vitals | Test browser manuale. | Da fare (utente) |
| Schema Google Rich Results test | Manuale su Search Console post-cutover. | Da fare (utente) |
| Form contatti email | Resend integrato, `info@silkincom.com` | **✓ Fatto** |
| Manifest PWA + security.txt | RFC 9116 + manifest.ts | **✓ Fatto** |
| Modifica varianti admin | UI matita + form condiviso + PATCH | **✓ Fatto** |
| Card prodotto mostra `description` DB reale | line-clamp-2 | **✓ Fatto** |
| Collezioni unificate `catalog-i18n.json` | Una sola fonte + getCollections() esteso | **✓ Fatto** |
| Materiali tabella DB popolata | 5 materiali per dropdown variante | **✓ Fatto** |
| Hero slides CMS DB-backed | Tabella `home_slides` + bucket Storage + admin UI `/admin/foto-home` + traduzione OpenRouter | **✓ Fatto** (commit `61a151c`) |
| Featured Collections CMS DB-backed | Migration 019 i18n JSONB + bucket `collections` + admin `/admin/collezioni-home` + propagazione su `/collezioni` + `[slug]` | **✓ Fatto** (commit `8f06c61`, `efd3a44`) |
| Cambia foto admin (slide + collezioni) | Bottone row-level + endpoint `/image` dedicato | **✓ Fatto** (commit `efd3a44`) |
| Slide hero traduzioni i18n | 3 slide seed solo IT. Necessario hit "Traduci" admin dopo `OPENROUTER_API_KEY` Vercel + cliente in browser | **Da fare (utente)** |
| Sezioni home ancora hardcoded | BrandStory / Materials / EditorialBanner / InstagramFeed | **✓ Fatto** (commit `b1ae3f2`) — migration 020 + bucket home-content + UI `/admin/sezioni-home` + `/admin/materiali-home` |
| Foto sezioni home su CDN Wix | Upload nuove foto via admin → bucket `home-content`. Le foto legacy Wix restano fino al replace. | Aperto (utente sostituisce gradualmente) |
| Pillar heritage Como | `/trame-di-como/storia-della-seta-a-como` (~5000 char) | **✓ Fatto** |
| 3 blog quick-win + traduzione 7 lingue | come-riconoscere, pashmina-vs-sciarpa, cashmere-mongolo | **✓ Fatto** |
| Splitting cura-prodotto | 5 sub-pages per materiale | **✓ Fatto** |
| Citation refs blog | Aside "Fonti e approfondimenti" sui 4 post | **✓ Fatto** |
| llms.txt premium | 101 righe (heritage, catalog, FAQ, prezzi, social, lingue) | **✓ Fatto** |
| Schema HowTo / AboutPage / ItemList | Full coverage | **✓ Fatto** |
| T-shirt bianca / Categorie orfane DB | Confermate aggiornate dall'utente | **✓ Chiuso** |

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

- **Aggiungere/modificare un prodotto:** dall'admin (`/admin/prodotti/[id]`). DB sorgente. Auto-translate parte al Salva se nome/descrizione/composizione cambiano (richiede `OPENROUTER_API_KEY` su Vercel).
- **Modificare testo UI:** editare `messages/it.json`; lanciare `npm run translate` (serve `ANTHROPIC_API_KEY`).
- **Modificare categorie/collezioni/materiali (taxonomy):** `src/data/catalog-meta.ts` (struttura tipi + helper) + `src/data/catalog-i18n.json` (traduzioni). Le collezioni ora hanno fonte unica (no più `messages.home.featured.items`).
- **Aggiungere blog post:** editare `src/data/blog.json` (campi `it`). Le 6 lingue altre — fallback automatico a IT finché non si ri-traduce.
- **Verifica pre-deploy:** `npm run type-check` (atteso 0 errori). Build su Vercel fallisce solo se mancano env (es. `SUPABASE_SERVICE_ROLE_KEY` per `/api/google-merchant`).
- **Dopo ogni modifica testo italiano (prodotti):** auto-translate dall'admin (Salva → 6 lingue via OpenRouter). Per blog: editare manualmente o `npm run translate`.

---

## 11. Quick start per nuova sessione

**Clone + leggi:**
```
cd /tmp/silkincom              # repo già clonato qui
git pull origin main           # allinea
cat HANDOFF.md                 # leggi questo file (sezione §6 = lavoro recente)
```

**Identificatori chiave:**
- Repo: `Marco26-hub/silkincom` branch `main`
- Deploy: `https://silkincom.vercel.app` (cut-over → `silkincom.com` previsto ven 22/05)
- Supabase: project ref `fjudulhxsafjizcmrifw`, MCP via `mcp__b1038748-...__execute_sql`
- Founder + sede: Marco Dibenedetto, Via Giuseppe Verdi 2/B, 22072 Cermenate (CO), P.IVA IT03786790133

**Stato sito (al 20/05):**
- ✅ Arch A completa (DB sorgente, cache invalidation, i18n columns, traduzione OpenRouter integrata)
- ✅ 7 lingue native, 41 prodotti, 5 blog post, 5 cura/[material] sub-pages, /press, /maison/marco-dibenedetto
- ✅ Schema premium: Product, Article, HowTo, FAQPage, AboutPage, CollectionPage, ItemList, BreadcrumbList, Speakable, Organization+LocalBusiness, Person, ContactPoint
- ✅ llms.txt 101 righe, sitemap 83 URL + 567 hreflang alternates, robots.txt con 14 AI bots
- ✅ GEO score stimato ~95/100
- ✅ Smoke test Vercel prod: 59/59 endpoint 200

**Cosa DEVE fare l'utente prima del go-live (utente, non delegabile):**
1. `OPENROUTER_API_KEY` su Vercel env (Production + Preview) + Redeploy
2. `SUPABASE_SERVICE_ROLE_KEY` su Vercel verificare presenza
3. `STRIPE_*` keys live + webhook endpoint configurato
4. `RESEND_API_KEY` live + dominio mittente verificato
5. DELETE 2 doppioni `compositions` SQL su Supabase Studio:
   ```sql
   DELETE FROM compositions WHERE id IN (
     '10968fd8-d1e5-42c0-9e53-da347158f301',
     '8987a45f-07ac-4ef6-ad14-95f78c87b51c'
   );
   ```
6. DNS cut-over `silkincom.com` → Vercel (vedi §8 + `LAUNCH-CHECKLIST.md`)
7. Wikidata entity SILKinCOM (sblocco autoconfirmed 4 gg)
8. IndexNow setup (bloccato dal classifier per token file: serve permission rule)

**File chiave da non rompere:**
- `src/data/catalog.ts` (server-only, async DB) ↔ `src/data/catalog-meta.ts` (client-safe, types + sync getters). Separazione importante: client components devono importare SOLO da `catalog-meta`.
- `src/lib/supabase/server.ts`: `createPublicClient()` (cookieless, OK in unstable_cache) vs `createServerClient()` (cookies, NON usare in cache).
- `src/lib/revalidate.ts`: `revalidateCatalog()` chiamato da TUTTI gli admin product mutation.

**Test smoke rapido pre-cambio:**
```bash
cd /tmp/silkincom && npm run type-check  # 0 errori atteso
curl -s -o /dev/null -w "%{http_code}\n" https://silkincom.vercel.app/   # 200
```

**Commit di riferimento finale 20/05:** `b7cabfc` (immagini editorial blog).

**Documento operativo go-live:** `LAUNCH-CHECKLIST.md` (runbook con date e ordine cut-over).
