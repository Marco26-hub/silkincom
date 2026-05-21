# SILKinCOM — Launch Checklist

Documento operativo per il go-live di silkincom.com.
Cronoprogramma: **mer–gio test**, **ven cut-over dominio**.

---

## Mer–Gio — Test & cleanup

### Vercel env (admin Vercel)
- [ ] `OPENROUTER_API_KEY` aggiunto in Production + Preview → Redeploy
- [ ] Verifica `SUPABASE_SERVICE_ROLE_KEY` presente
- [ ] Verifica tutte le env: `RESEND_API_KEY`, `BREVO_*`, `STRIPE_*`, `NEXT_PUBLIC_SUPABASE_*`

### DB pulizie (Supabase Studio)
- [x] RLS abilitato su `store_settings`, `compositions`, `product_sizes` (migration `023_rls_security`) *(applicato 21/05 — advisor Supabase: 0 `rls_disabled_in_public`)*
- [x] Inventory RPC (`decrement_inventory`, `apply_inventory_movement`) — EXECUTE revocato da `anon`/`authenticated`/`PUBLIC`, solo `service_role` (migration `024`+`025`) *(applicato 21/05)*
- [x] `reorder_alerts` view → `security_invoker` + REVOKE anon/authenticated; EXECUTE revocato su `product_review_stats`/`handle_new_user`/`log_order_status_change` (migration `026`) *(applicato 21/05 — advisor: 0 ERROR)*
- [ ] DELETE 2 doppioni `compositions` (utente — regola sicurezza permette solo a te)
  ```sql
  DELETE FROM compositions WHERE id IN (
    '10968fd8-d1e5-42c0-9e53-da347158f301', -- "100% cashmere"
    '8987a45f-07ac-4ef6-ad14-95f78c87b51c'  -- "100% Cotone"
  );
  ```
- [x] Fix refuso `darsena-bianco.description_long`: "Il cavallo" → "Il cappellino" *(UPDATE eseguito)*
- [x] Riscrivi descrizioni `darsena-blu` e `darsena-verde` con intro narrativa *(UPDATE eseguito)*

### Test admin → frontend (live Vercel)
- [ ] Login admin → modifica nome/prezzo/descrizione → Salva
- [ ] Verifica IT cambia subito
- [ ] Verifica traduzione auto su 6 lingue dopo ~10s
- [ ] Crea nuova variante (SKU, colore, materiale, prezzo override)
- [ ] Modifica variante esistente (matita)
- [ ] Elimina variante (cestino)
- [ ] Upload immagine prodotto
- [ ] Cambio categoria/collezione → verifica home/listing
- [ ] Crea coupon di test
- [ ] Marca prodotto Bestseller → verifica home

### Test checkout end-to-end (Stripe test mode)
- [ ] Aggiungi a carrello → checkout
- [ ] Pagamento test card `4242 4242 4242 4242`
- [ ] Email conferma ordine arriva
- [ ] Ordine appare in admin → Ordini
- [ ] Magazzino aggiornato (`quantity_reserved`)
- [ ] Webhook Stripe ricevuto (log Vercel)
- [ ] Cambio stato ordine da admin
- [ ] Genera reso

### Test pagine pubbliche tutte le 7 lingue
- [x] `/`, `/en`, `/es`, `/fr`, `/de`, `/pt`, `/nl` — tutte 200 (locale + Vercel prod)
- [x] `/collezioni` + ogni `/collezioni/[slug]` — tutte 200
- [x] `/prodotto/[slug]` sample — 200
- [x] `/materiali`, `/artigiani`, `/la-nostra-storia` — 200
- [x] `/trame-di-como` + alternates fix (commit f9cc325)
- [x] `/contatti` — pagina 200; POST `/api/contatti` 201 (insert DB ok, email Resend soft-fail in dev)
- [x] `/b2b` — 200
- [ ] LanguageSwitcher click-through reale (UI test utente)

### SEO check automatico (commit f9cc325)
- [x] Hreflang 8 tag (x-default + 7 lingue) su home, prodotto, collezione, faq, blog
- [x] Canonical su tutte le pagine principali (fix /faq + /trame-di-como)
- [x] og:locale + alternates per lingua
- [x] JSON-LD: WebSite + Organization + Brand + SearchAction (home), Product+Offer+Breadcrumb (prodotto), CollectionPage+ItemList (collezione), FAQPage+Question+Answer (faq)
- [x] robots.txt: bloccato admin/api/account/checkout/cart, esplicito per 14 bot AI
- [x] sitemap.xml: 72 URL
- [x] /manifest.webmanifest, /.well-known/security.txt, /icon.svg, /apple-icon.svg, /og-image.jpg — tutti 200
- [x] /api/google-merchant/feed.xml — 200 su Vercel prod (500 locale = env atteso)

