# Verifica Search Console — 28 novembre 2026

Proprietà verificata: https://www.silkincom.com/. La proprietà dominio non risulta verificata in questo account; è disponibile la proprietà HTTPS con prefisso URL.

Il riepilogo non è un punteggio SEO di 100. HTTPS mostra 49 URL buoni e zero non HTTPS; Core Web Vitals non dispone di dati sufficienti nel report osservato. Shopping mostra 153 schede commercianti valide e un errore critico (ultimo aggiornamento 25 novembre): brand duplicato su Melzi Beige, ultima scansione 7 ottobre.

## Correzioni effettive

- Unito AggregateRating e recensioni approvate al singolo nodo Product/ProductGroup, eliminando il secondo oggetto brand. Badge visibile e schema leggono lo stesso risultato. Verifica di regressione: live precedente 74/76, con due errori sull’identità/brand di Melzi; correzione locale 97/97 su tre pagine incluse varianti e inglese.
- Aggiunto mpn dalle SKU effettive delle taglie; nessun GTIN inventato.
- Recuperati con redirect permanenti i link con lingua ripetuta, come /fr/fr e /nl/nl. Le tre destinazioni canoniche danno HTTP 200.
- Gli otto URL Wix segnalati in passato hanno già redirect 308 verso destinazioni esistenti (HTTP 200). Il vecchio hash CSS e /$ non corrispondono a pagine da pubblicare e possono restare 404.
- Lario olandese, segnalato come duplicato senza canonical nella scansione del 2 novembre, supera ora tutti i 57 controlli HTTP inclusa canonical autoreferenziale e hreflang.

## Risultati Google osservati

- Sitemap /sitemap.xml: Riuscita, 903 URL, ultima lettura 27 novembre 2026.
- Rimosso il solo invio errato preesistente /siemap.xml (zero URL). Verifica successiva: resta unicamente /sitemap.xml, Riuscita, 903 URL. Nessuna pagina del sito rimossa.
- Indicizzazione (dati aggiornati al 23 novembre): 537 indicizzate, 398 escluse. Motivi: 43 noindex, 34 redirect, 13 404, una duplicata senza canonical, 297 scansionate non indicizzate, 10 rilevate non indicizzate. Il riepilogo conteggia sei motivi attivi; alcune righe conservano esiti di convalide precedenti.
- Gli esempi noindex esaminati sono login, registrazione e account: esclusione intenzionale appropriata. Non è stata tolta la protezione delle aree private.
- Avvisi non critici storici: 150 Offer senza resi, 150 senza spedizione, 100 descrizioni mancanti, 60 identificatori globali mancanti. Il markup attuale espone resi, spedizione, descrizione, brand e SKU/mpn; il controllo live finale verifica gli oggetti attualmente serviti.

Una nuova scansione/convalida non garantisce indicizzazione o posizionamento. Le 297 pagine scansionate non indicizzate richiedono valutazione della qualità, unicità e interesse da parte di Google; non sono un errore da risolvere pubblicando indiscriminatamente pagine private o duplicati.

Build finale e TypeScript superati. Un primo tentativo di ricompilazione ha incontrato una risposta Google Fonts non interpretabile; il successivo build completo è riuscito senza cambiare font o introdurre fallback. I tre redirect verificati sul build finale restituiscono 308 verso le pagine corrette.
