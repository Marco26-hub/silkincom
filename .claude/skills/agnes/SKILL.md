---
name: agnes
description: Pipeline SILKinCOM per produrre reel/UGC/caroselli premium da foto grezze in cartella — animazione Agnes i2v, compositing Remotion (InvernoReel/DarsenaVipReel/SlideMag), musica, QC, anteprima, scheduling Blotato. Usa quando l'utente chiede di creare reel, contenuti UGC, animare una foto, o "fai un video come quelli di oggi" per SILKinCOM.
metadata:
  version: 1.0.0
---

# Agnes — pipeline contenuti SILKinCOM

> **Griglia Instagram**: ogni reel si schedula con `coverImageUrl` (comp Remotion `ReelCover`, o un fotogramma col titolo
> già formato): testi dentro il ritaglio 3:4 della griglia (y 330-1560 su 1920), ogni tessera diversa dalla vicina, mai il
> primo fotogramma lasciato al caso. Caption corte (≤ ~200 caratteri, IG max 5 hashtag). Prima di scegliere una data
> scaricare tutta la coda Blotato e controllare i giorni già occupati.
> **Logo Lago di Como**: prima di disegnarlo, comporlo o animarlo leggi la skill `silkincom-logo`
> (sorgente unica, misura reale, colore del filo per ogni Lario). Mai ricalcarlo da una foto.

Riproduce il flusso di lavoro usato per produrre reel/UGC/caroselli SILKinCOM in una sessione: dalla
foto grezza in cartella al post schedulato su Blotato. Segui i passi in ordine, non saltarne nessuno —
ognuno esiste perché ha evitato un errore reale in produzione.

## 0. Prima di tutto: capisci cosa serve

Chiedi (o deduci dal contesto) quale prodotto/linea, che taglio (UGC animato vs still-photo cinematico
vs carosello), e se c'è un vincolo di stagione/data. Controlla [[silkincom-pending-blotato-schedule]] e
[[silkincom-content-strategy]] per lo stato attuale (cosa è già stato usato, count Blotato, prossimo
slot libero).

## 0.5 Quando la cartella è ambigua, la fonte vera è il sito

