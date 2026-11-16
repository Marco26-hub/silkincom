# Experience — audit prima del rilascio, 13 novembre 2026

Perimetro: pagina Experience e modulo unico, area cliente e programmi privati, preventivi pubblicati, ritorni da login/registrazione, export dei dati e riferimenti di contatto. Questo rapporto documenta controlli eseguiti; non costituisce una certificazione dell’intero e-commerce o una garanzia di posizionamento nei motori di ricerca.

## Esito verificato

- 16 controlli Postgres/RLS in database isolato: superati.
- 16 controlli API con due identità QA temporanee sul database effettivo: superati.
- 34 controlli aggiuntivi su validazione, redirect, privacy, account e associazione delle richieste: superati.
- TypeScript, build di produzione e controllo whitespace: superati.
- HTTP nelle sette lingue: 490 stringhe coperte, 19 attività nello schema e nelle caselle del modulo, un solo modulo Experience, nessun pannello laterale di selezione duplicato.
- Titolo di condivisione, descrizione SEO, canonical e otto alternative linguistiche inclusa x-default: verificati. Le pagine di produzione sono indicizzabili; l’anteprima di sviluppo è noindex.
- Sette pagine account anonime: redirect al login. API anonima: 401 e Cache-Control no-store.
- Sitemap: Experience e traduzioni presenti, data 13 novembre; area cliente esclusa.
- 297 bundle JavaScript client controllati: nessuna delle chiavi private configurate rilevata. Nessun valore sensibile stampato.

## Interfaccia e contenuti

Un unico modulo contiene tre parti: lago/ospiti/periodo, esperienze, recapiti/servizi. La selezione non è ripetuta in un carrello o pannello separato. La barca ha una scheda laterale evidenziata su desktop; su smartphone precede il catalogo e occupa la larghezza disponibile. Un menu seleziona una sola formula nautica; dettagli e condizioni si espandono nella stessa scheda.

Le card hanno immagini, descrizioni brevi, tempo suggerito, formula e casella di selezione. Il catalogo parte da sei proposte per il lago visualizzato e consente di mostrare tutte le altre. La navigazione rimane separata dal catalogo dei restanti servizi, ma appartiene allo stesso modulo. Le attività esclusive dell’altro lago non compaiono nel catalogo corrente; un’eventuale selezione precedente dell’altro lago genera un avviso esplicito.

Verificati viewport 320, 390 e 1440 px: nessun overflow laterale. Barra del modulo con tre voci da almeno 62 px in altezza su mobile, sezione corrente evidenziata e campi con font di 16 px. Foto e contenuti si adattano alla colonna. I controlli principali sono nativi, etichettati e utilizzabili da tastiera; il focus è visibile e gli ancoraggi hanno margine rispetto alle barre fisse. La rotazione delle foto rispetta movimento ridotto e pausa.

Italiano formale, inviti all’azione coerenti e geografia distinta: Lario/Como e tradizione serica; Stresa/Isole Borromee/Verbano/Vergante per il Maggiore. Trasferimenti da aeroporto o stazione, senza trattare Malpensa come destinazione turistica. Nessun prezzo dimostrativo nell’offerta pubblica, nessun accordo con operatori presentato come già concluso. Struttura WebPage, BreadcrumbList, ItemList e FAQ; nessuna offerta con prezzi inventati.

Audit design successivo: `design-audit-2026-11-13.md`. Corretti contrasto dei numeri e del focus, bordi dei campi, dimensione dei metadati e nome accessibile del modulo. La scheda nautica segue il normale scorrimento della pagina per rendere leggibili anche i dettagli lunghi.

Riferimento per la revisione UI: [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). Riscontri visivi: `unified-form-desktop.png`, `unified-form-mobile.png`.

## Sicurezza e correzioni

