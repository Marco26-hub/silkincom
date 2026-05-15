# SILKinCOM — E-commerce Premium

Nuovo e-commerce per **silkincom.com**: accessori in seta, cashmere, lana, lino e cotone. **Made in Como**.

## Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Pagamenti**: Stripe (Payment Intents + Webhooks)
- **Email**: Resend (transazionali) + Brevo (newsletter)
- **Deploy**: Vercel
- **Analytics**: GA4 + GTM + Meta Pixel
- **GDPR**: Cookie banner consent-first

## Struttura progetto

```
silkincom_claude/
├── docs/                    # Documentazione 6 fasi del progetto
│   ├── 00-brief.md          # Brief originale cliente
│   ├── 01-strategia.md      # FASE 1: Analisi + direzione creativa
│   ├── 02-design.md         # FASE 2: Design system + wireframe
│   ├── 03-database.md       # FASE 3: Schema DB + backend
│   ├── 04-frontend.md       # FASE 4: Frontend pubblico
│   ├── 05-admin.md          # FASE 5: Admin dashboard
│   ├── 06-deploy.md         # FASE 6: Test + SEO + deploy
│   └── avvocato-del-diavolo.md
├── database/                # Schema SQL Supabase
│   ├── schema.sql
│   ├── rls-policies.sql
│   ├── indexes.sql
│   ├── triggers.sql
│   └── seed.sql
├── src/                     # Codice Next.js (da implementare)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── public/
├── scripts/
└── package.json
```

## Setup rapido

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Compilare: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, ecc.

# Run dev server
npm run dev
```

## Automazioni AI (social, blog, upload foto)

Il progetto ora include endpoint pronti per:
- generazione e coda post social automatica
- generazione articoli blog in bozza (o pubblicati)
- inserimento prodotto da foto smartphone con bozza + layout immagini

### Variabili ambiente da impostare

```bash
AUTOMATION_API_KEY= # chiave privata chiamate automazione
CRON_SECRET=        # opzionale (Vercel Cron)
OPENAI_API_KEY=     # abilita generazione AI avanzata
OPENAI_MODEL=gpt-4.1-mini
SUPABASE_PRODUCT_UPLOAD_BUCKET=product-media
```

Se `OPENAI_API_KEY` manca, il sistema usa un fallback template-based (non si blocca).

### Endpoint disponibili

- `POST /api/automation/social`
  - genera post social multi-piattaforma e li accoda in `social_posts_queue`
- `POST /api/automation/blog`
  - genera articolo blog + salva in `blog_posts` (draft/published)
- `POST /api/automation/product-from-photos`
  - accetta `multipart/form-data` (`photos[]`) da mobile, crea bozza prodotto su DB
- `POST /api/automation/run`
  - orchestratore giornaliero (cron) per social + blog

Header sicurezza:
- `x-automation-key: <AUTOMATION_API_KEY>`
oppure
- `Authorization: Bearer <AUTOMATION_API_KEY>`

### SQL da applicare

Eseguire `database/automation.sql` in Supabase SQL Editor per creare la coda social e i log ingestion AI.

### Upload mobile

Pagina operativa:
- `/atelier/ai-upload`

Supporta foto da smartphone (`capture=environment`), genera bozza prodotto e suggerisce layout gallery.

## Direzione creativa scelta

**SILKinCOM Boutique Luxury** — eleganza sobria, caldo italiano, percezione boutique.

- Palette: Avorio (#F7F2EA), Beige cashmere (#C9B79C), Oro champagne (#D4AF37), Nero soft (#171717)
- Font: Cormorant Garamond (serif) + Inter (sans) + Libre Baskerville (accent)
- Mood: Luxury minimal, warm, editoriale, made in Como heritage

## Stato progetto

- [x] FASE 1 — Strategia e architettura
- [x] FASE 2 — Design system e UX
- [x] FASE 3 — Database e backend
- [x] FASE 4 — Frontend pubblico
- [x] FASE 5 — Admin dashboard
- [ ] FASE 6 — Test, SEO, GDPR, Deploy (in progress)

## Note legali

- Dati aziendali (P.IVA, ragione sociale, sede) → **PLACEHOLDER** da verificare con commercialista
- Privacy Policy, Termini, Resi → **PLACEHOLDER** da redigere con legale GDPR

## License

Proprietary © 2026 SILKinCOM
