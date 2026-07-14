# Handoff Claude — Lead B2B, newsletter e sbocchi 360°

Aggiornato: 14 luglio 2026

## Implementato

- Admin `Lead B2B` con ricerca live, scansione siti pubblici, lead manuali, invio outreach e storico risposte.
- Ricerca funzionante anche senza chiavi Google: usa Google CSE quando configurato, poi ricerca geografica strutturata OpenStreetMap/Nominatim/Overpass e infine un fallback web best-effort.
- Corretto il blocco live `motore pubblico non disponibile (403)`: la ricerca primaria senza chiavi non dipende più da DuckDuckGo e salva anche email/telefono business già presenti nei dati OpenStreetMap.
- Ricerca e scansione eseguite in parallelo, con timeout, limite dimensione HTML, controllo URL pubblici e protezione SSRF.
- Menu lead organizzato in 6 macro-aree e oltre 40 sottocategorie selezionabili; genera automaticamente query e focus commerciale, con massimo 6 segmenti per ricerca.
- Ricerca OpenStreetMap collegata agli ID delle sottocategorie, con rotazione automatica delle istanze Overpass e perimetro geografico limitato alla zona richiesta.
- Webhook inbound `/api/email/inbound` per tracciare risposte e richieste `stop`.
- Template email SILKinCOM più premium/maison con focus per canale.
- Outreach ridisegnato come proposta istituzionale del Partnership Office: apertura personale del Founder, executive brief, vetrina prodotto dinamica e cliccabile, piano operativo in tre fasi per tutti i 16 focus, dossier commerciale, invito riservato all’approfondimento e opt-out `STOP`.
- Per i focus hospitality, B&B, hotel boutique, resort e spa la selezione è dinamica: Telo Lago Tivan per piscina, spa, suite e accesso al Lago; Twilly Como per hall, reception, concierge, boutique e gifting; Darsena per resort shop, pool, barca e travel kit; Riva e Melzi per boutique interna e capsule resortwear quando il contesto lo giustifica. Il target reale include hotel 5 stelle e strutture Lago di Como del livello Villa d’Este, Villa Flori e Hilton, ma questi nomi sono benchmark interni: non usare nomi di strutture terze nell’outreach salvo siano il destinatario effettivo.
- Darsena è stato integrato come cappellino Lago luxury/leisure, non come gadget; Riva come camicia resort in lino/cotone e Melzi come pantaloncino in lino. Usarli soprattutto per resort, beach club, yacht/golf club, travel designer, boutique e concept store; evitarli se il motivo specifico non cita un uso reale come pool, club shop, regata, torneo, itinerario, welcome kit o boutique resortwear.
- La variante hospitality è ora scritta per direzione, procurement, guest experience e concierge: oggetto mirato, capsule riservata, pilota controllato, ipotesi espositiva in hall/boutique e CTA per concept riservato.
- Strategia conversione integrata in admin: selezione `Top conversione`, punteggio conversione separato dallo score tecnico, avviso su lotti oltre 10 lead, richiesta di note reali per account premium e CTA a basso attrito con concept riservato o call di 15 minuti.
- Blocco anti-invio casuale: preview e invio reale verificano focus coerente con il settore del lead e presenza di un motivo specifico reale; note automatiche tipo `Segmenti:` non bastano per sbloccare l’invio.
- Tutti i 16 focus parlano ora di prodotto luxury Made in Como, non di proposta generica: ogni categoria ha oggetto, intro, prodotti, decision maker implicito e CTA calibrati su canale, occasione d’uso e cliente finale. L’admin mostra una guida dinamica `Deve essere mirato a` per compilare il motivo specifico prima dell’anteprima.
- La mail propone tre livelli: `Maison Selection` con logo SILKinCOM, `Co-Branded Edition` con doppia firma e `Exclusive Signature Capsule`. L’esclusiva viene descritta solo come possibilità su progetto e deve essere definita per prodotto/variante, territorio o canale, durata, quantità minime, campione e accordo commerciale.
- L’invio admin non è più diretto: apre l’anteprima HTML reale per ogni destinatario, controlla email, opt-out, oggetto, logo, CTA e istruzione `STOP`, richiede la visualizzazione di tutte le personalizzazioni e una conferma esplicita prima di abilitare l’invio.
- Le foto prodotto della proposta B2B ora vengono lette dalla foto primaria del DB `products → product_images`; l’admin può caricare override manuali per singola campagna dal blocco `Foto proposta`. L’override passa sia alla preview sia all’invio, ma non modifica il catalogo pubblico.
- Mittente B2B dedicato `Marco Di Benedetto · SILKinCOM <partnerships@silkincom.com>` quando il dominio Resend è verificato; le risposte vengono indirizzate alla casella B2B configurata.
- Focus B2B ampliati: hospitality, B&B charme, hotel boutique, resort, spa, wedding, corporate gifting, concept store, museum shop, yacht/golf club, personal shopper, interior, luxury travel, retail, gifting, wholesale.
- Playbook operativo in `docs/07-b2b-sbocchi-360.md`.

## Continuare

1. La migrazione corretta è `051_b2b_lead_system.sql`; i precedenti file B2B `017`/`018` sono stati rimossi perché quei numeri erano già usati dal database live.
2. `GOOGLE_SEARCH_API_KEY` e `GOOGLE_CSE_ID` restano opzionali; configurarli prima di aumentare molto il volume, perché le istanze OpenStreetMap pubbliche sono adatte a ricerche admin moderate, non a campagne massive automatizzate.
3. `NOMINATIM_API_URL` e `OVERPASS_API_URL` permettono di cambiare provider senza modificare il codice; lasciati vuoti usano gli endpoint pubblici con timeout, cache geocoding e rotazione fallback.
4. Mantenere visibile l’attribuzione `© OpenStreetMap contributors (ODbL)` nell’area ricerca.
5. Configurare `INBOUND_EMAIL_WEBHOOK_SECRET` in produzione e collegare il provider email inbound al webhook `https://www.silkincom.com/api/email/inbound`.
6. Testare un invio a un indirizzo interno e rispondere `stop` per verificare `do_not_contact`, `stop_requested_at` e `lead_inbound_messages`.
7. Eseguire sempre un invio di prova interno dopo modifiche sostanziali al template e verificare rendering desktop/mobile nei principali client email.
8. Creare preset di query per zona: Lago di Como, Milano, Svizzera, Costa Smeralda, Capri, Toscana, Montecarlo.

## Nota commerciale

La priorità non è volume, ma qualità: piccoli batch da 10-30 lead qualificati, email personalizzata per canale, follow-up manuale solo su lead coerenti.
