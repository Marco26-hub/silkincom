# Interventi AEO SILKinCOM del 26 novembre 2026

Push, deploy e migration sono stati approvati da Marco nella chat. La migration 061 è applicata in produzione; il rilascio del codice è in corso nel worktree isolato `codex/aeo-security-release`, integrato sulla versione remota più recente. Il PDF fornito assegna punteggi qualitativi preliminari: non esiste una misura ufficiale AEO che consenta di certificare automaticamente 100/100 per autorevolezza, reputazione o visibilità nelle AI.

## Correzioni applicate

| Area dell’audit | Intervento verificabile |
| --- | --- |
| Identità del brand | Definizione permanente della Maison condivisa tra home, Press Room, Organization e indice AI. Su richiesta di Marco, eliminato il blocco dedicato: la definizione è integrata in un paragrafo del racconto Maison esistente, senza nuova sezione o titolo. Distinta la storia del distretto dalla data di fondazione del brand. |
| Filiera | Inserite le conferme del titolare: prodotti e ricamo realizzati da artigiani comaschi; twilly e pashmine in cashmere tessuti, tinti e rifiniti a Como. Distinte origine della fibra e lavorazione; rimosse dalle FAQ attestazioni generiche di certificazione e provenienza non documentate. |
| Informazioni commerciali | Checkout e API allineati alle tariffe pubblicate: Italia €9/gratis da €200, UE €18/gratis da €350, UK/CH/NO €25, altre destinazioni €35. Consegna a mano e coupon di spedizione gratuita restano gratuiti. Schede in sette lingue allineate alla consegna Italia 2–4 giorni lavorativi; preparazione 0–1 e transito 2–3 giorni nello schema e nel feed. Twilly Como 120 × 7,5 cm distinti dal formato generico 85 × 5 cm. |
| Materiali e prezzi | Prezzi della pagina Materiali letti dal catalogo: eliminati i valori statici discordanti (Como Elegante 90 → 75 euro, Bellagio 170 → 120 euro, Tremezzo Azzurra 120 → 70 euro, rilevati al controllo). Eliminate specifiche generiche in micron, lunghezza del cotone e benefici non documentati. |
| Product e Offer | SKU reali del catalogo; composizione effettiva; prezzo, disponibilità e spese coerenti. Eliminato l’Offer aggiuntivo delle recensioni che dichiarava sempre InStock. ProductGroup per prodotti con più taglie, con URL che preselezionano la variante e stock di ogni taglia. |
| Journal | Normalizzazione sicura del testo legacy e dei titoli; mantenuti confini di paragrafi e titoli. Article e breadcrumb localizzati, autore collegato al profilo, data di modifica dal CMS. Rimossi HowTo fissi in italiano che non corrispondevano alle singole pagine tradotte. |
| Traduzioni | Sei traduzioni locali per l’articolo Lario rimasto solo in italiano. Le traduzioni CMS continuano ad avere priorità; il bundle locale vale solo per la versione sorgente verificata tramite SHA-256. Metadati SEO assenti nel CMS sono ricavati da titoli ed excerpt localizzati. |
| Internazionalizzazione | Corrette canonical e hreflang di B2B e Recensioni; riparata la chiave numerica mancante che impediva il rendering delle sei Experience tradotte. |
| FAQ | Contenuto visibile e FAQPage concordanti; collegamenti all’assistenza mantengono la lingua selezionata. |
| Crawl | Accesso alle pagine pubbliche verificato con gli user-agent principali. Regole private estese ai percorsi localizzati; feed Merchant consentito. GPTBot e OAI-SearchBot restano distinti. La precedente autorizzazione al training non cambia. |
| Sitemap | Ogni URL localizzato ha un proprio record e alternates reciproci, incluso x-default. Prodotti solo pubblicati; date sconosciute omesse anziché rigenerate artificialmente. Errori delle fonti registrati e nessuna sitemap parziale di successo. |
| Corpus AI | Riparate query a colonne inesistenti: materials.slug, materials.is_active e products.material_id. SKU, prezzi e stock dal catalogo pubblicato. In caso di errore, risposta 503 esplicita al posto di un corpus vuoto con HTTP 200. |
| Dominio | Canonical, identità, email, feed e corpus condividono https://www.silkincom.com anche con env locale o preview. |
| Misurazione | Referral osservabili da ChatGPT, Perplexity, Claude, Gemini e Copilot riconosciuti come ai_assistant; UTM espliciti conservati e attribuzione lungo il funnel. Google/Bing non vengono classificati automaticamente come AI. |
| Reputazione | Snapshot Trustpilot esistente accompagnato dalla data di rilevazione, 15 settembre 2026. Nessuna nuova valutazione inventata; nessuna recensione o citazione indipendente generata. |

## Verifiche e anteprime

