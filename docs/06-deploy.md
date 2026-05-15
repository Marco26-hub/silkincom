# FASE 6 — Test, SEO, GDPR, Deploy

## 1. Checklist Funzionale

### Front-end
- [ ] Mobile iPhone (Safari)
- [ ] Mobile Android (Chrome)
- [ ] Tablet (iPad)
- [ ] Desktop Chrome / Firefox / Edge / Safari
- [ ] Dark mode (se implementato)

### Shop
- [ ] Filtri funzionanti (categoria, materiale, colore, prezzo)
- [ ] Ordinamento (newest, price asc/desc)
- [ ] Search prodotti
- [ ] Quick view
- [ ] Wishlist add/remove
- [ ] Prodotto esaurito visualizzato (no add to cart)
- [ ] Prodotto con varianti (color picker funziona)
- [ ] Pagination

### Checkout
- [ ] Pagamento riuscito → ordine creato + email
- [ ] Pagamento fallito → no ordine, error visible
- [ ] Coupon valido → discount applicato
- [ ] Coupon scaduto → rejected con messaggio
- [ ] Coupon max_uses raggiunto → rejected
- [ ] Indirizzo mancante → form validation
- [ ] Cliente anonimo (guest checkout)
- [ ] Cliente loggato
- [ ] Webhook Stripe arrives → status update
- [ ] Webhook duplicato → idempotency funziona
- [ ] Stock insufficiente al checkout → error

### Admin
- [ ] Accesso super_admin → tutto visibile
- [ ] Accesso admin → no settings/audit
- [ ] Accesso editor → solo prodotti, blog, media
- [ ] Accesso order_manager → solo ordini
- [ ] Accesso customer → redirect /
- [ ] Creazione prodotto + immagini
- [ ] Modifica prodotto + relations
- [ ] Duplicazione prodotto
- [ ] Eliminazione prodotto (soft delete se ha ordini)
- [ ] Creazione ordine manuale (se prevista)
- [ ] Aggiornamento status ordine
- [ ] Tracking number → email customer
- [ ] Refund → Stripe + DB + inventory
- [ ] Upload immagini media library
- [ ] Modifica contenuti blog
- [ ] Audit log popolato

## 2. Checklist Sicurezza

- [ ] RLS abilitate su TUTTE le tabelle sensibili
- [ ] Service role key SOLO server-side
- [ ] Stripe webhook signature verificata
- [ ] Webhook idempotency (stripe_payment_intent_id UNIQUE)
- [ ] Coupon validation server-side
- [ ] Price calculation server-side
- [ ] Inventory FOR UPDATE lock
- [ ] Input validation Zod su tutti form
- [ ] XSS protection (no dangerouslySetInnerHTML user input)
- [ ] SQL injection protection (parametrized queries)
- [ ] File upload MIME validation
- [ ] File size limit (5MB)
- [ ] Rate limiting su API pubbliche (newsletter, contact)
- [ ] Admin pages auth guard
- [ ] CSRF protection (Next.js default)
- [ ] HTTPS only (Vercel default)
- [ ] CORS restrictive
- [ ] No console.log con dati sensibili in production

## 3. Checklist SEO

### Tecnico
- [ ] Metadata dinamici Next.js (title, description, OG)
- [ ] Schema.org Product (per pagine prodotto)
- [ ] Schema.org Organization (root)
- [ ] Schema.org BreadcrumbList
- [ ] Schema.org Article (blog)
- [ ] sitemap.xml dinamica (`/sitemap.xml`)
- [ ] robots.txt corretto
- [ ] Canonical URLs
- [ ] Open Graph + Twitter Card
- [ ] Alt text TUTTE le immagini
- [ ] Heading hierarchy (h1 unica per pagina)
- [ ] URL pulite (slug semantici)
- [ ] 404 page custom
- [ ] 500 page custom

### Redirect 301 vecchio sito Wix

Mapping da preparare:
- `silkincom.com/category/twilly` → `/collections/twilly`
- `silkincom.com/product/varenna` → `/product/varenna-blu`
- `silkincom.com/about` → `/la-nostra-storia`
- `silkincom.com/blog/articolo-x` → `/trame-di-como/articolo-x`
- (mappa completa da fare audit Wix prima switch)

