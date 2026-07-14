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
- Per i focus hospitality, B&B, hotel boutique, resort e spa la selezione è dinamica: Telo Lago Tivan per piscina, spa, suite e accesso al Lago; Twilly Como per hall, reception, concierge, boutique e gifting. Il riferimento visivo è quello delle hall degli hotel iconici del Lago, senza utilizzare nomi di strutture terze nell’outreach.
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
7. Aggiungere una preview email in admin prima dell’invio, se Marco vuole approvare il copy.
8. Creare preset di query per zona: Lago di Como, Milano, Svizzera, Costa Smeralda, Capri, Toscana, Montecarlo.

## Nota commerciale

La priorità non è volume, ma qualità: piccoli batch da 10-30 lead qualificati, email personalizzata per canale, follow-up manuale solo su lead coerenti.
