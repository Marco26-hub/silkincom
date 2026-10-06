---
name: silkincom-blog
description: Standard editoriali e pipeline completa degli articoli del blog SILKinCOM (Trame di Como) — voce, regole di verità sul prodotto, formato che il renderer accetta, scelta e verifica della foto (una foto si usa una volta sola), traduzione professionale in 7 lingue, SEO, programmazione dell'uscita e anteprima per Marco. Usa SEMPRE prima di scrivere, tradurre, correggere o pubblicare un articolo del blog, e prima di toccare il generatore AI in admin.
metadata:
  version: 1.0.0
  updated: 2026-10-06
  short-description: Scrivere e pubblicare un articolo del blog SILKinCOM
---

# Blog SILKinCOM — Trame di Como

Fonte unica per gli articoli del blog. Ogni regola qui sotto esiste perché ha evitato (o pagato) un
errore reale in produzione. Se un articolo in database contraddice questa scheda, è l'articolo
a essere sbagliato.

Codice di riferimento nel repo:
- `src/lib/blog/editorial-standards.ts` — le stesse regole passate al generatore AI in admin
  (`EDITORIAL_RULES`, `TYPE_BY_LINE`, `buildEditorialContext()`, `lintBlogContent()`).
- `src/lib/blog/translate.ts` — regole di registro per lingua usate da "Traduci con AI".
- `src/data/posts.ts` — lettura pubblica: filtra `published_at <= now()`, quindi una data futura
  programma l'uscita.
- `scripts/blog/` — gli script di questa skill.

## 1. Un articolo, un protagonista

Regola di Marco: **un'idea = un pezzo**. Un articolo parla di UN prodotto o UN tema. Se vengono
in mente due protagonisti (la pashmina e il twilly), sono due articoli in due settimane diverse.
Niente articoli-catalogo che nominano tutto.

Stessa regola dentro il pezzo: nessun paragrafo ripete il concetto di un altro, nessuna FAQ ripete
il corpo.

## 2. Verità sul prodotto: il tipo non si indovina

**MAI** dedurre il tipo di capo dal brief, dalla foto o da una vecchia didascalia. Si legge dal
catalogo (tabella `products` + `categories`), oppure dalla mappa in `TYPE_BY_LINE`:

| Linea | Tipo |
|---|---|
| Bellagio | pashmina |
| Cernobbio · Tremezzo · Varenna | sciarpa |
| Twilly Como | twilly |
| Darsena | cappello |
| Lario | t-shirt |
| Melzi | shorts |
| Riva | camicia |
| Tivan | telo mare |

Errore già pagato: un articolo con la foto di una sciarpa che nel testo diceva "pashmina", in tutte
e 7 le lingue, con i link sbagliati. Vedi [[silkincom-tipo-prodotto]].

Altri dati che si leggono dal catalogo e non si inventano: prezzo, misure, colori disponibili,
composizione. Se un dato non c'è, non si scrive.

Fibre, differenze da non sbagliare: **a pari peso il cashmere scalda più della lana**; la lana costa
meno ed è più resistente. (Mai il contrario.)

## 3. Voce

