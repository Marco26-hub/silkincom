# Experience salvate e preventivi riservati

La pagina Experience usa un unico modulo: destinazione, ospiti e periodo; scelta delle attività; recapiti e servizi utili. La navigazione ha una scheda laterale su desktop e precede il catalogo su smartphone. Aggiunta e rimozione avvengono tramite caselle; la formula nautica si modifica con un menu a scelta singola.

Nella terza parte, «Salvi la sua Experience nell’account» è facoltativo. Il cliente autenticato assegna un nome e salva; «Esperienze salvate» nell’area cliente consente di riaprire il programma anche da un altro dispositivo. Sono conservati identificatori stabili, destinazione e dettagli del soggiorno. La selezione nella singola scheda del browser contiene soltanto identificatori e destinazione: recapiti, hotel, note e budget non vengono scritti nello storage locale.

Il salvataggio non crea prenotazioni né inoltra richieste commerciali. Il riepilogo di un programma già associato all’account aggiorna prima le eventuali modifiche, controllando la versione letta. L’invio finale verifica nuovamente identità, proprietà e versione; una versione superata è rifiutata. Il riferimento verificato del programma viene conservato nel messaggio della richiesta.

Le tabelle `experience_trips` e `experience_quotes` hanno RLS e appartengono alla migrazione 057, applicata su autorizzazione dell’owner. Il cliente legge e aggiorna soltanto i propri programmi. Non può scrivere prezzi o leggere bozze di preventivo. GET e POST restituiscono la stessa struttura completa, validata dal client; gli errori di caricamento e salvataggio sono visibili e registrati.

Per predisporre un preventivo, l’owner usa il backoffice Supabase nella tabella `experience_quotes`: `trip_id`, `total_cents` (intero in centesimi, EUR), servizi inclusi/esclusi, condizioni e validità. `trip_updated_at` deve corrispondere a `updated_at` della versione preventivata. `status=draft` resta invisibile; `status=sent` rende il preventivo consultabile dal cliente proprietario. Questa operazione non invia email. Non è presente un checkout per l’acquisto delle esperienze.

Il listino dell’analisi concorrenziale resta una bozza interna e non alimenta automaticamente i preventivi. I testi commerciali dell’owner vengono mostrati come redatti, senza traduzione automatica delle condizioni. Le modifiche al programma o la scadenza della proposta rendono visibile la necessità di riconfermare il prezzo.

Collaudo: Node 22 o superiore con WebSocket nativo. `scripts/experience/test-trips.mjs` verifica RLS in Postgres isolato; `account-api-qa.mjs --keep` crea due identità temporanee senza email di autenticazione e verifica le API locali. `security-audit.mjs` verifica validazione, export, redirect e rifiuti di invio su queste identità. `account-api-qa.mjs --cleanup` elimina soltanto gli utenti QA identificati e i relativi dati. Le credenziali di test non devono entrare in git.
