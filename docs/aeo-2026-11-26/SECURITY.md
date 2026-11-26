# Correzioni di sicurezza SILKinCOM

Correzioni verificate il 26 novembre 2026. Push, deploy e migration approvati da Marco nella chat. Migration 061 applicata direttamente dal SQL Editor Supabase al progetto di produzione `fjudulhxsafjizcmrifw`, senza portachiavi o CLI. Rilascio del codice in corso; nessun invio di email eseguito.

## Problemi corretti

| Problema | Correzione | Verifica |
| --- | --- | --- |
| Quattro cron autorizzavano un semplice header `x-vercel-cron: 1` | Richiesto `Authorization: Bearer CRON_SECRET`, con confronto del segreto a tempo costante. Un header di pianificazione non autentica il chiamante. | Test del guard: header falsificato, segreto errato e configurazione assente rifiutati; segreto valido accettato. Nessuna chiamata a cron reali durante il test. |
| Versione Next.js con advisory di sicurezza | Next.js 15.5.16 → 15.5.29, rimanendo sulla stessa linea. Aggiornate dipendenze vulnerabili e strumenti di sviluppo. | `npm audit` completo: zero vulnerabilità note dopo gli aggiornamenti. Prima: 9 pacchetti segnalati nella catena di produzione, tra cui una segnalazione critica. |
| Validazione di collezioni sovradimensionate in Zod | Zod 3.25.76 → 4.6.7 e resolver compatibile. Adeguato il messaggio di validazione del consenso all’anteprima. | Controllo TypeScript; indirizzi checkout validi/invalidi; un array oltre il limite viene rifiutato prima di validarne gli elementi. |
| Proxy immagini con controllo del suffisso host troppo permissivo e redirect automatici | HTTPS, hostname esatti o sottodomini validi, nessuna credenziale o porta arbitraria. Ogni redirect è rivalidato, con limite e timeout. Ammesse solo risposte immagine. | Test contro hostname ingannevoli, localhost, metadata IP, credenziali nell’URL e porte alternative. Accesso anonimo HTTP rifiutato. |
| Endpoint di simulazione checkout presente in produzione | Disabilitato in produzione e senza opt-in locale `E2E_CHECKOUT_ENABLED=true`; resta necessario anche il segreto già previsto. | GET anonima locale restituisce 404. Il simulatore non è stato eseguito. |
| Redirect di autenticazione | Percorsi interni verificati; rifiutati backslash, caratteri di controllo e destinazioni esterne. | Test dei casi di redirect avversi e dei percorsi legittimi. |
| La policy dei profili nel repository permetteva l’aggiornamento della propria riga senza proteggere il ruolo | Migration 061 con trigger che protegge ruolo e identità e mantiene le operazioni autorizzate di amministratori/service role. Prevista revoca degli accessi diretti alla tabella newsletter legacy, se esistente; in produzione la tabella non esiste e il ramo condizionale non è stato eseguito. | Sette scenari eseguiti con identità sintetiche in un cluster PostgreSQL temporaneo, poi eliminato. Non è stata tentata un’escalation sul database reale. |

## Risultati

- 14 test JavaScript complessivi AEO/sicurezza superati.
- 7 test PostgreSQL della migration superati.
- 11 controlli HTTP di sicurezza superati: header, API admin/account e disabilitazione del simulatore. L’API prodotti admin espone solo metodi di scrittura: GET restituisce correttamente 405.
- 13 controlli browser superati con tutti gli invii e gli analytics bloccati.
- `npm run type-check` e `git diff --check` superati.
- Scansione dei file testuali tracciati correnti: nessun pattern di credenziale individuato; `.env.local` e `AGNES.txt` non sono tracciati. Non è una scansione della cronologia Git.
- Richieste HEAD anonime alle tabelle private campione: nessuna riga leggibile rilevata. Non sono stati restituiti dati personali. Una tabella vuota non consente da sola di attestare la correttezza delle policy.

I dettagli sono in `security-http.json`, `security-profile-guard.json`, `security-rls-readonly.json`, `security-secrets.json` e `security-dependencies.json`.

## Applicazione in produzione

Migration `061_profile_privilege_guard.sql` applicata e registrata con versione remota `20261126163555`. La lettura preliminare delle policy reali ha confermato INSERT/UPDATE sulla propria riga senza vincolo sul ruolo e assenza del trigger protettivo. Verifica successiva: trigger attivo, funzione SECURITY DEFINER con search_path vuoto, RLS di profiles ancora attiva, EXECUTE negato ad anon e authenticated. `public.newsletters` assente: blocco condizionale saltato per questo motivo. Nessun profilo reale è stato modificato per testare un’escalation. Dettagli in `migration-production.json`.

Il rate limit esistente rimane per istanza; non equivale a un controllo distribuito di abuso o a un WAF. Gli header CSP attuali non sono una policy a nonce completa. Un audit di dipendenze a zero e questi test non certificano assenza di ogni vulnerabilità o di compromissioni pregresse.

Riferimento per la patch del framework: [rilascio di sicurezza ufficiale Next.js del 3 novembre 2026](https://nextjs.org/blog/november-2026-security-release). Per Zod: [rilascio e correzioni della validazione](https://github.com/colinhacks/zod/releases/tag/v4.6.6).
