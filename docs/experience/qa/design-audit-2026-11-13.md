# Audit design Experience — 13 novembre 2026

Revisione della build di produzione locale, dopo la riorganizzazione in un unico modulo. Metodo: ispezione del codice, misure CSS nel browser, calcolo del contrasto sRGB, navigazione da tastiera e prove responsive. Esito: le criticità rilevate nei controlli sotto elencati sono state corrette e ricontrollate. Non è una certificazione di accessibilità completa.

## Rilievi risolti

| Priorità | Rilievo | Correzione verificata |
| --- | --- | --- |
| P2 | Numeri dei passaggi e focus oro chiaro poco contrastati sull’avorio | Oro scuro `#7c6015`: numeri da 2,83:1 a 5,83:1 sul fondo `#fffdf8`; focus visibile di 2 px. |
| P2 | Bordi dei campi troppo deboli rispetto allo sfondo | Bordo taupe `#8a8478`: contrasto 3,33:1 sul fondo carta e 3,65:1 sull’avorio; stato focus oro scuro. |
| P2 | La scheda nautica fissa poteva rendere scomodi i dettagli lunghi nelle finestre basse | Colonna laterale nel normale flusso della pagina; nessun contenitore con scorrimento interno. Su smartphone rimane prima delle altre attività. |
| P3 | Località e informazioni delle card a 9 px | Località e titoli delle informazioni a 11 px; conteggi e apertura dei dettagli a 12 px. Descrizioni principali a 14 px, campi a 16 px. |
| P3 | Il modulo non aveva un nome accessibile esplicito | Collegamento `aria-labelledby="request-title"` al titolo «La sua esperienza, su misura.». |

Riferimenti del codice: `src/components/experience/experience.module.css` e `src/components/experience/LakeExperience.tsx`.

## Verifiche visive e funzionali

- Gerarchia: titolo principale, introduzione, unico modulo in tre parti e domande frequenti. Nessun secondo configuratore o carrello Experience.
- Coerenza del marchio: avorio, antracite e oro; titoli Cormorant e testi Inter; VIP Experience nello stile della navigazione.
- Catalogo: immagini proporzionate, informazioni compatte, caselle esplicite. La scheda nautica non allunga più le righe delle altre card.
- Desktop: controllati 1440×1000 e 1366×768; colonna nautica a destra e catalogo separato nello stesso modulo.
- Smartphone: controllati 390×844 e 320×760; nessun overflow orizzontale. Le tre voci del modulo hanno altezza di 62 px. Campi a 16 px e controlli principali da almeno 44 px.
- Lingue: sette risposte HTTP corrette e 490 stringhe coperte. Verificata anche la versione tedesca a 320 px, senza overflow.
- Tastiera: passaggio dalla barra del modulo al campo destinazione con focus visibile; il campo non è coperto dalle barre fisse. Controlli nativi ed etichette associate.
- Feedback: sezione corrente evidenziata anche con sottolineatura; stato selezionato della casella e riepilogo prima dell’invio.
- Movimento e immagini: pausa della rotazione e preferenza di movimento ridotto; immagini illustrative dichiarate e crediti consultabili. Golf Como senza vista lago.
- Italiano: registro formale; inviti all’azione coerenti; riferimenti distinti a Como/Lario e Maggiore/Verbano. Nessuna promessa di servizi o accordi già confermati.

Prove visive: `unified-form-desktop.png` e `unified-form-mobile.png`.

## Limiti e verifiche successive

Non è stato usato un iPhone fisico né eseguito un collaudo completo con VoiceOver o altri lettori di schermo. Le prove responsive usano Chromium. La resa di selettori e calendari nativi su Safari iOS va ricontrollata su dispositivo. Non sono stati misurati risultati commerciali o miglioramenti di conversione: richiedono dati reali di utilizzo.

Quando saranno definiti gli operatori, fotografie autentiche delle attività e condizioni effettive potranno rendere l’offerta più riconoscibile; le immagini illustrative non vengono presentate come prova di accordi commerciali.

Riferimenti: [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md), [contrasto del testo W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contrasto dei componenti W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Le soglie sono riferimenti per i controlli eseguiti, non un’attestazione generale di conformità.

## Rifiniture del 16 novembre 2026

Corretto lo spazio tra etichetta e formula nautica, con focus interno al controllo. Verificate apertura e chiusura di dodici pannelli del modulo. Preferenze private/condivise in tre opzioni visibili; accesso account facoltativo con pulsanti separati. Riepilogo e invio sono due azioni distinte; rimossi i collegamenti di contatto duplicati e il conteggio «scelte da rivedere». Le immagini PNG di riferimento precedono queste ultime rifiniture.