Implementazione `next.config.js`:
```js
async redirects() {
  return [
    { source: '/category/twilly', destination: '/collections/twilly', permanent: true },
    // ...
  ];
}
```

### Keyword targeting
- sciarpe seta Como
- foulard seta Made in Como
- accessori cashmere italiani
- twilly seta italiano
- sciarpe luxury made in italy
- accessori boutique Como
- tradizione tessile comasca

### Blog content (12 mesi roadmap)
1. "Differenza tra seta, cashmere, lana, lino e cotone"
2. "Come indossare un twilly in 10 modi"
3. "Perché Como è la capitale mondiale della seta"
4. "Come prendersi cura di una sciarpa in seta"
5. "Accessori Made in Como: cosa li rende speciali"
6. "Idee regalo premium in seta e cashmere"
7. "Storia della filiera tessile comasca"
8. "Come scegliere una sciarpa in cashmere"
9. "Stile italiano: l'arte del foulard"
10. "Cinque outfit primavera con accessori SILKinCOM"

## 4. Checklist GDPR

- [ ] Cookie banner consent-first (NO scripts before consent)
- [ ] 3 categorie cookie (necessari/analytics/marketing)
- [ ] Privacy Policy completa (redatta da legale)
- [ ] Cookie Policy completa
- [ ] Termini e Condizioni completi
- [ ] Resi e Rimborsi completi
- [ ] Newsletter checkbox GDPR esplicito
- [ ] Newsletter double opt-in
- [ ] Checkout checkbox privacy + terms
- [ ] Consent log salvato (data + tipo)
- [ ] Data export request endpoint (futuro)
- [ ] Data deletion request endpoint (futuro)
- [ ] DPO contact se applicabile
- [ ] Server EU-only (Vercel EU region)
- [ ] DPA con Stripe, Supabase, Resend, Vercel

## 5. Checklist Performance

### Target Core Web Vitals
- LCP (Largest Contentful Paint): <2.5s
- INP (Interaction to Next Paint): <200ms
- CLS (Cumulative Layout Shift): <0.1
- FCP (First Contentful Paint): <1.8s
- TTFB (Time to First Byte): <800ms

### Lighthouse target
- Performance mobile: >85
- Performance desktop: >95
- SEO: >95
- Accessibility: >90
- Best Practices: >95

### Ottimizzazioni
- [ ] Next/Image ovunque (WebP/AVIF auto)
- [ ] Lazy loading sotto fold
- [ ] Hero priority
- [ ] Font display: swap
- [ ] CSS critical inline
- [ ] Bundle analyzer: no librerie >200KB
- [ ] Tree shaking attivo
- [ ] ISR/SSG dove possibile
- [ ] CDN Vercel Edge
- [ ] Skeleton loading per CLS prevention

## 6. Deploy Vercel

### Setup iniziale
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set env vars
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add RESEND_API_KEY
# ... tutte le env

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Vercel config

`vercel.json`:
```json
{
  "regions": ["fra1"],
  "framework": "nextjs",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### Custom domain
- Aggiungi `silkincom.com` su Vercel project settings
- Configura DNS:
  - A record: `76.76.21.21` (Vercel)
  - CNAME `www`: `cname.vercel-dns.com`
- SSL automatico via Let's Encrypt

## 7. Setup Supabase

```bash
# Install Supabase CLI
npm i -g supabase

# Init project
supabase init
supabase login
supabase link --project-ref <project-ref>

# Apply schema
supabase db push

# Or manual:
psql $DATABASE_URL -f database/schema.sql
psql $DATABASE_URL -f database/indexes.sql
psql $DATABASE_URL -f database/triggers.sql
psql $DATABASE_URL -f database/rls-policies.sql
psql $DATABASE_URL -f database/seed.sql
```

### Storage buckets
1. `product-images` (public read, admin write)
2. `media-library` (public read, editor write)
3. `avatars` (public read, owner write)

### Auth providers
- Email + password
- Google OAuth (opzionale)
- Magic links (opzionale)

## 8. Setup Stripe

1. Create products + prices in Stripe (NO se gestito completamente in DB)
2. Configure webhooks endpoint: `https://silkincom.com/api/stripe/webhook`
3. Eventi da ascoltare:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
5. Test mode → switch a Live quando pronto