- `local-check.json`: controllo HTTP di 105 pagine campione, 1.331 verifiche superate prima dell’estensione completa.
- `verification-summary.json`: 9.889 verifiche superate su 903 URL della sitemap, con ricontrolli mirati dopo le correzioni. `local-full-check.json` conserva il primo esito (45 anomalie), `rechecked.json` e `reviews-recheck.json` documentano le correzioni; `post-security-check.json` e il ricontrollo del Journal verificano il campione dopo l’aggiornamento del framework. Experience mantiene intenzionalmente noindex in sviluppo; la configurazione di produzione è distinta.
- `live-before-check.json`: baseline pubblica precedente alla pubblicazione. Lo stesso insieme di controlli segnala difformità reali; i conteggi non rappresentano un punteggio AEO.
- `content-inventory.json`: 32 articoli pubblicati. Un articolo privo di titolo/excerpt/corpo in sei lingue coperto dal bundle locale. 120 campi SEO dedicati assenti nel CMS: il rendering usa già metadati nella lingua della pagina.
- `preview/browser-check.json`: 13 controlli browser desktop/mobile superati, senza errori JavaScript. Verificati link localizzati, misura del Twilly, provenienza, taglia M da URL e assenza di overflow mobile.
- `node --test scripts/seo/test-aeo.mjs`: otto controlli su testo HTML, link, JSON-LD, attribuzione, spedizione per destinazione e struttura delle traduzioni.
- `npm run type-check`: superato.
- `git diff --check`: superato.

Le immagini nella cartella `preview/` mostrano home, FAQ, Press, Materiali, prodotto e Journal. I test browser hanno bloccato ogni richiesta non GET/HEAD e i servizi analytics: nessun ordine, form, pagamento o invio esterno.

## Correzioni di sicurezza

Consultare [SECURITY.md](SECURITY.md): cron autenticati, proxy immagini, redirect, simulatore checkout disabilitato in produzione, dipendenze aggiornate con audit completo a zero. Migration 061 protettiva dei ruoli testata in un PostgreSQL temporaneo e applicata tramite browser a Supabase in produzione; trigger e RLS verificati.

## Attività esterne ancora necessarie

Queste attività non si completano modificando il codice. Sono predisposte in `external-actions.md`, senza invii o modifiche agli account.

1. **Search Console:** dopo il deploy, inviare la sitemap e ispezionare home, una scheda, un articolo e le versioni localizzate. Verificare canonical scelti da Google, indicizzazione e risultati avanzati.
2. **Merchant Center:** controllare stato dell’ultimo recupero feed, diagnostica e approvazione dei prodotti nell’account. Un feed HTTP 200 non dimostra l’approvazione.
3. **GA4:** definire un gruppo di canali per ai_assistant e un’esplorazione delle conversioni. La nuova attribuzione raccoglie solo eventi successivi alla pubblicazione; non ricostruisce il passato.
4. **Filiera:** conservare schede tecniche, documenti di lavorazione e certificati con ambito, numero e validità. Le conferme del titolare qui registrate non sostituiscono documenti di certificazione.
5. **Recensioni:** ottenere recensioni autentiche da clienti reali con invito neutrale, senza selezione positiva o incentivi.
6. **Citazioni indipendenti:** proporre storie documentate a redazioni pertinenti e partner reali. Una citazione conta solo dopo pubblicazione da parte di terzi.
7. **Presenza nelle AI:** eseguire il protocollo `ai-visibility-protocol.json` con risposte reali e registrare citazioni, errori e data. Nessun risultato di visibilità è stato simulato.

## Fonti e limiti

Fonte del perimetro: `Audit_AEO_SILKinCOM.pdf`, valutazione preliminare del 25 novembre 2026, fornita dal titolare. Informazioni sulla produzione confermate da Marco in questa chat il 26 novembre 2026. Catalogo, feed e metadati pubblici interrogati in sola lettura.

Riferimenti tecnici: [Google sulle funzionalità AI](https://developers.google.com/search/docs/appearance/ai-features), [Google su ProductGroup e varianti](https://developers.google.com/search/docs/appearance/structured-data/product-variants), [crawler OpenAI](https://developers.openai.com/api/docs/bots). Google non garantisce scansione, indicizzazione o visualizzazione anche rispettando i requisiti tecnici. llms.txt rimane una risorsa facoltativa.

Il profilo Trustpilot non era interrogabile dagli strumenti di verifica: mantenuto il dato storico con data visibile. Nessun accesso a Search Console, GA4 o Merchant Center è stato usato. I controlli HTTP non sostituiscono Rich Results Test o URL Inspection. Nessun aggiornamento CMS effettuato. Stato del database documentato in `migration-production.json`; stato del rilascio in `release-validation.json`.

## Perimetro del checkout

La cartella contiene modifiche pregresse di più sessioni. `change-manifest.json` elenca i file di questa lavorazione e l’archivio `changes.patch.gz` conserva soltanto il delta rispetto all’inizio della sessione, per agevolare la revisione prima di un eventuale commit. Non applicare la patch sopra il checkout corrente: le modifiche sono già presenti.
