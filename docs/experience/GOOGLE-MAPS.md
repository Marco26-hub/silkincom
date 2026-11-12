# Google Maps — integrazione locale

Verifica: 11 novembre 2026.

Nel modulo Experience il cliente può indicare aeroporto o stazione, hotel e fino a tre tappe aggiuntive. Ogni luogo ha un collegamento di ricerca. Con almeno due luoghi si genera il percorso stradale nell’ordine arrivo → hotel → tappe, senza prenotare o confermare nulla. I campi sono facoltativi e confluiscono nel riepilogo e nel messaggio della richiesta.

L’integrazione usa gli [URL ufficiali Google Maps](https://developers.google.com/maps/documentation/urls/get-started): `api=1`, codifica tramite URLSearchParams, nessuna chiave richiesta. Massimo cinque punti, per rispettare il limite di tre waypoint sui browser mobili; errore esplicito se l’URL supera 2048 caratteri. Nessuna chiamata Google Maps viene effettuata prima dell’apertura del link.

Il modulo non offre ancora selezione sulla mappa, geolocalizzazione o suggerimenti automatici. Per una mappa incorporata serve una chiave [Maps Embed](https://developers.google.com/maps/documentation/embed/get-started); per suggerimenti degli indirizzi occorre configurare Places e le relative impostazioni dell’account. Nessuna chiave Maps/Places risulta configurata con i nomi controllati nell’ambiente locale. Non sono stati creati account o attivati servizi di fatturazione.

Prova browser con luoghi pubblici: Stazione Como San Giovanni → Hotel Villa d’Este, Cernobbio → Villa Olmo, Como. Percorso correttamente codificato e tre luoghi presenti nel riepilogo; modifica successiva dell’hotel invalida il riepilogo precedente. Nessun invio contatti o apertura del percorso con dati personali.

Verifiche del generatore URL: ordine, spazi/apostrofi e caratteri speciali, percorso con un solo punto, limite dei punti e limite di lunghezza. Superate. TypeScript verificato separatamente. Anteprima: `qa/google-maps-2026-11-11.png`.