### Test mobile + performance
- [ ] Layout mobile su 3 dispositivi
- [ ] Hamburger drawer
- [ ] Lighthouse (Performance > 80, A11y > 90, SEO > 95)
- [ ] Core Web Vitals (LCP, INP, CLS) verdi
- [ ] Rete lenta (DevTools throttling)

### Edge cases
- [x] `/404` custom page brandizzata (font display + gold + link Home/Collezioni)
- [x] `/admin` senza auth → 307 redirect a `/login?redirect=%2Fadmin`
- [x] `/account` senza auth → 307 redirect a login
- [ ] Carrello vuoto (UI test utente)
- [ ] Stock esaurito → bottone disabilitato (UI test utente)
- [ ] Coupon scaduto / invalido (UI test utente)

---

## Ven AM — Pre cut-over

### Codice
- [ ] `NEXT_PUBLIC_APP_URL` su Vercel → `https://silkincom.com` (utente)
- [x] `src/app/[locale]/layout.tsx` schema `@id`: cambiato → `silkincom.com` *(commit c7920f6)*
- [x] `llms.txt`, `robots.ts`, `sitemap.ts` baseUrl env-driven (fallback `silkincom.com`) *(commit c7920f6)*
- [x] grep URL hardcoded `silkincom.vercel.app` — tutti sostituiti in 13 file *(commit c7920f6)*
- [x] commit + push (`c7920f6`) — verifica deploy preview su Vercel

### DNS preparato (NON attivo)
- [ ] Recupera record DNS attuali (backup)
- [ ] Annota TTL attuali (propagazione)

### Backup Wix
- [ ] Export completo dati Wix
- [ ] Screenshot configurazioni / email setup Wix
- [ ] Lista 301 redirect (URL Wix vecchi → nuovi)

---

## Ven — Cut-over dominio (ordine importante)

1. [ ] Vercel → Domains → aggiungi `silkincom.com` + `www.silkincom.com`
2. [ ] Vercel mostra record DNS necessari (A/CNAME)
3. [ ] Wix: rimuovi connessione del dominio
4. [ ] Provider DNS: cambia record come da Vercel
5. [ ] Attendi propagazione (`dig silkincom.com`)
6. [ ] Vercel emette SSL Let's Encrypt automatico
7. [ ] Verifica `https://silkincom.com` apre il sito nuovo

### Redirect 301 Wix → nuovi (`next.config.js`)
- [ ] Aggiungi/verifica redirect per ogni URL Wix vecchio (`/category/*`, `/products/*`, ecc.)

### Smoke test post cut-over
- [ ] `https://silkincom.com` → home nuovo sito
- [ ] `https://www.silkincom.com` → redirect a apex (o viceversa)
- [ ] `/sitemap.xml`, `/robots.txt`
- [ ] Vecchio URL Wix → 301 corretto
- [ ] Schema JSON-LD ha `silkincom.com`

---

## Email gestione

- [ ] Cambia password caselle email aziendali
- [ ] Aggiorna password su Resend / Brevo / servizi mail
- [ ] DNS email (MX, SPF, DKIM, DMARC) restano corretti dopo cambio DNS
- [ ] Test invio da `info@silkincom.com` (esterno)
- [ ] Test ricezione su `info@silkincom.com`
- [ ] Aggiorna password Supabase admin

---

## Stripe (live mode)

- [ ] Account Stripe in **Live**
- [ ] Identità Stripe verificata (KYC)
- [ ] IBAN business per payout
- [ ] Vercel: `STRIPE_SECRET_KEY` live, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` live
- [ ] Webhook endpoint su Stripe Dashboard → `https://silkincom.com/api/stripe/webhook`
- [ ] `STRIPE_WEBHOOK_SECRET` = signing secret live
- [ ] Test pagamento reale piccolo importo + rimborso
- [ ] Tax / IVA Italia (Stripe Tax o app)
- [ ] Apple Pay / Google Pay domain verification

---

## API / Integrazioni

- [ ] **Resend** live + dominio mittente verificato (DNS)
- [ ] **Brevo** key + list newsletter
- [ ] **GA4** id + e-commerce tracking
- [ ] **GTM** (se usi)
- [ ] **Meta Pixel** (se FB Ads)
- [ ] **Sentry** DSN + auth token
- [ ] **OpenAI** key (se usato)
- [ ] `CRON_SECRET` + `AUTOMATION_API_KEY` generati
- [ ] Test cron jobs (`/api/cron/*`)