- Italiano di marca, frasi piene, zero gergo da e-commerce ("scopri", "imperdibile", "il nostro
  fantastico").
- Concreto: misure, prezzi, gesti, mattine, cappotti. Mai aggettivi al posto dei fatti.
- Si parla al lettore come un artigiano competente, non come un venditore.
- Niente superlativi sul brand, niente promesse che il prodotto non mantiene.
- Lunghezza utile: 1.100-1.400 parole. Sotto le 900 non si posiziona, sopra le 1.600 non si legge.

## 4. Formato che il renderer accetta

Il renderer del sito spezza i paragrafi sulle righe vuote e conosce solo:

- `## ` titolo di sezione
- `### ` sotto-titolo
- `[testo](/percorso-interno)`

Quindi **niente**: `# ` H1, elenchi puntati o numerati, grassetto, corsivo, tabelle, immagini inline,
HTML, link assoluti. `lintBlogContent()` li rimuove, ma meglio non scriverli.

Struttura collaudata:

1. apertura di due paragrafi che nominano il problema reale del lettore (non il prodotto);
2. 4-7 sezioni `##`, quelle sui prodotti con `###` per capo (nome, materiale, misura, prezzo, a chi serve);
3. una sezione sugli errori tipici;
4. una sezione FAQ (`## Le domande ...`) con 5-6 `###` che sono domande vere;
5. chiusura breve che rimanda alla pagina di categoria.

Link interni: 5-8 per articolo, **solo percorsi che esistono** (prodotti, categorie, articoli già
pubblicati). `buildEditorialContext()` fornisce l'elenco dei percorsi ammessi; qualunque altro link
va eliminato, non "corretto a sentimento".

## 5. La foto: si usa una volta sola

Regola fissa di Marco: **mai riusare una foto già pubblicata** sui social o su un altro articolo.
Vedi [[silkincom-blog-standard]] e [[silkincom-foto-preparate-non-a-caso]].

```bash
# 1. elenco delle immagini già pubblicate (tool MCP blotato_list_posts) -> urls.txt, una per riga
# 2. cache degli hash (si aggiorna in modo incrementale)
python3 scripts/blog/foto-usata.py cache urls.txt --dir ~/.cache/silkincom-foto
# 3. verifica la candidata
python3 scripts/blog/foto-usata.py check hero.webp --dir ~/.cache/silkincom-foto
```

Lettura: distanza `0-25` = stessa foto, **non si pubblica**; `26-50` = dubbio, si guarda a occhio;
`>50` = libera. Exit code diverso da 0 quando qualcosa non è libero.

Altre regole sulla foto:
- il capo nella foto deve essere lo stesso di cui parla il testo (tipo e colore);
- mai ritagli da collage o contact-sheet ingranditi: ritaglio deliberato a piena risoluzione;
- hero caricata via `/api/admin/blog/image` (WebP, lato lungo max 2000 px, bucket `home-content`,
  percorso `blog/<uuid>.webp`);
- prima di generare un'immagine, prova a riusare gli asset già in cartella ([[marco-riusa-asset-in-cartella]]).

## 6. Sette lingue, traduzione professionale

Lingue: `it` (colonne base) + `en es fr de pt nl` nei campi `*_i18n`. Si traducono **tutti** i campi:
titolo, excerpt, corpo, `seo_title`, `seo_description`. Un articolo con solo it/en non è finito.

Registro per lingua (è in `translate.ts`, va rispettato anche a mano):

| Lingua | Registro |
|---|---|
| en | inglese britannico |
| es | formale impersonale / ustedes, mai tú |
| fr | vous |
| de | Sie |
| pt | portoghese europeo, AO90 |
| nl | formale "u" |

Regole di traduzione che hanno già fatto danni:
- le scadenze si traducono per senso: "entro ottobre" = *fino alla fine* di ottobre, non "prima di ottobre";
- titoli in sentence case, non Title Case (tranne l'inglese dove serve);
- prezzi, misure e nomi di linea restano identici in tutte le lingue;
- struttura identica all'italiano: stesso numero di `##`, `###`, paragrafi e **stessi link**.

Validazione prima di caricare (fallisce = si corregge, non si pubblica):

```bash
# struttura, link, markdown vietato
for f in <prefisso>-*.md; do
  echo "$f  h2=$(grep -c '^## ' $f) h3=$(grep -c '^### ' $f) link=$(grep -o ']\(/[^)]*' $f | wc -l)"
  grep -nE '^\s*[-*] |\*\*|^# ' $f && echo "  ^ markdown non ammesso"
done
```

Limiti SEO: `seo_title` ≤ 60 caratteri (col suffisso ` | SILKinCOM`), `seo_description` ≤ 160,
`excerpt` ≤ 170.

## 7. Caricamento e programmazione dell'uscita

I file stanno in una cartella di lavoro come `<prefisso>-it.md`, `<prefisso>-en.md`, ... più
`<prefisso>-meta.json`:

```json
{ "slug": "...", "image": "https://.../blog/<uuid>.webp", "date": "2026-10-29",
  "title": { "it": "...", "en": "..." }, "description": {}, "seo_title": {}, "seo_description": {} }
```

```bash
node scripts/blog/upsert-articolo.mjs <cartella> <prefisso> published 2026-10-29T07:00:00
```

- `status='published'` + `published_at` **futuro** = uscita programmata: `src/data/posts.ts` filtra
  `published_at <= now()`, quindi esce da solo.
- Il timestamp è naive e vale come UTC: **07:00 UTC = 09:00 Roma**, l'orario standard di uscita.
- Un `PATCH` dall'admin conserva il `published_at` esistente: risalvare un articolo non lo rilascia
  in anticipo né ne sposta la data.
- Cadenza: un articolo a settimana, stesso giorno della settimana.

## 8. Anteprima a Marco: prima, non dopo

Regola fissa ([[silkincom-anteprima-prima-di-spedire]]): **niente va considerato chiuso senza aver
prima mandato il file a Marco.**

```bash
node scripts/blog/anteprima-articolo.mjs <slug> [<slug> ...] --out anteprima.html
```

Produce una pagina con, per ogni lingua, il box anteprima Google (seo_title + seo_description) e il
testo completo renderizzato come lo rende il sito. Si manda quella.

In admin esiste anche l'anteprima nativa: `/admin/blog/anteprima/<id>`, visibile anche per bozze e
programmati, con tutte e 7 le lingue.

## 9. Admin: dove sono le cose

- `/admin/blog` — tre sezioni separate con contatori: **Bozze**, **Programmati**, **Pubblicati**.
- Pannello "Genera con AI": brief in textarea + caricamento della foto di copertina. Il modello
  **vede** l'immagine (vision) e riceve il catalogo vivo con il tipo di ogni prodotto, così non
  sbaglia pashmina/sciarpa.
- Chiave OpenRouter: riquadro "Chiave AI" in admin, salvata cifrata (AES-256-GCM) nella tabella
  `integrations`, con saldo reale del conto mostrato accanto. La chiave non viene mai restituita
  dall'API. Prima di dire "il generatore non funziona": controlla saldo e validità della chiave.
- Modelli in uso: `anthropic/claude-sonnet-5`, `anthropic/claude-sonnet-4.6`,
  `anthropic/claude-sonnet-4.5`, `openai/gpt-4.1` (fallback in quest'ordine).
- `maxDuration`: 180 s su `/api/admin/blog/translate` (il tedesco superava i 60), 120 s su `/api/admin/blog/generate`.

## 10. Dopo il deploy, verifica

Niente "fatto" senza prova:

```bash
vercel ls            # la build di produzione è davvero passata?
```

Errore già pagato: dieci giorni di deploy rotti per un file non committato
([[silkincom-deploy-check]]). Dopo il push, controlla sempre che la produzione sia aggiornata e che
l'articolo risponda sul sito nella lingua giusta.

## Checklist finale

- [ ] un solo protagonista, nessun doppione interno
- [ ] tipo di capo, prezzi e misure letti dal catalogo
- [ ] formato pulito (no H1, elenchi, grassetti, link inventati)
- [ ] foto verificata libera con `foto-usata.py` e coerente col testo
- [ ] 7 lingue complete: corpo + titolo + excerpt + SEO
- [ ] struttura e link identici in tutte le lingue
- [ ] limiti SEO rispettati
- [ ] anteprima mandata a Marco **prima** di chiudere
- [ ] `status`/`published_at` corretti (07:00 UTC = 09:00 Roma)
- [ ] produzione verificata dopo il push
