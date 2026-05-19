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
- [ ] DELETE 2 doppioni `compositions`
  ```sql
  DELETE FROM compositions WHERE id IN (
    '10968fd8-d1e5-42c0-9e53-da347158f301', -- "100% cashmere"
    '8987a45f-07ac-4ef6-ad14-95f78c87b51c'  -- "100% Cotone"
  );
  ```
- [ ] Fix refuso `darsena-bianco.description_long`: "Il cavallo" → "Il cappellino"
- [ ] Riscrivi descrizioni `darsena-blu` e `darsena-verde` (oggi iniziano con "Composizione:…")

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
- [ ] `/`, `/en`, `/es`, `/fr`, `/de`, `/pt`, `/nl`
- [ ] `/collezioni` + ogni `/collezioni/[slug]`
- [ ] `/prodotto/[slug]` sample 3-4 per categoria
- [ ] `/materiali`, `/artigiani`, `/la-nostra-storia`
- [ ] `/trame-di-como` + 1 articolo
- [ ] `/contatti` → invio form
- [ ] `/b2b` → invio richiesta
- [ ] LanguageSwitcher su ogni pagina

### Test mobile + performance
- [ ] Layout mobile su 3 dispositivi
- [ ] Hamburger drawer
- [ ] Lighthouse (Performance > 80, A11y > 90, SEO > 95)
- [ ] Core Web Vitals (LCP, INP, CLS) verdi
- [ ] Rete lenta (DevTools throttling)

### Edge cases
- [ ] `/404` custom page
- [ ] Carrello vuoto
- [ ] Stock esaurito → bottone disabilitato
- [ ] Coupon scaduto / invalido

---

## Ven AM — Pre cut-over

### Codice
- [ ] `NEXT_PUBLIC_APP_URL` su Vercel → `https://silkincom.com`
- [ ] `src/app/[locale]/layout.tsx` schema `@id`: `silkincom.vercel.app` → `silkincom.com`
- [ ] `llms.txt`, `robots.ts`, `sitemap.ts` baseUrl
- [ ] grep URL hardcoded `silkincom.vercel.app` in tutto il repo
- [ ] commit + push + verifica deploy preview

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

- [ ] Politica reso visibile su `/resi`
- [ ] Pagina FAQ pubblicata
- [ ] Form contatti riceve email (test concreto, non solo "no error")
- [ ] Pagina 404 brandizzata
- [ ] favicon + apple-touch-icon + manifest PWA
- [ ] `/security.txt` (responsible disclosure)
- [ ] `silkincom.com/.well-known/*` se servono