---

## SEO / GEO post go-live

- [ ] Google Search Console: `silkincom.com` (DNS verification)
- [ ] Submit `sitemap.xml` su GSC
- [ ] Bing Webmaster Tools + submit sitemap
- [ ] IndexNow: key + ping Bing/Yandex
- [ ] Google Merchant Center feed (`/api/google-merchant/feed.xml`)
- [ ] Rich Results Tool su 3 pagine
- [ ] `llms.txt` con dominio reale
- [ ] Hreflang verification

### Brand Authority (parallelo)
- [ ] Wikidata: appena autoconfirmed (4 gg) crea entità SILKinCOM
- [ ] Social verificati (IG, FB, Pinterest)
- [ ] Google Business Profile

---

## Legale / Compliance

- [ ] Privacy policy aggiornata (P.IVA, indirizzo, dominio)
- [ ] Cookie policy + banner
- [ ] Termini & condizioni
- [ ] Diritto recesso 14gg
- [ ] Fattura elettronica IT (SDI)
- [ ] VAT OSS se vendi UE
- [ ] GDPR: retention, DPO, registro trattamenti

---

## Operativo

- [ ] Inventario iniziale per prodotto + variante
- [ ] Zone spedizione + tariffe (IT / UE / extra-UE)
- [ ] Corriere integrato (BRT, GLS) o manuale
- [ ] Email template (ordine, spedizione, reso) revisionate
- [ ] Backup automatico Supabase (PITR)
- [ ] Monitoring uptime (UptimeRobot / Vercel)
- [ ] Documentazione admin per il team

---

## Lancio / Marketing

- [ ] Newsletter di lancio
- [ ] Post social (IG, FB, Pinterest)
- [ ] PR / press kit
- [ ] Notifica vecchi clienti (lista Wix)
- [ ] Coupon di lancio
- [ ] Google / Meta Ads (se budget)

---

## Polish minore

- [x] Politica reso visibile su `/resi` *(esistente, 7 sezioni, traduzioni complete)*
- [x] Pagina FAQ pubblicata *(esistente, 25 FAQs + JSON-LD FAQPage)*
- [x] Form contatti riceve email *(sendContactNotification via Resend, Reply-To = mittente — commit fc4ddd9)*
- [x] Pagina 404 brandizzata *(font display, gold accent, link Home/Collezioni)*
- [x] favicon + apple-touch-icon + manifest PWA *(manifest.ts creato — commit fc4ddd9)*
- [x] `/security.txt` (responsible disclosure) *(RFC 9116 — commit fc4ddd9)*
- [x] `silkincom.com/.well-known/*` *(apple-pay esistente + security.txt aggiunto)*

## SEO content & technical (20 mag)

- [x] **Pillar page heritage** — `/trame-di-como/storia-della-seta-a-como` (~5000 chars, 10 paragrafi, 6 secoli di storia) *(commit 9d91c07)*
- [x] **Blog quick-win** `come-riconoscere-seta-vera` (7 prove pratiche) *(commit ad16b30)*
- [x] **Blog quick-win** `pashmina-vs-sciarpa-differenze` (comparison) *(commit ad16b30)*
- [x] **Blog quick-win** `cashmere-mongolo-vs-cinese` (origin + recognition) *(commit ad16b30)*
- [x] **Traduzione 4 blog × 6 lingue** (28 versioni totali) tono editorial premium uniforme *(commit bde9cee + b0d1730 + d35efd5)*
- [x] **Split /cura-prodotto** in 5 sub-pages per materiale (seta/cashmere/lana/lino/cotone) con title SEO + cross-links *(commit c20ce52)*
- [x] LocalBusiness schema (Organization+LocalBusiness combo con address Cermenate, geo, vatID, founder)
- [x] SEO quick wins — fix title duplicati, meta desc CTA-driven, H1 prodotto con colore, alt img *(commit 214e383)*
- [x] Trust badges contrast fix *(commit 141aac2)*

## GEO/SEO premium (20 mag, batch finale)