## 9. Piano Go-Live

### Pre-launch (T-7 giorni)
- [ ] DNS configurato (no switch ancora)
- [ ] Tutte env production set
- [ ] Database production seedato
- [ ] Test checkout end-to-end (Stripe test mode)
- [ ] Test email transazionali
- [ ] Test admin CRUD completo
- [ ] Test multi-device + multi-browser
- [ ] Lighthouse audit
- [ ] Pagine legali approvate da legale
- [ ] P.IVA + dati aziendali compilati
- [ ] Spedizione zones configurate
- [ ] Coupon iniziale (es. WELCOME15)
- [ ] Backup vecchio sito Wix (export prodotti, ordini, clienti se possibile)
- [ ] Mapping URL redirect 301 completo

### Launch day (T-0)
- [ ] Switch Stripe a Live mode
- [ ] Switch DNS production
- [ ] Verify SSL attivo
- [ ] Test checkout REAL (€1 ordine)
- [ ] Verify email arrivano
- [ ] Verify webhook funziona
- [ ] Submit sitemap Google Search Console
- [ ] Submit sitemap Bing Webmaster
- [ ] Setup GA4 + GTM + Meta Pixel
- [ ] Annuncio social

### Post-launch (T+7 giorni)
- [ ] Monitoring errori (Sentry)
- [ ] Monitoring performance (Vercel Analytics)
- [ ] Verifica indicizzazione Google
- [ ] Check 404 / broken links
- [ ] Verifica conversion funnel GA4
- [ ] Newsletter welcome email
- [ ] Review feedback clienti

## 10. Piano Rollback

Se launch fallisce:
1. **DNS rollback**: ripristina DNS vecchio Wix
2. **Stripe**: switch back to test mode
3. **Database**: snapshot Supabase pre-launch
4. **Codice**: rollback Vercel deployment via dashboard
5. **Comunicazione**: email customers se ordini in transito
6. **Post-mortem**: documenta causa + fix

## AVVOCATO DEL DIAVOLO FINALE

### Top rischi go-live
1. **Stripe webhook URL non aggiornato** → ordini paid ma DB pending
2. **DNS propagation lenta** → utenti vedono vecchio sito Wix per ore
3. **Env var production missing** → 500 errors random
4. **Database migration partial** → tabelle missing → crash
5. **CORS errato** → API calls falliscono dal frontend
6. **Email rate limit** → conferme non arrivano (Resend tier)
7. **Stripe live keys vs test** → pagamenti reali falliscono
8. **Cookie banner non blocca scripts** → multa GDPR immediato
9. **Pagine legali ancora PLACEHOLDER** → blocco legale
10. **P.IVA mancante footer** → non conformità

### Cose facili da dimenticare
- favicon.ico
- apple-touch-icon
- og-image.jpg (1200x630)
- robots.txt allow Googlebot
- sitemap.xml priority + changefreq
- Image alt text Italian (non English)
- Currency display localizzato (€ con virgola)
- Date format italiano (DD/MM/YYYY)
- Phone format italiano (+39)
- VAT number in footer
- Cookie banner per device touch (non solo desktop)
- 404 page con CTA "Torna shop"
- Error boundaries React

### Test critici PRIMA del go-live
1. Acquisto reale con carta vera (€1) end-to-end
2. Refund reale (DB + Stripe + inventory consistency)
3. Newsletter signup + double opt-in
4. Admin login + crea prodotto + pubblica
5. Admin update ordine + email customer arriva
6. Cookie banner accetta tutto → script GA4 carica
7. Cookie banner rifiuta → NO script
8. Mobile iPhone Safari acquisto completo
9. Mobile Android Chrome acquisto completo
10. Cliente con coupon valido vs scaduto

### Priorità correzioni
1. CRITICO: Sicurezza (RLS, webhook, server validation)
2. CRITICO: GDPR (cookie + pagine legali)
3. CRITICO: Checkout end-to-end
4. ALTO: SEO redirect map vecchio sito
5. ALTO: Email transazionali funzionanti
6. ALTO: Admin auth + audit log
7. MEDIO: Performance + Core Web Vitals
8. MEDIO: Schema.org markup
9. BASSO: Microanimazioni polish
10. BASSO: Dark mode (futuro)
