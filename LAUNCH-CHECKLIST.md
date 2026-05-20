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