Se una foto in `~/Desktop/modelli ai silkincom FOTO/` è ambigua o contestata (due sessioni diverse la
chiamano prodotti diversi, o il testo impresso sulla card non torna) — **non insistere a indovinare dal
contenuto della foto**: vai su `silkincom.com/prodotto/<slug>` (slug spesso = nome prodotto minuscolo,
ma non sempre: "Essenziale" era su `/prodotto/como` senza suffisso, verificalo sempre seguendo il link
dalla sezione "stessa famiglia" invece di indovinare l'URL) e prendi le immagini ufficiali direttamente
da lì: `document.querySelectorAll('img')` via `javascript_tool`, filtra per `src` che contiene
`supabase.co`/`product-images` e `naturalWidth` alto — sono packshot puliti su fondo chiaro, perfetti
sia come riferimento sia come sorgente diretta per lo scontorno (vedi punto 3). Scarica con `curl`,
converti da webp a jpg con `sips -s format jpeg`.

## 1. Verifica SEMPRE la foto sorgente — mai fidarsi del filename

Prima di usare qualsiasi immagine in `~/Desktop/modelli ai silkincom FOTO/`, **aprila e guardala**. In
questa cartella i nomi file sono spesso sbagliati o ambigui:
- Una foto chiamata "Varenna" può mostrare Riva/Melzi — "Varenna" è anche il nome del paese sul lago,
  non solo del prodotto cashmere. Successo più volte: `donna-cernobbio-*`, `uomo-*-varenna-*`,
  `*-pomeriggio-*` con prodotto diverso da quello nel nome.
- Un file può essere una collage-board 3×3 già impaginata (packshot multipli) invece di uno scatto
  singolo — non tagliarne un angolo a caso: la risoluzione nativa di un singolo riquadro è troppo bassa
  se ingrandita in un reel 1080×1920. O usi la collage intera (se è già un asset finito) o ricavi un
  ritaglio a PIENA RISOLUZIONE da una foto singola vera.
- Se un beat "secondario" serve solo per riempire (es. un macro/dettaglio), preferisci ritagliarlo dalla
  STESSA foto principale (piena risoluzione garantita) piuttosto che pescare un altro asset non
  verificato solo per avere "due foto".
- Se la foto ha già testo o logo impresso (card di marketing pronte tipo `SILKinCOM-creati-01giu2026/`
  o `bellagio-*`), ritaglia via Pillow la fascia di testo/logo PRIMA di usarla in una composizione che
  aggiunge il suo — altrimenti doppio testo/logo sovrapposto.

## 2. Animare con Agnes (image-to-video) — solo quando serve movimento reale

CLI: `node scripts/agnes.mjs i2v --image <URL_PUBBLICO> --prompt "..." --negative "..." --frames N --fps 24 --width 832 --height 1216 --seed N --out remotion/public/nome.mp4`

L'immagine deve essere un URL pubblico: se è locale, caricala prima su Blotato
(`blotato_create_presigned_upload_url` + `curl -X PUT --data-binary`) e usa il `publicUrl`.

**Regola d'oro — cosa è sicuro animare, cosa no:**
- ✅ SICURO: capi a tinta unita o packshot rigidi (cappelli, pashmine in tinta unita, cachemire liscio).
  Movimento minimo (respiro, capelli, testa che gira, sguardo) — mai movimento ampio.
- ❌ RISCHIOSO: tessuti a trama/pattern complesso (intreccio, herringbone, righe) — l'i2v li ridisegna
  in modo incoerente frame per frame (vedi [[silkincom-prodotto-mai-generato]]). Usa SOLO packshot
  ufficiali statici per questi capi, mai i2v.
- ❌ RISCHIOSO: oggetti tenuti in mano (borse, tazze, telefoni) — rischiano quanto un tessuto complesso.
  L'i2v li fa cambiare forma o ne fa comparire di nuovi dal nulla. Se in scena c'è un oggetto in mano,
  campiona denso (ogni 0.5-1s) per tutta la durata, non solo inizio/metà/fine.

**Durata**: target 144-192 frame @24fps (6-8s). Più lungo = più tempo per derivare/distorcere — se la
qualità cala, riduci la durata piuttosto che forzare 8s pieni.

**Prompt che funziona** (adattare al soggetto):
```
--prompt "extremely subtle realistic motion, [soggetto] stays exactly identical and unchanged
the entire video, hair moves very slightly in a gentle breeze, natural slow blink, gentle
expression, fabric barely shifting with breathing, cinemagraph style, minimal smooth motion,
photorealistic, no new objects appear, no distortion"
--negative "fabric pattern warping, texture morphing, distorted hands, extra limbs, new objects
appearing, cup, extra items, unnatural motion, fast movement, glitch, blurry face, warped
background"
```
Aggiungi un `--seed` fisso se devi rigenerare per correggere un difetto (riproducibilità).

**QC obbligatorio**: estrai frame ogni 0.5-1s su TUTTA la durata (`ffmpeg -ss T -i clip.mp4 -frames:v 1 ...`)
e guardali tutti prima di usare il clip. Un controllo a 3-5 frame sparsi NON basta — un difetto può
comparire e sparire in una finestra di 2s che salti.

## 3. Compositing Remotion — quale template

- **`DarsenaVipReel`** (+ `darsenaVipDefaults`): un solo video (Agnes o reale) come hero, badge "VIP
  ACCESS", card vetro con eyebrow/title/subtitle, cornice hairline oro, logo bloom. Per UGC animato.
  `durationInFrames` deve combaciare con la durata reale del video (frame_video/fps_video × 30), altrimenti
  il video finisce prima e resta un frame fermo/nero per il resto.
- **`InvernoReel`** (+ `invernoReelDefaults`): 2-4 FOTO FERME, ken-burns cinematografico, halation, gate
  weave, titolo `CinematicTitle` che tiene bene il tempo (vedi timing sotto). Per contenuti brand/
  editoriali o quando non c'è un video sorgente.
- **`SlideMag`** (kind `spread`, opzione `cutout: true`): card magazine per caroselli — numero gigante
  in filo d'oro, tavola ruotata con cornice (o floating senza cornice se `cutout`). Ottima per
  "professionalizzare" foto semplici/piatte.

**Timing testo (`CinematicTitle` in InvernoReel)**: hook/hookSub restano visibili da `at+34` a `outAt`,
poi 32f di fade-out. Default `outAt=190` (~7.4s prima di sparire) — se il testo copre l'oggetto/soggetto
nella foto, NON spostare il testo (è condiviso da tutte le comp InvernoReel): sposta l'OGGETTO nella
foto composita (es. in alto, lasciando il centro/basso libero per il testo).

**Rendere "professionale/wow" una foto semplice** (macro materiali, packshot piatti da location):
1. `rembg` (Python: `from rembg import remove; remove(Image.open(...))`) per scontornare il soggetto.
2. Ricomponi via Pillow su sfondo scuro con pozze di colore (caldo in alto-sx, freddo in basso-dx, stile
   già usato in `SlideMag`), alone dorato attorno al soggetto (dilata+sfoca la maschera alpha, tingi
   oro), fascio di luce dall'alto (god-ray: poligono sfocato), ombra a terra ellittica sfocata, vignetta
   finale. Vedi lo script inline usato per `inv-fibra-premium-*.jpg` in questo repo (cerca
   "gold rim glow" nella history di Root.tsx) come riferimento diretto.
3. Posiziona il soggetto in ALTO nel frame (non centrato) se la composizione finale (InvernoReel) ci
   sovrappone un hook di testo centrato.
4. **Funziona su oggetti isolati dalla sagoma organica** (bozzoli, ciuffi di lana/cotone, un capo da
   solo) — l'alone dorato segue il contorno e resta elegante. **Non funziona su un ritratto/persona**:
   spalle e busto hanno un bordo squadrato, e l'alone-contorno diventa un riquadro visibile, non un
   bagliore. Su una persona serve un altro trattamento (es. spotlight ellittico morbido centrato sul
   viso, non un glow che segue la sagoma) — non riusare la stessa ricetta alla cieca.
5. Prima di scontornare, controlla che non ci sia un OGGETTO DI TERZI riconoscibile nell'inquadratura
   (borse/accessori di altri brand — capitato con una Birkin Hermès in una foto di scena). Isolare lo
   sfondo rende quell'oggetto IL soggetto della foto: se è un brand terzo, sembra un'affiliazione che
   non esiste. Scartare la foto e cercarne un'altra, non procedere "aggiustando" il crop.
6. **Oggetto con uno spazio vuoto interno stretto** (es. una sciarpa/twilly appeso con due lembi vicini,
   una maniglia, un anello): il MaxFilter di dilatazione usato per l'alone dorato può "saldare" i due
   bordi attraverso il vuoto, riempiendolo di bagliore e facendolo sembrare un pezzo di sfondo rimasto
   (facile da scambiare per un difetto del cutout — non lo è). Fix: raggio di dilatazione più piccolo
   (`MaxFilter(3)` invece di `(9)`) così il bagliore non salda i due lati; verificare sempre lo spazio
   interno di un oggetto con un "buco", non solo il contorno esterno.
7. Alpha a soglia netta (0/255) rende il taglio troppo da "adesivo" — aggiungere un feather leggero
   (`GaussianBlur(1.2-1.5)` sull'alpha DOPO la soglia) per un bordo fotografico, abbastanza piccolo da
   non riaprire il problema del punto 6. Per più "wow" su richiesta: doppio alone (uno stretto caldo/oro
   + uno largo e tenue freddo/blu per profondità), fascio di luce più ampio, e un piccolo boost di
   contrasto/saturazione sul soggetto stesso (`ImageEnhance.Contrast/Color` ~1.05-1.10) prima di
   comporlo — non solo sullo sfondo.
8. **Il capo ha zone già bianche/chiare** (righe, dettagli chiari): un bagliore caldo steso su TUTTA la
   superficie (glow calcolato dall'alpha sfocata, non solo dal bordo) scalda/brucia anche quelle zone —
   "il bianco non è bello", sembra sporco o sovraesposto invece che bianco pulito. Fix: calcolare
   l'anello caldo SOLO come `dilatato_alpha - alpha_originale` (la differenza è un anello sottile appena
   fuori dalla sagoma, mai sopra il tessuto) invece di sfocare l'alpha stessa — l'oro resta un contorno,
   il tessuto tiene i suoi colori veri.

## 4. Musica

1. Controlla PRIMA `remotion/public/*.wav|*.mp3` — molte tracce sono già lì e già sicure. Convenzione
   osservata (non garantita): **`.wav` = sorgente HeyGen/Astral (sicura per YouTube)**, **`.mp3` con
   prefisso `px-` o simile = Pixabay (rischio Content ID su YouTube, anche se la licenza lo permette —
   il matching è indipendente dalla licenza)**.
2. Se nessuna traccia già presente si adatta al mood richiesto, è ok scaricarne una nuova da Pixabay
   (eccezione esplicita, vedi [[silkincom-musica-download-eccezione]]): cerca su
   `pixabay.com/music/search/<query IT o EN>`, apri la pagina del brano, leggi l'URL diretto via
   `javascript_tool`: `document.querySelector('audio').src` (niente bisogno di cliccare play), poi
   `curl -sL -o remotion/public/nome.mp3 "<url>"`.
3. **Fai sempre confermare il brano/mood a Marco prima di usarlo definitivamente** — ha chiesto più
   volte di cambiarlo ("diversa", "più soft elegante").
4. Non riusare la stessa traccia due volte di fila su prodotti diversi se puoi evitarlo — dà varietà al
   feed. Reuse tra prodotti diversi è comunque normale prassi in questo account.

## 5. Anteprima SEMPRE prima di schedulare — nessuna eccezione

Vedi [[silkincom-anteprima-prima-di-spedire]]. Dopo il render: `SendUserFile` col video/immagine PRIMA
di chiamare `blotato_create_post`. Aspetta un ok esplicito. Vale anche per asset "già verificati da te" —
un tuo controllo a fotogrammi non sostituisce l'occhio di Marco. Se un batch già schedulato viene
corretto dopo feedback (bug, musica, testo), ri-carica il video E aggiorna i post esistenti con
`blotato_update_schedule` (stesso `id`, nuovo `mediaUrls`) — non lasciare in giro la versione difettosa.

## 6. Scheduling Blotato

Account: FB 34287 (pageId 836145059577999) · YouTube 38509 · Pinterest 6928 (boardId
928867560585779074) · IG 49996 · Threads 7083 · TikTok 44432. Cadenza standard blast (UTC): FB 11:30 /
YouTube 12:00 / Pinterest 13:00 / IG 14:30 / Threads 16:30 / TikTok 18:00. Flag: TikTok
`isYourBrand`+`isAiGenerated`=true; YouTube `containsSyntheticMedia`=true. IG max 5 hashtag.

YouTube: includilo SEMPRE se la musica è sicura (`.wav`/HeyGen). Se la musica è a rischio Content ID
(Pixabay `.mp3`), salta YouTube di default MA segnala il perché — Marco ha già chiesto esplicitamente di
includerlo comunque più volte nonostante il rischio, quindi se lo conferma procedi senza richiedere ogni
volta.

Spaziatura tra un batch e l'altro: ~3-4 giorni, verifica sempre `blotato_list_schedules` (campo `count`
su 200) prima di assumere lo spazio pieno o libero — si libera da solo man mano che i post escono.

## 7. Dopo: aggiorna la memoria

Logga cosa è stato fatto in [[silkincom-pending-blotato-schedule]] (nuovo prodotto, date, count prima/
dopo, eventuali difetti trovati e come sono stati corretti) — è la fonte che impedisce di rifare due
volte lo stesso prodotto o riusare una foto già spesa.

## Processo che "si vede accadere" (es. ricamo del logo) — meccanica definitiva (2026-09-17)

Marco: "MACCHINA DA CUCIRE NON CREA RICAMO" → l'overlay che cresce da solo lontano dall'ago tradisce
tutto. Cosa lo rende credibile (`src/stitchTimeline.ts`, `src/AtelierFx.tsx`, `src/needleTrack.ts`):
1. **Misurare l'ago del clip** (luminosità sotto la punta, frame per frame → `depth` 0..1, eventi di
   discesa). Il ricamo avanza a impulsi: quasi tutto mentre l'ago è nel tessuto.
2. **Ago fermo, telaio che si muove** (pantografo): tutto ciò che sta sotto una linea sfumata (telaio,
   tessuto, morsa) trasla di `ago − fronte del ricamo`; la **testa della macchina resta ferma davanti**
   grazie a un matte PNG (`mask-machine-head.png`, poligono sulla sagoma metallica). Il telaio si
   riposiziona ad ago alzato (gain 0.36) e quasi non si muove ad ago basso (0.14).
3. **Ordine di cucitura dal basso verso l'alto**: la parte finita deve restare davanti al piedino,
   mai dietro (la prima versione cuciva dall'alto e il ricamo spariva sotto la macchina).
4. **Filo dall'occhio dell'ago al fronte del punto** + micro-affossamento del tessuto quando l'ago è
   giù + click sincronizzati sugli eventi di discesa.
5. **Match-cut**: il packshot copia esattamente la camera fino alla FINE della dissolvenza (non
   dell'ultimo zoom), con il ricamo vero sovrapposto al logo del packshot finché la camera è vicina.
6. Slow-motion vero: `minterpolate` (mci/aobmc) a 0.75x, non frame duplicati.
7. Maschera CSS e `transform` sempre su div separati (la maschera segue il transform).
