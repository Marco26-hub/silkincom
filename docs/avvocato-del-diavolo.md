# AVVOCATO DEL DIAVOLO — Rischi consolidati 6 fasi

Documento sintesi di TUTTI i rischi identificati. Da rivedere prima di ogni fase implementativa.

## 🚨 TOP 20 RISCHI CRITICI (ordine priorità)

### Sicurezza & Pagamenti
1. **Stripe webhook signature non verificata** → fake webhook crea ordini gratuiti
2. **Idempotency assente nei webhook** → retry crea ordini duplicati
3. **Coupon validation client-side** → cliente applica scaduto/doppio
4. **Product price trustato dal client** → attacker paga €1 invece €190
5. **Inventory race condition** → 2 ordini simultanei stesso prodotto stock 1 → stock negativo
6. **Service role key esposto al client** → breach completo
7. **Server Action senza auth check** → customer modifica prodotti
8. **RLS troppo permissive** → customer vede ordini altri clienti

### GDPR & Legale
9. **Cookie banner non blocca script analytics** → multa GDPR immediato
10. **Newsletter senza checkbox GDPR** → multa
11. **Pagine legali PLACEHOLDER al go-live** → blocco legale
12. **P.IVA / dati aziendali inventati** → frode
13. **Affermazioni "Made in Como" non documentabili** → claim ingannevole

### Operativo
14. **Soft delete prodotti non implementato** → orphan order_items
15. **MIME validation upload assente** → XSS via finto JPG
16. **Email blocking checkout** → timeout = ordine lost
17. **Audit log silent fail** → no traccia azioni admin
18. **Stripe webhook URL non aggiornato in production** → ordini pending forever

### Performance & UX
19. **Cookie banner caricato dopo scripts GA4** → multa
20. **Cart state perso al refresh** → bounce immediato cliente

---

## RISCHI PER FASE

### FASE 1 (Strategia)
- Fotografia prodotto insufficiente → percezione cheap
- Copy sobrio = conversion bassa
- DB schema senza relazioni complete → slug conflicts
- SEO redirect persi vecchio sito Wix
- Admin non realmente usabile

### FASE 2 (Design)
- Cormorant troppo formal (forced elegance)
- Color #D4AF37 contrast WCAG fail
- Whitespace random vs intentional
- Mobile responsiveness neglected
- Hover states assenti = "dead" UX
- Form input border 1px = hard find

### FASE 3 (Database & Backend)
- RLS isolation customer (ordini altri clienti)
- FK ON DELETE wrong policy → orphan
- No price snapshot in order_items → broken historical
- Coupon redemptions duplicate
- Customer can update order status via API
- Trigger silent fail (inventory non decrementato)
- Email blocking ordine

### FASE 4 (Frontend)
- Hydration mismatch cart count
- Stripe Element non carica → no fallback
- Webhook arriva prima redirect → polling needed
- Image priority all → slow LCP
- Wishlist solo localStorage → perso cambio device
- Cart state perso refresh
- Filtri shop full reload

### FASE 5 (Admin)
- Server Action senza auth check
- Service role key client-side
- Image upload no MIME server-side
- Audit log best-effort
- Refund senza state check
- Stock restore senza lock
- Order status transition libera
- Settings caricati anche se vuoti
- Newsletter export senza filter consenso
- Bulk operations assenti

### FASE 6 (Deploy)
- Stripe webhook URL non aggiornato
- DNS propagation lenta (vecchio Wix visibile)
- Env var production missing
- Database migration partial
- CORS errato
- Email rate limit Resend
- Stripe live vs test keys
- favicon, og-image, robots.txt missing
- Pagine legali ancora PLACEHOLDER

---

## CHECK PRE-PRODUCTION (must-pass)

- [ ] Stripe webhook signature verified ✓
- [ ] Stripe webhook idempotency (PI ID UNIQUE) ✓
- [ ] Coupon validation server ✓
- [ ] Price calculation server ✓
- [ ] Inventory FOR UPDATE lock ✓
- [ ] RLS policies ENABLE on all tables ✓
- [ ] Service role key SOLO server ✓
- [ ] Cookie banner consent-first ✓
- [ ] Newsletter checkbox GDPR ✓
- [ ] Pagine legali approvate da legale ✓
- [ ] P.IVA + dati aziendali REAL ✓
- [ ] Test checkout REAL €1 ✓
- [ ] Test refund REAL ✓
- [ ] Test admin CRUD ruoli diversi ✓
- [ ] Lighthouse mobile >85 ✓
- [ ] WCAG AA contrast ✓
- [ ] Schema.org Product ✓
- [ ] Sitemap + robots ✓
- [ ] 404 + 500 custom ✓
- [ ] Backup vecchio sito ✓
- [ ] Mapping URL redirect 301 ✓
- [ ] Sentry / error monitoring ✓
- [ ] DPA con Stripe/Supabase/Resend/Vercel ✓

---

## COSE CHE CLIENTE PREMIUM NOTA SUBITO

1. Font rendering (cheap = whole site cheap)
2. Image quality (mediocre = "stock photo")
3. Pixel alignment (off by 2px = sloppy)
4. Color consistency (oro shifting = amateurish)
5. Hover states (absent = dead)
6. Loading states (generic spinner = no polish)
7. Empty states (bland = forgotten)
8. Footer (too many links = marketplace)
9. Animation timing (>500ms = laggy)
10. Mobile menu transition (jerky = cheap)
11. Cart drawer animation
12. Image gallery zoom smoothness
13. Form validation tone (red harsh vs subtle)
14. Toast notifications (generic vs branded)
15. Microcopy quality (Italian native, not translated)

---

## PRIORITÀ FINALE

### CRITICO (blocca go-live)
- Sicurezza pagamenti (Stripe + RLS + server validation)
- GDPR (cookie + pagine legali + newsletter consent)
- Pagine legali REAL (no PLACEHOLDER)
- Dati aziendali REAL (P.IVA, sede)
- Checkout end-to-end funzionante
- Admin auth guards

### ALTO (1 settimana post-launch)
- SEO redirect 301 mapping completo
- Email transazionali tutte funzionanti
- Audit log completo
- Performance Core Web Vitals
- Schema.org markup
- Refund flow tested

### MEDIO (1 mese post-launch)
- Microanimazioni polish
- Bulk operations admin
- Dashboard analytics avanzati
- Wishlist sync DB
- Realtime notifications

### BASSO (roadmap)
- Dark mode
- Multi-currency
- Multi-language (EN, FR, DE)
- Reviews sistema completo
- Loyalty program
- Mobile app