- [x] **HowTo schema** su `/trame-di-como/come-riconoscere-seta-vera` (7 HowToStep) e su 5 `/cura-prodotto/[material]` (ogni materiale come HowTo) *(commit 152dd18 + 5c30474)*
- [x] **BreadcrumbList schema** su blog post + cura-prodotto sub-pages + materiali *(commit 5c30474 + 5f3a2e9)*
- [x] **AboutPage schema** su `/la-nostra-storia` con `mainEntity = Organization` + founder Marco Dibenedetto *(commit 8e891a7)*
- [x] **ItemList schema** su `/materiali` (5 Product entries) *(commit 5f3a2e9)*
- [x] **llms.txt premium** — 37 → 101 righe: heritage, differenziatori, full catalog, FAQ, prezzi, social, lingue *(commit 152dd18)*
- [x] **Hreflang 8 tag** su ogni pagina (x-default + 7 locales), canonical su tutte
- [x] **Sitemap** 81 URL + 567 hreflang alternates xhtml:link
- [x] **Robots.txt** + 14 bot AI esplicitamente gestiti (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ecc.)
- [x] **Schema JSON-LD** 100% parse-valid su 8 URL test (Organization+LocalBusiness, WebSite, Product, Article, Speakable, FAQPage, HowTo, BreadcrumbList, CollectionPage+ItemList, AboutPage)

## Debug finale pre-live (20 mag)

- [x] **Smoke test esteso** Vercel prod: 59/59 endpoint 200 OK (7 lingue, 11 categorie, 6 prodotti sample, 5 cura sub, 4 blog post, asset tecnici)
- [x] **Performance** Vercel prod: 0.25–1.26s per pagina
- [x] **HTML weight**: 95–373 KB (gestibile, gzip in prod)
- [x] **Schema validation**: 100% parse-valid JSON-LD su 8 URL test
- [x] **Hreflang completeness**: 8 tag su tutte le pagine
- [x] **Type-check** pulito (tsc --noEmit ✓)
- [ ] **IndexNow setup** — bloccato dal classifier (token file). Da fare con permission rule o manualmente
- [ ] **Lighthouse browser test** — richiede UI manuale (Core Web Vitals LCP/INP/CLS)
- [ ] **Schema Google Rich Results test** — manuale su Search Console post-cutover

## Sessione 20 mag — sera (post audit GEO finale)

GEO audit composito **66/100** ("Fair") + atteso **74** post-cutover dominio + **78** post questi fix on-page. Vedi `GEO-AUDIT-REPORT.md`.

Codice attuato (commit `cc82386` → `16af519`):
- [x] **robots.ts** — aggiunti Bingbot, OAI-SearchBot, Meta-ExternalAgent, FacebookBot, DuckAssistBot, YouBot, Diffbot (lift ChatGPT Web 58→~68, Bing Copilot 49→~60)
- [x] **sitemap.ts** — `x-default` hreflang nelle URL entries (oltre HTTP Link header)
- [x] **Organization sameAs** esteso con LinkedIn/YouTube/Wikidata stub URLs
- [x] **Product schema** — name include colorLabel, leaf BreadcrumbList rinominato `(collezione)`, + `gtin`, `url`, `color`, `category` fields
- [x] **`/llms-full.txt` route handler** — corpus markdown DB-driven (products + materials) + pillar + FAQ
- [x] **llms.txt** — link a llms-full.txt
- [x] **Pillar storia-della-seta-a-como** — 9 H2 (Origini medievali, Cinque/Seicento, Settecento, Ottocento, Le dinastie tessili, Novecento maison, Crisi e globalizzazione, Distretto contemporaneo, SILKinCOM nel distretto) + render code parsing `## ###`
- [x] **Trim home title** 65 → 52 char ("SILKinCOM — Sciarpe in seta e cashmere, Made in Como")
- [x] **Trim home meta description** 247 → 144 char con CTA spedizione gratuita
- [x] **OpenGraph title/description** allineati ai nuovi
- [x] **Glossario tessile `/glossario`** — 20 termini (rouletté, jacquard, twill, satin, mulinello, micron, GSM, denier, filato, ordito/trama, Mongolia, twilly, pashmina, foulard, iridescenza, sericino/fibroina, Seta di Como marchio, stampa quadro/digitale, finissaggio) + FAQPage schema + DefinedTermSet + sitemap entry
- [x] **Founder bio `/maison/marco-dibenedetto`** espanso ~280 → ~880 parole, 9 sezioni editorial, no name-drops competitor, **ITIS Setificio di Como diploma 1998** come ancora E-E-A-T, Person schema con `alumniOf` + knowsAbout esteso
- [x] **Date blog** riordinate cadenza editoriale credibile (no più 4 post stessa data 2026-05-20)
- [x] **Fix hero images `/trame-di-como`** — sposto `public/journal/*` → `public/editorial/*` per evitare redirect 308

