# SEO, GEO e AEO — Experience

Verifica editoriale e tecnica aggiornata all’11 novembre 2026, sulla bozza locale italiana. «Compliance» qui significa applicare principi documentati di chiarezza, accuratezza e accessibilità: non è una certificazione né una garanzia di posizionamento o citazione.

## Principi verificati sulle fonti ufficiali

Google conferma che i fondamenti SEO valgono anche per le sue funzioni AI: contenuto utile, testo accessibile, struttura chiara e markup coerente. Non richiede file AI o schemi speciali. [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features).

Bing collega la comprensione e il grounding a contenuti verificabili, entità consistenti e dati strutturati accurati. Non garantisce citazioni. [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a).

## Implementazione

| Controllo | Scelta |
| --- | --- |
| Intento | Esperienze sui due laghi e richiesta personalizzata; non elenco di prezzi o disponibilità |
| H1 | Un solo H1 con Lago di Como e Lago Maggiore |
| Titolo e descrizione | Specifici per la pagina; brand tramite template esistente |
| Canonical | URL assoluto verificato `https://www.silkincom.com/experience`; metadataBase specifico della pagina per evitare l’origine localhost della configurazione locale |
| Social | Open Graph e Twitter specifici per Experience, immagine locale ottimizzata |
| Entità | Como/Lario e Maggiore/Verbano distinti; arrivo generico in aeroporto o stazione. Brunate, seta e Menaggio sul Lario; Isole Borromee, Santa Caterina e Vergante sul Maggiore |
| Risposte | FAQ brevi e dirette; spiegazione iniziale di chi propone cosa e come avviare una richiesta |
| Contenuti filtrati | Le quindici schede sono renderizzate nell’HTML; il filtro cambia la visibilità, non scarica o genera i testi a seguito del clic |
| Dati strutturati | BreadcrumbList e WebPage con ItemList di idee, dalla stessa sorgente delle schede |
| Integrità del markup | Nessuna TravelAgency, Offer, prezzo, rating, disponibilità o prenotazione inventati; niente FAQ rich results promessi |
| Link interni | Percorso di navigazione, cultura artigiana, privacy e collegamenti già presenti nel sito |
| Fonti | Informazioni operative da gestori diretti per funicolare, golf, Balbianello e Museo della Seta |
| Immagini | WebP con alt specifici; crediti e licenze conservati |
| Stato pubblico | Noindex intenzionale, nessuna sitemap entry, altre lingue non attive; è una bozza da approvare |

## Famiglie di query da coprire naturalmente

Questi sono intenti editoriali ipotizzati, non volumi di ricerca misurati: esperienze Lago di Como; itinerario personalizzato Lago Maggiore; trasferimento aeroporto o stazione; giro in barca con capitano; aperitivo in barca; noleggio 40 CV; visita ville; golf Lago di Como; golf Stresa; Isole Borromee; Santa Caterina del Sasso; funicolare Como Brunate; tour gourmet; Como Silk Experience; showroom tessili Como; lezioni di cucina; e-bike e benessere.

Le risposte non ripetono ogni parola chiave in ogni sezione. Un luogo viene associato soltanto alle attività pertinenti; la spinta commerciale non modifica fatti, chiusure o requisiti.

## Verifiche e limiti

Il DOM renderizzato conferma titolo specifico, descrizione, canonical e OG sul dominio www, un H1, 15 voci JSON-LD corrispondenti alle 15 schede, assenza di ID duplicati e di ancore interne mancanti. Le tre immagini nel contenuto sono caricate. Risultati: `qa/seo-rendered-2026-11-11.json`. Noindex e nofollow sono intenzionali nella bozza, anche per Googlebot: la pagina non è pronta per essere indicizzata.

La configurazione locale ereditata del layout genera ancora Organization/WebSite con origine localhost; il problema è preesistente e dipende dall’ambiente condiviso. I metadati e il WebPage di Experience usano il dominio pubblico. Prima del lancio verificare l’intero grafo nella preview di produzione con `NEXT_PUBLIC_APP_URL=https://www.silkincom.com`, oltre alla consegna dei contatti.

La skill `market-seo` cita uno script `scripts/analyze_page.py` non incluso nella skill installata; il controllo viene svolto sul DOM renderizzato e sui JSON-LD tramite browser, con risultati salvati in `qa/`. Skip esplicito dello script per file assente, nessun risultato automatico attribuito a uno strumento non eseguito.

Restano prima del lancio: accordi e ruolo operativo, testo privacy adeguato al servizio, traduzioni effettive, decisione sull’indicizzazione e inserimento in sitemap/navigazione di produzione, verifica di funzionamento della consegna contatti. I test di Rich Results, indicizzazione, ranking, citazioni AI e prestazioni reali su rete mobile non sono stati eseguiti o non sono misurabili sulla bozza locale.
