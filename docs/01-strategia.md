# FASE 1 — Strategia e Architettura

## 1. Analisi sito attuale (silkincom.com)

### Struttura osservata
- Piattaforma: **Wix**
- Header minimal: logo oro, dropdown lingua, carrello, hamburger
- Hero: typography grande "SILKINCOM", claim "Accessori in pura seta e cashmere . 100% Made in Como", CTA "Collezione 2026"
- Sezioni: Collezioni (Twilly, Bellagio, Cernobbio, Tremezzo, Varenna), categorie (cappellini, camicie, T-shirt), materiali (Seta, Cashmere, Lana), prodotti spring
- Palette: oro (#D4AF37), bianco caldo, beige, grigio
- Typography: maiuscole serif headline, sans body

### Punti forti
- Brand identity chiara
- Claim immediato
- Sezione materiali educativa
- Storytelling "Dal cuore di Como"

### Debolezze critiche
- Wix non scalabile per e-commerce premium complesso
- Menu invisibile, non strutturato visibilmente
- UX checkout generica
- Admin = solo Wix dashboard
- Performance bundle pesante, no SSR
- Customizzazione limitata
- SEO boilerplate Wix
- Integrazioni marketing automation limitate
- Sembra "carino" non "premium"
- GDPR cookie banner generico
- Nessun social proof / trust signals avanzati
- Collezioni hard-coded, non scalabili

### Problemi operativi
- Dashboard Wix non adatta ecommerce B2C premium
- Nessun control ruoli admin
- Media library limitata
- Attributi prodotto non sofisticati
- Coupon/sconto logica semplice
- Ordini non collegabili a CRM
- No audit log

---

## 2. Direzioni creative (3 opzioni)

### OPZIONE 1: SILKinCOM Boutique Luxury ⭐ SCELTA

**Mood**: Elegante, caldo, artigianale, boutique italiana di lusso sobrio

**Palette**:
- Avorio caldo: `#F7F2EA`
- Beige cashmere: `#C9B79C`
- Oro champagne: `#D4AF37`
- Nero morbido: `#171717`
- Bianco caldo: `#FFFDF8`
- Grigio perla: `#D8D5CF`

**Typography**:
- Headline: Cormorant Garamond (serif elegante)
- Body: Inter (sans moderna)
- Accent: Libre Baskerville (quote/storytelling)

**Vantaggi**: Massima differenziazione, percezione premium massima, defensible pricing, LTV elevato, SEO differenziato.
**Rischi**: Conversione minore se copy troppo sobrio, richiede fotografia eccezionale.
**Target**: Donne 35-65, high-income, decision lente, willing premium +50%.

### OPZIONE 2: SILKinCOM Como Heritage

**Mood**: Narrativo, editoriale, lago, tradizione tessile, storytelling

**Palette**: Bianco candido, blu lago (#1F3A4A), beige carta, oro vintage (#A89960)
**Font**: Playfair Display + Manrope + EB Garamond
**Vantaggi**: Content marketing forte, SEO heritage, social ricco.
**Rischi**: Conversion dipende da contenuti, alto budget, no urgency.

### OPZIONE 3: SILKinCOM Contemporary Silk

**Mood**: Moderno minimal, internazionale, design-forward
**Palette**: Bianco, nero, accent stagionali rotanti
**Font**: Instrument Serif + Satoshi
**Vantaggi**: Conversion massima, mobile naturale, scalabile.
**Rischi**: Standard luxury template, no differentiation.

---

## 3. Sitemap completa

```
/
├── /shop
│   ├── /category/[slug]
│   ├── /collection/[slug]
│   └── /product/[slug]
├── /collections (twilly, bellagio, cernobbio, tremezzo, varenna)
├── /materials (seta, cashmere, lana, lino, cotone)
├── /la-nostra-storia
├── /trame-di-como (magazine)
│   └── /articolo/[slug]
├── /cart
├── /checkout
├── /thank-you
├── /(auth) — login, register, forgot-password
├── /account — orders, addresses, wishlist
├── /contact, /faq, /shipping-returns
├── /privacy-policy, /cookie-policy, /terms
└── /(admin) [protetto]
    ├── /dashboard
    ├── /products, /orders, /customers
    ├── /collections, /categories, /materials, /colors
    ├── /coupons, /shipments
    ├── /blog, /media, /newsletter
    ├── /settings, /audit-log
```

---

## 4. Menu (desktop + mobile)

### Desktop
```
Logo  |  Shop | Collezioni | Materiali | Storia | Magazine  |  🔍 👤 🛍️
```

### Mobile hamburger
```
Shop ▾ → Tutte / Primavera / Iconica / Limited
Storia
Materiali
Magazine
Contatti
Account
```

---

## 5. Architettura tecnica

```
┌─────────────────────────────────────────┐
│       VERCEL EDGE NETWORK               │
│  (CDN, API routes, middleware, cache)   │
└─────────────────────────────────────────┘
              ▼
   ┌──────────────────────┐
   │  NEXT.JS APP ROUTER  │
   │  SSR/SSG/Server Acts │
   └──────────────────────┘
        ▼            ▼
┌────────────┐  ┌──────────┐
│ SUPABASE   │  │ STRIPE   │
│ Auth/DB/St │  │ PI+Hooks │
└────────────┘  └──────────┘
```

---

## 6. Flussi e-commerce principali

### Browse → Cart → Checkout → Order
1. Cliente browsa shop → filtra
2. Click prodotto → page dettagli
3. Seleziona variante → add to cart
4. Cart page → coupon, shipping
5. Checkout → form dati + indirizzo
6. Server-side: ricalcolo totale, validazione coupon
7. Stripe Payment Intent
8. Cliente paga via Stripe Element
9. Webhook Stripe → verifica firma → update order status `paid`
10. Decrementa inventory
11. Send email conferma (Resend)
12. Redirect thank-you page

### Newsletter
1. Cliente inserisce email
2. Validazione server-side
3. INSERT newsletter_subscribers (consent_gdpr=true)
4. Send confirmation email
5. Click confirm link → is_confirmed=true
6. Sync con Brevo list

---

## 7. Schema admin (overview)

- Dashboard: KPIs (revenue, orders, AOV, customers), grafici, ordini recenti, low stock
- Sezioni: Prodotti, Ordini, Clienti, Collezioni, Categorie, Materiali, Colori, Coupon, Spedizioni, Blog, Media, Newsletter, Settings, Audit Log
- Ruoli: super_admin, admin, editor, order_manager, customer

---

## AVVOCATO DEL DIAVOLO — FASE 1

### Rischi critici
1. **Percezione premium vs realtà operativa** → checkout deve matchare design homepage
2. **Fotografia prodotto insufficiente** → budget €3-5k shoot iniziale
3. **Copy sobrio = conversion bassa** → aggiungi smart CTA "Limited quantity" dove vero
4. **DB non relazionale abbastanza** → schema con slug unique per product-color-material combo
5. **RLS insufficiente** → customer vede ordini altri = breach legale
6. **Admin non realmente usabile** → bulk actions essenziali
7. **SEO redirect persi** → mapping vecchie URL → nuove + 301
8. **Stripe webhook idempotency** → retry crea ordini duplicati

### Errori probabili
- Stripe key esposta nel client
- Coupon validato client → server calcola diverso = dispute
- Slug non sanitizzato → URL broken
- Newsletter senza GDPR checkbox → multa
- Font cheap → sito sembra economico
- Hover states assenti → no polish

### Cose che cliente premium nota subito
- Font choice (cheap = whole site cheap)
- Photo quality
- Micro-spacing inconsistent
- Color consistency (oro shifting)
- Hover states absent
- Loading states generici
- Empty states bland

### Cose che rompono checkout/admin/database
- Stripe API fail → no fallback → ordine mai creato
- Cart price client-side → server ricalcola diverso
- Payment intent expired → cliente paga ma ordine non crea
- Stock NULL dopo race condition → phantom order

### Priorità correzione
1. ALTO: Schema DB (relazioni, RLS)
2. ALTO: Checkout server-side (Payment Intent → webhook)
3. ALTO: Admin CRUD base
4. MEDIO: Fotografia prodotto + microanimazioni
5. MEDIO: SEO redirect map
6. BASSO: Wishlist, reviews, abandoned cart email (FASE 2)