### Pending utente (non delegabili — bloccanti go-live)
- [ ] **DNS cutover silkincom.com** (ven 22/05) — single action lift GEO +8
- [ ] `NEXT_PUBLIC_APP_URL` → `https://silkincom.com` su Vercel + redeploy
- [ ] `OPENROUTER_API_KEY` su Vercel env (Production + Preview) + Redeploy
- [ ] `SUPABASE_SERVICE_ROLE_KEY` verifica presenza Vercel
- [ ] `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` LIVE
- [ ] `STRIPE_WEBHOOK_SECRET` LIVE + endpoint `silkincom.com/api/stripe/webhook`
- [ ] `RESEND_API_KEY` LIVE + dominio mittente DNS verificato
- [ ] **DELETE 2 doppioni `compositions`** SQL su Supabase Studio
- [ ] **Smoke test admin → frontend live** UI manuale (login + edit prodotto + traduzione)
- [ ] **Smoke checkout Stripe test** `4242 4242 4242 4242` + webhook + email + magazzino
- [ ] **Backup Wix** + lista 301 redirect Wix → nuovi

### Pending bio founder (non bloccanti, utente quando pronto)
- [ ] **Foto portrait Marco Dibenedetto** — fornire file (jpg/png ~600×800 min) → applicare `<Image>` nella hero `/maison/marco-dibenedetto` + Person schema `image` field
- [ ] **LinkedIn URL profilo Marco** — fornire URL → aggiungere a Person.sameAs + sezione Contatti
- [x] **Nomi reali 3 artigiani** — Paolo (Maestro Tessitore, Cermenate), Adriano (Mastro Tintore, Como), Roberta (Ricamatrice, Como) applicati a `messages/{it,en,es,fr,de,pt,nl}.json` artisans block + sezione "Le persone" del founder bio
- [ ] **Foto reali dei 3 artigiani** — sostituire `/artisans/telaio-artigiano-principale.png`, `/artisans/telaio-silkincom-blu.png`, `/artisans/twill-dettaglio-jacquard.png` con ritratti veri (jpg/png ~800×1000)

### Pending GEO Wk 2-4 (non bloccanti)
- [ ] **Founder bio**: già espanso ad ~880 parole, manca solo portrait + LinkedIn (vedi sopra)
- [ ] **Speakable schema** su `/la-nostra-storia`, `/maison/marco-dibenedetto`, `/faq` mainEntity answers
- [ ] **Width/height su tutti `next/image`** (anti-CLS, 37/39 imgs flagged)
- [ ] **HowTo `/cura-prodotto/{seta,cashmere,lana,lino,cotone}`** — name + image per step
- [ ] **Wikidata stub SILKinCOM** (autoconfirmed unblock ~24/05)
- [ ] **LinkedIn company page SILKinCOM** + linkare founder profile
- [ ] **YouTube channel SILKinCOM** + 4 shorts processo artigianale
- [ ] **IndexNow key file + endpoint** + Bing Webmaster Tools verification
- [ ] **Google Search Console** DNS verification + sitemap submit
- [ ] **Press outreach** lakecomotravel.com, Vogue Italia digital, blog moda IT
- [ ] **Trustpilot setup** + email post-acquisto Brevo workflow

## Sessione 21 mag — security audit pre-live

Audit sicurezza completo pre-cutover. Advisor Supabase: **0 ERROR** (partiti da 3 ERROR + 1 leak view).

- [x] RLS abilitato su `store_settings`/`compositions`/`product_sizes` (migration `023`)
- [x] Inventory RPC `decrement_inventory`/`apply_inventory_movement` — EXECUTE solo `service_role` (migration `024`+`025`)
- [x] `reorder_alerts` view → `security_invoker=true` + REVOKE anon/authenticated — chiudeva leak `cost_price`/`supplier_name`/`estimated_cost` via `/rest/v1/reorder_alerts` (migration `026`)
- [x] `product_review_stats`/`handle_new_user`/`log_order_status_change` — EXECUTE revocato dai ruoli pubblici (migration `026`)
- [x] HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) aggiunto a `next.config.js`
- [x] Secrets: 0 chiavi reali nel repo, `.gitignore` copre `.env*`, 0 var `NEXT_PUBLIC_` sensibili, 0 leak `silkincom.vercel.app` nel codice del sito
- [x] Domini: `robots.ts`/`sitemap.ts`/`llms-full.txt` env-driven; `llms.txt` + schema `@id` su `silkincom.com`
- [x] `tsc --noEmit` pulito

### Residuo non-bloccante (post-launch)
- [ ] `function_search_path_mutable` ×9 — `ALTER FUNCTION … SET search_path = public, pg_temp` (rinviato: tocca funzioni order/inventory critiche, rischio fix > beneficio a ridosso del go-live)
- [ ] `public_bucket_allows_listing` ×4 — restringere la policy SELECT su `storage.objects` per i bucket immagini
- [ ] `auth_leaked_password_protection` — abilitare da dashboard Supabase (Auth → Password settings)