1. Proprietà dei programmi assegnata dall’identità autenticata sul server, con filtro utente e RLS. Un secondo cliente non legge né modifica i programmi altrui.
2. Preventivi visibili soltanto al proprietario dopo pubblicazione; il cliente non può crearli, cambiarne gli importi o leggere bozze. Versione del programma e validità del preventivo sono esplicite.
3. Aggiornamenti con confronto di versione: scritture superate ricevono 409. Il riepilogo sincronizza le modifiche di un programma associato all’account prima di predisporre la richiesta.
4. Invio collegato a un programma: UUID, autenticazione, proprietà e versione verificati prima di inserire il contatto o inviare email. Testati rifiuti 401, 404 e 409; nessun contatto creato.
5. Corretto un disallineamento trovato nell’E2E: la scrittura riusciva, ma la risposta POST non includeva i preventivi richiesti dalla validazione client. GET e POST ora restituiscono la stessa struttura completa; nuovo test positivo sulla risposta di scrittura.
6. Redirect di autenticazione limitati a percorsi interni. URL esterni, separatori codificati, caratteri di controllo e normalizzazioni ambigue rifiutati con log del motivo, senza registrare URL sensibili.
7. Corretto il controllo password della cancellazione account: un errore restituito da Supabase interrompe l’azione con 401; verificato che l’identità QA resti presente.
8. API di scrittura: controllo Origin, identità, schema e massimo 32 KB. Risposte private no-store. Nessuna service key nel client o nelle API di salvataggio cliente.
9. Export include programmi e soli preventivi pubblicati, tramite client autenticato. La rimozione dell’identità elimina i programmi collegati per cascata.

## Fallback ed errori

Errori di lettura/scrittura producono messaggi visibili e log. Una lettura fallita non diventa una lista vuota riuscita. Risposte e prezzi vengono validati prima dell’uso; preventivi mancanti non sono convertiti silenziosamente in assenza di prezzi. Storage della scheda non disponibile: avviso e log. Destinazione e titolo facoltativo hanno valori iniziali dichiarati; un numero ospiti non valido non viene sostituito automaticamente.

Una breve interruzione di rete durante il collaudo ha prodotto l’avviso di mancato caricamento, senza perdita del programma sul server: la riapertura dall’area cliente ha ripristinato ospiti, hotel, attività e note. Un’interruzione separata del servizio di traduzione ha fermato il processo; sono state completate soltanto le lingue mancanti e ripetuta la verifica di copertura.

## E2E osservati

- Aggiunta e rimozione delle attività tramite caselle nello stesso modulo.
- Rimozione della barca: formula rimossa; nuova selezione: una sola formula corrente.
- Cambio da capitano ad aperitivo: riepilogo aggiornato, senza duplicazione della voce nautica.
- Salvataggio account, riapertura, ripristino di ospiti/hotel/note e successivo salvataggio: riusciti.
- Modifica degli ospiti e preparazione del riepilogo: aggiornamento della versione salvata e associazione al programma verificati.
- Riepilogo: destinazione, attività, formula, ospiti, hotel e note coerenti; nessun invio reale.
- Cambio Como/Maggiore: catalogo e immagine nautica distinti; avviso se restano scelte dell’altro lago.
- Pulsanti WhatsApp/email duplicati rimossi dal modulo. Resta il collegamento WhatsApp generale del sito; nessun messaggio inviato.
- Preventivo QA pubblicato leggibile soltanto dal proprietario; bozza nascosta e modifica di importi rifiutata.

## Immagini e limiti

Nuova immagine illustrativa golf Como senza acqua o vista lago: WebP 1000×667, 170.288 byte. Prompt e provenienza: `golf-inland-image.json`. Didascalie sulle 19 card e nota generale nelle sette lingue; crediti e licenze consultabili in una sezione espandibile. Verificate risposte HTTP e MIME WebP per golf, Jet Ski e barca Maggiore.

Non sono stati effettuati invii reali del modulo, messaggi WhatsApp, pagamenti o prenotazioni. Il percorso di richiesta è stato verificato fino al riepilogo; i casi di rifiuto della API contatti sono stati esercitati prima della scrittura. Login password eseguito; consenso Google e conferma email di una nuova registrazione non azionati. I relativi ritorni sono verificati nel codice e nei test. Il collaudo smartphone riguarda viewport Chromium, non un iPhone fisico.

Migrazione 057 applicata e registrata su autorizzazione dell’owner; RLS attiva sulle due tabelle. Le due identità QA, i programmi, i preventivi, i relativi dati temporanei e il file di credenziali sono stati rimossi alla chiusura. La sessione QA nel browser è stata disconnessa. Nessun dato di cliente reale modificato.

## Aggiornamento del 16 novembre 2026

Separati i passaggi «Riveda la richiesta» e «Invii la richiesta». In anteprima locale il pulsante finale è visibile ma disabilitato, con spiegazione esplicita. Rimossa la dicitura «scelte da rivedere». Formula nautica in pannello espandibile con cinque opzioni radio; preferenze private/condivise sempre visibili. Accesso account dichiarato facoltativo e spaziature corrette. Dodici pannelli del modulo verificati in apertura e chiusura nell’anteprima; distanza tra etichetta e selettore nautico verificata su pagina ricaricata. Le prove visive PNG allegate documentano la precedente revisione del modulo, prima di queste ultime rifiniture.
