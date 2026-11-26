# Azioni esterne e bozze da approvare

Nessuno dei testi seguenti è stato inviato. Recensioni, citazioni editoriali e risposte dei motori AI richiedono riscontri reali; non vengono conteggiati come risultati già raggiunti.

## Invito neutrale a recensire

Destinatari: clienti reali dopo la consegna; stesso criterio per tutte le esperienze, senza chiedere prima il gradimento e senza premi legati al voto. Verificare il canale e le preferenze del cliente prima dell’invio.

**Oggetto:** La sua esperienza con SILKinCOM

Gentile [Nome],

se desidera condividere la sua esperienza con SILKinCOM, può lasciare una recensione su Trustpilot: https://it.trustpilot.com/review/silkincom.com.

Ci interessa un riscontro sincero, qualunque sia la sua valutazione. Per assistenza sull’ordine può rispondere a questa email.

Marco Dibenedetto — SILKinCOM

## Proposta editoriale

Destinatari da selezionare: redazioni che pubblicano effettivamente su tessile, territorio comasco e cultura del prodotto. Verificare firma, redazione e pertinenza di un articolo recente prima di individuare il contatto. Non inserire loghi di testate sul sito prima dell’effettiva uscita.

**Oggetto:** Proposta per [rubrica]: tessitura e ricamo nel distretto di Como

Buongiorno [Nome],

sono Marco Dibenedetto, fondatore di SILKinCOM, Maison di accessori e abbigliamento con sede a Cermenate. Le scrivo per proporre un approfondimento sui passaggi che trasformano un tessuto in un accessorio: tessitura, tintura, finitura e ricamo.

I nostri twilly e le pashmine in cashmere sono tessuti, tinti e rifiniti a Como; anche gli altri prodotti e il ricamo sono realizzati da artigiani comaschi. Possiamo concordare un’intervista sul progetto e condividere i materiali pertinenti. La Press Room raccoglie profilo, logo e contatti: https://www.silkincom.com/press.

Se il tema rientra nella linea della rubrica, le invio una proposta focalizzata su un solo prodotto e sui relativi passaggi di lavorazione.

Marco Dibenedetto — info@silkincom.com

## Registro dei documenti di filiera

Per ogni linea conservare: articolo/SKU, composizione da etichetta, fornitore, luogo e prova delle lavorazioni, origine della materia prima se attestata, immagini originali e autorizzazioni. Per certificazioni: titolare, numero, ambito, prodotti coperti, ente, scadenza e documento. Pubblicare soltanto i dati sostenuti da questa documentazione.

Le fotografie di artigiani e i nominativi visibili sul sito richiedono conferma dell’identità e dell’autorizzazione d’uso prima di eventuali nuove interviste o campagne stampa.

## Controlli dopo la pubblicazione

- Eseguire `node scripts/seo/check-aeo.mjs --base https://www.silkincom.com --full --out docs/aeo-2026-11-26/live-after-check.json`.
- Search Console: sitemap.xml, URL Inspection su home/prodotto/articolo in italiano e inglese, canonical scelto, assenza di blocchi e stato indicizzazione.
- Rich Results Test: prodotto con varianti, prodotto esaurito e articolo. FAQPage deve restare coerente con il testo visibile; non implica l’idoneità ai rich result FAQ per un negozio.
- Merchant Center: ultimo fetch riuscito e diagnostica per prezzi, stock, spedizioni e identificativi.
- GA4: esplorazione con source/medium e acquisti. Per gli eventi che espongono attr_source/attr_medium, configurare le dimensioni personalizzate se richieste. Il gruppo ai_assistant è una classificazione del progetto.
- Registrare visibilità AI con il protocollo allegato. Nessuna automazione o pubblicazione ricorrente è stata attivata.
