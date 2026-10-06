# SILKinCOM e-commerce (silkincom_claude)

Lingua: italiano (risposte); codice/commit in inglese. Cartella: `/Users/md/silkincom_claude`.
Regole base: niente fallback silenziosi (ogni skip/rifiuto nel log col motivo); verifica prima di dichiarare fatto; chiedi conferma prima di push/deploy.

## Scopo / business
E-commerce luxury di accessori in seta, cashmere, lana, lino e cotone, Made in Como (tradizione dal 1400). Owner: Marco Dibenedetto (impresa individuale, unico gestore di dev, ops, marketing, finance). 7 lingue (it/en/es/fr/de/pt/nl), ~41 prodotti, 10 categorie (bellagio, cernobbio, tremezzo, varenna, twilly-como, darsena, lario, melzi, riva, tivan), 3 collezioni (inverno, iconica, primavera). Ricostruzione Next.js del vecchio sito Wix. Oltre al sito: blog "Trame di Como", social (Blotato), B2B lead outreach, admin CMS.

## Stack (versioni installate in node_modules)
Next.js 15.5 (App Router) · React 19.2 · TypeScript 5.9 · Tailwind 3.4 + tailwindcss-animate · next-intl 4.11 · Supabase (`@supabase/ssr` + supabase-js 2.x, Postgres+RLS+Storage) · Stripe 17 (+ react-stripe-js) · React Query 5 · Zustand · react-hook-form + zod · framer-motion 11 · Resend (email) · Brevo (newsletter) · OpenRouter (traduzioni/AI admin). `remotion/` e' un progetto isolato: Remotion 4.0.495, React 19.0.0. Hosting Vercel, region fra1.
(Il README dice Next 14: e' obsoleto, vale package.json.)

## Struttura cartelle (verificata con ls)
- `src/app/[locale]/` pagine pubbliche (prodotto, collezioni, trame-di-como, checkout, account, admin, b2b, recesso, press, maison...); `src/app/api/` (stripe, cron, automation, b2b, reviews, google-merchant, tiktok-shop, etsy, recesso, antibot...)
- `src/components/` (admin, cart, product, collezioni, sections, seo, b2b, antibot, recesso, ui...) · `src/lib/` (supabase, antibot, blog/editorial-standards, ads, analytics...) · `src/data/` (products.json, catalog*.ts, blog.json, posts.ts) · `src/i18n/` · `src/middleware.ts` · `src/store/` · `src/config/shipping.ts`
- `messages/{it,en,es,fr,de,pt,nl}.json` testi UI · `public/` asset sito (logo-official.*, logo-gold.*, products/, editorial/)
- `database/` schema.sql, rls-policies, triggers, seed, `migrations/` (3 file) · `supabase/migrations/` (56 file, 001..056) e `supabase/functions/` (Deno: migrate-wix-*, compress-product-images, ecc.)
- `scripts/` seed-products.ts, translate-i18n.mjs, agnes.mjs, agnes-img.mjs, agnes-api.md, `blog/` (3 script), optimize-images.mjs, setup-db.sh
- `remotion/` studio video (src/Root.tsx con ~100 composizioni, public/ asset e musiche, out/ render) · `.agents/skills/` skill (agnes, silkincom-logo, silkincom-blog); `.claude/skills/` e' copia da riallineare
- `social/` (GITIGNORED, non in git) asset/doc social · `ugc/` lavorazioni UGC per linea · `consegna_finale/` consegne approvate · `tmp/` prove · `docs/` 6 fasi + B2B (`07`, `08`)
- Documenti: `HANDOFF.md` (66KB, stato e §7 problemi), `MEMORIA.md` (290KB, indice in testa), `README.md`, `SUPABASE_SETUP.md`, `LAUNCH-CHECKLIST.md`, audit `GEO-*`, `COMPLIANCE-*`, `SEO-*`, `MARKETING-*`

## Comandi (package.json)
- `npm install` · `npm run dev` (next dev) · `npm run build` · `npm start` · `npm run lint` · `npm run type-check` (tsc --noEmit) · `npm run format`
- DB: `npm run db:push` · `db:reset` · `db:seed` · `seed:products` (products.json -> DB, serve service role)
- i18n: `npm run translate:check` (cosa manca) · `npm run translate` (serve chiave AI)
- Non c'e' uno script di test. Verifica standard = `npm run type-check` (0 errori attesi).
- `npm run build` in locale FALLISCE (prerender senza env Supabase, es. `supabaseUrl is required`, feed google-merchant): non e' un bug, su Vercel le env ci sono.
- Preview: `.claude/launch.json` ha `silkincom` (porta 3010) e `remotion-studio` (3011).
- Remotion (da `remotion/`): `npm run preview` (studio) · `npx remotion render <CompId> out/x.mp4 --props='{...}'` · `npm run still`.
- Deploy: push su `main` = deploy automatico Vercel (progetto `silkincom`, team marco26-hub). CLI loggata: `vercel ls silkincom`, `vercel inspect <url> --logs`.

## Variabili d'ambiente (solo nomi, da `.env.example`; i valori stanno in `.env.local` e su Vercel, MAI nei file)
- Sito: `NEXT_PUBLIC_APP_URL` (deve essere https://www.silkincom.com), `NEXT_PUBLIC_SITE_NAME`, `NODE_ENV`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (assente in locale: le route DB-backed rendono solo in prod), `NEXT_PUBLIC_SUPABASE_OAUTH_REDIRECT`, `SUPABASE_PRODUCT_UPLOAD_BUCKET`
- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook `/api/stripe/webhook`, evento payment_intent.succeeded)
- Email: `RESEND_API_KEY`, `RESEND_DOMAIN_VERIFIED`, `B2B_FROM_EMAIL`, `B2B_NOTIFICATION_EMAIL`, `B2B_REPLY_TO_EMAIL`, `CONTACT_EMAIL_TO`, `RESEND_WEBHOOK_SECRET`, `INBOUND_EMAIL_WEBHOOK_SECRET`, `LEAD_PUBLIC_LINK_SECRET`; newsletter `BREVO_API_KEY`, `BREVO_LIST_ID`
- Analytics: `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TRUSTPILOT_BUSINESSUNIT_ID`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- Automazione/AI: `AUTOMATION_API_KEY`, `CRON_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENROUTER_API_KEY`, `TRANSLATE_MODEL` (in prod il generatore blog usa OpenRouter; la chiave si puo' inserire da Admin > Blog)
- Lead B2B: `GOOGLE_SEARCH_API_KEY`, `GOOGLE_CSE_ID`, `NOMINATIM_API_URL`, `OVERPASS_API_URL`
- Fuori da `.env.example` ma citate in memoria: `ETSY_API_KEY` (Etsy ancora in attesa), `AGNES_API_KEY` oppure file `AGNES.txt` in root (gitignored). Altre: da verificare.

## Servizi e link
- Live: https://www.silkincom.com (apex fa 307 verso www: usare www nei check) · preview https://silkincom.vercel.app
- GitHub: https://github.com/Marco26-hub/silkincom (branch `main`) · Vercel progetto `silkincom` · Supabase project ref `fjudulhxsafjizcmrifw` (MCP Supabase)
- Cron Vercel (vercel.json): `/api/cron/lifecycle` ogni 30 min, `sync-financial` 03:00, `sync-ads` 03:30, `sync-merchant` 04:00
- Stripe live, Resend (dominio silkincom.com), Google Merchant feed `/api/google-merchant/feed.xml`, Etsy `silkincom.etsy.com`
- Social via Blotato MCP: IG @silkincom.official (49996), FB "SilkinCom" (34287, pageId 836145059577999), YouTube (38509), Pinterest (6928, board 928867560585779074), Threads (7083), TikTok @silkincom (44432). Cap 200 post schedulati.
- Agnes AI (image-to-video e immagini): https://apihub.agnes-ai.com

## Pipeline contenuti / skill
Leggi la skill PRIMA di lavorare: `.agents/skills/agnes/SKILL.md` (reel/UGC/caroselli), `silkincom-logo` (logo Lago di Como), `silkincom-blog` (articoli).
- Agnes video: `node scripts/agnes.mjs i2v --image <URL_PUBBLICO> --prompt "..." --frames 121 --fps 24 --width 768 --height 1024 --out remotion/public/x.mp4` (anche `create`/`poll`). Immagine = URL pubblico (no base64), frame 8n+1, rate limit 1-2 req/min. Obiettivo 192 frame (~8s) solo su capo tinta unita, prompt "subtle motion", poi controllo frame per frame.
- Agnes immagini: `node scripts/agnes-img.mjs edit --ref foto.png [--ref macro.png] --size 2K --ratio 3:4 --out x.png --prompt "..."` (ratio 4:5 non ammesso: generare 3:4 e tagliare). Il marchio non si fa generare: si ricomposita con Pillow.
- Remotion: template InvernoReel (foto ferme), DarsenaVipReel, SilkReel, SlideMag/SlideCard (caroselli 4:5), NeroReel, LookReel, ReelCover (copertina IG). Reel 9:16 1080x1920, safe-zone: niente testo/logo nel ~20% basso.
- Upload media su Blotato: `blotato_create_presigned_upload_url` -> PUT del file -> publicUrl in `blotato_create_post(scheduledTime ISO UTC)`. Cadenza blast UTC: FB 11:30, YT 12:00, Pinterest 13:00, IG 14:30, Threads 16:30, TikTok 18:00.
- Blog: `python3 scripts/blog/foto-usata.py cache|check` (aHash: 0-25 gia' usata, >50 libera) · `node scripts/blog/upsert-articolo.mjs <cartella> <prefisso> draft|published <ISO>` (data futura = programmato) · `node scripts/blog/anteprima-articolo.mjs <slug> --out anteprima.html`. Dopo il push attendere deploy Ready e foto 200 su www, poi upsert.
- Strumenti di pipeline (ricolorazione, patch): in `ugc/lario-bianca-ricamo/09_tools/`, MAI in /tmp (un riavvio li cancella).

## Regole e preferenze di Marco
- ANTEPRIMA SEMPRE prima di spedire: mandare file/anteprima e attendere "ok" esplicito prima di schedulare/pubblicare (reel, caroselli, story, articoli). Una linea di prodotto per anteprima.
- Il capo non si fa generare dall'AI (image-to-video storpia il tessuto): si mostra con le foto vere del sito/packshot. AI solo per scene/ambiente. Mai reel con persone AI (uncanny, rifiutato).
- Niente doppioni: una idea = un pezzo forte; ogni slide diversa. Caption corte (<= ~200 car.), IG max 5 hashtag (limite duro), TikTok 5, YouTube titolo <100 + #Shorts, Pinterest senza hashtag, Threads una frase.
- Prima di scegliere una data scaricare TUTTA la coda Blotato (`blotato_list_schedules`); verificare il conteggio (tetto 200). IG story NON schedulabili su Blotato (saltano in silenzio): a mano. Threads con video e' flaky: usare immagine.
- Nomi e tipi prodotto ESATTI dal DB/catalogo: Cernobbio/Varenna/Tremezzo = sciarpe, solo Bellagio = pashmina, Como = twilly; Lario T-shirt, Darsena cappellino, Melzi pantaloncino, Riva camicia lino, Tivan cotone.
- Logo Lago di Como: solo dal simbolo ufficiale (`remotion/public/logo.png` = `public/logo-official.png`), mai ricalcato da foto. Mai vestire un capo con marchio di terzi.
- Foto: scelte e preparate con criterio (crop a piena risoluzione, mai pezzi di collage); verificare che non siano gia' state pubblicate; non fidarsi dei nomi file. Riusare gli asset gia' in `remotion/public` (musica compresa); scaricare da Pixabay solo se nessuna traccia e' adatta.
- Reel: testi lenti, zoom lento; stessa traccia per le copie piattaforma dello stesso reel; fix audio/foto: controllare che non si perda l'audio.
- Blog: un articolo = un protagonista; traduzioni professionali (registro formale per lingua); la bozza AI va sempre riletta.
- Filtri dati (es. ordini test) a livello DB (`.not('orders.is_test','is',true)`), mai filtro JS su embed.
- Marco chiede risposte in italiano, sintetiche. Non andare live senza approvazione esplicita.

## Stato attuale e TODO (da HANDOFF.md, aggiornato 30/09/2026)
- Branch locale ora `main` (HANDOFF dice ancora `codex/deploy-current-origin`: obsoleto); ~396 file modificati/untracked di piu' sessioni, non committati. Separare il perimetro prima di ogni commit.
- Capsule uomo Inverno 2026 (Brunate €145, Menaggio €79, Domaso €119; anteprima -10%): landing `/collezioni/inverno` e entrata home fatte in locale, NON committate ne' pubblicate. Draft admin solo Menaggio (`153cc980-...`); Brunate/Domaso da completare; upload immagini admin bloccato da accesso Chrome ai file. Confermare data spedizione, scadenza -10%, claim origine prima dei preordini.
- Prossimo: tre Reel UGC (Agnes + Remotion), uno per prodotto; fare e MOSTRARE prima Brunate, attendere ok, poi Menaggio e Domaso.
- Reel in attesa di OK Marco (twilly-aperol, riva-lino-uomo, melzi-lino-uomo, Tivan). Coda Blotato era a 194/200 il 18/09: ricontrollare.
- Owner (non-code): ManyChat, bio-link UTM, Meta Pixel ID, GBP+Trustpilot, applicare migration `053` a prod, approvare recensione Melzi Beige, leaked-password Supabase, upgrade Postgres, verifica dominio Resend e webhook Stripe, stock a 0 (apparel, tivan, bellagio-2/3/4), `OPENROUTER_API_KEY` valida su Vercel. Stato reale di ciascuno: da verificare.

## Trappole note
- Push riuscito != deploy riuscito: dopo ogni push `vercel ls silkincom`. Prod e' rimasta ferma ~10 giorni (08-18/09) per `src/lib/analytics.ts` non committato ma importato. Prima di committare file che importano moduli nuovi: `git ls-files`.
- Piu' agenti (Claude/Codex) pushano su `main`: prima di push `git fetch origin && git status`, poi `git pull --rebase origin main`, `npx tsc --noEmit`, push. Migration condivise: ri-verificare (053 ha rotto la privacy di `reviews_public`, fix in 054).
- Esiste anche la copia `/Users/md/pulizie srl/silkincom` (stesso repo): la preview `silkincom-clone` (porta 3200) punta li', `silkincom` (3010) qui. Controllare di guardare la copia giusta.
- Catalogo: `catalog.ts` (server, DB) vs `catalog-meta.ts` (client-safe): i client importano solo da `catalog-meta`. `createPublicClient()` per unstable_cache, mai `createServerClient()`. Ogni mutazione admin prodotto chiama `revalidateCatalog()`.
- Remotion `--props` non azzera i defaultProps: passare tutti i campi. Packshot a fondo bianco: scontorno vero, non blend.
- Footage/post gia' pubblicati non si annullano: cambiare musica PRIMA dell'orario.
- Nessun segreto nei file: `.env.local`, `AGNES.txt` sono gitignored.

## Contesto consolidato
- `MEMORIA.md` (questa cartella): tutta la memoria Claude consolidata, indice in testa. Leggi l'indice, poi le sezioni utili al compito (non tutto: è grande).
- Skill di progetto in `.agents/skills/`: agnes (pipeline reel/UGC), silkincom-logo,
  silkincom-blog (articoli Trame di Como: standard, foto, 7 lingue, scheduling).
  Le stesse skill sono linkate in `~/.codex/skills/`, quindi Codex e Claude leggono la stessa fonte:
  modifica solo `.agents/skills/` (la copia in `.claude/skills/` va riallineata con `cp -R`).
- Script blog in `scripts/blog/`: `foto-usata.py` (una foto si usa una volta sola),
  `upsert-articolo.mjs` (carica/programma), `anteprima-articolo.mjs` (anteprima per Marco).

## VERIFICA UNA TANTUM (solo alla PRIMA richiesta in questa cartella)
Se NON esiste il file `.migrazione-verificata`:
1. Prima di rispondere alla richiesta, confronta `MEMORIA.md` con lo stato reale: i file/cartelle/comandi citati esistono? URL/link/deploy coincidono con `~/.codex/PROJECTS.md`? Stack in `package.json` coerente con quanto scritto?
2. Elenca in max 10 righe le discrepanze (o "nessuna") e correggi `AGENTS.md`/`MEMORIA.md` solo dove l'errore è certo.
3. Crea `.migrazione-verificata` con data e esito. Poi rispondi alla richiesta dell'utente.
Se il file esiste: salta tutto, non ripetere mai.
