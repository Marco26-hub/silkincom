# Handoff Claude — Lead B2B, newsletter e sbocchi 360°

Aggiornato: 14 luglio 2026

## Implementato

- Admin `Lead B2B` con ricerca live, scansione siti pubblici, lead manuali, invio outreach e storico risposte.
- Ricerca funzionante anche senza chiavi Google: usa Google CSE quando configurato e passa automaticamente al motore pubblico di fallback.
- Ricerca e scansione eseguite in parallelo, con timeout, limite dimensione HTML, controllo URL pubblici e protezione SSRF.
- Menu lead organizzato in 6 macro-aree e oltre 40 sottocategorie selezionabili; genera automaticamente query e focus commerciale, con massimo 6 segmenti per ricerca.
- Webhook inbound `/api/email/inbound` per tracciare risposte e richieste `stop`.
- Template email SILKinCOM più premium/maison con focus per canale.
- Focus B2B ampliati: hospitality, B&B charme, hotel boutique, resort, spa, wedding, corporate gifting, concept store, museum shop, yacht/golf club, personal shopper, interior, luxury travel, retail, gifting, wholesale.
- Playbook operativo in `docs/07-b2b-sbocchi-360.md`.

## Continuare

1. La migrazione corretta è `051_b2b_lead_system.sql`; i precedenti file B2B `017`/`018` sono stati rimossi perché quei numeri erano già usati dal database live.
2. `GOOGLE_SEARCH_API_KEY` e `GOOGLE_CSE_ID` sono opzionali: migliorano la fonte, ma la ricerca funziona anche senza.
3. Configurare `INBOUND_EMAIL_WEBHOOK_SECRET` in produzione e collegare il provider email inbound al webhook `https://www.silkincom.com/api/email/inbound`.
4. Testare un invio a un indirizzo interno e rispondere `stop` per verificare `do_not_contact`, `stop_requested_at` e `lead_inbound_messages`.
5. Aggiungere una preview email in admin prima dell’invio, se Marco vuole approvare il copy.
6. Creare preset di query per zona: Lago di Como, Milano, Svizzera, Costa Smeralda, Capri, Toscana, Montecarlo.

## Nota commerciale

La priorità non è volume, ma qualità: piccoli batch da 10-30 lead qualificati, email personalizzata per canale, follow-up manuale solo su lead coerenti.
