---
name: silkincom-logo
description: Scheda tecnica del logo SILKinCOM (sagoma del Lago di Como) ricamato sulla T-shirt Lario — sorgente ufficiale, forma, misura reale, posizione sul capo, colore del filo per ogni colore, texture a punto raso e componenti Remotion. Usa SEMPRE prima di disegnare, comporre, animare o verificare il logo in reel, UGC, caroselli, packshot o foto lifestyle SILKinCOM.
metadata:
  version: 1.0.0
  updated: 2026-09-19
---

# Logo SILKinCOM — il Lago di Como ricamato

Regola di Marco: **"il logo del lago di Como deve essere lo stesso medesimo"** ovunque. Un solo simbolo,
una sola forma, una sola misura. Questa scheda è la fonte unica: se un dato qui non torna con un asset,
è l'asset a essere sbagliato.

## 1. Sorgente ufficiale (unica)

- File: `remotion/public/logo.png` (1500×1499, identico a `public/logo-official.png` del sito). Il simbolo è
  la componente connessa a destra del marchio (bbox nel PNG ≈ x1111 y397 w286 h629).
- Vettoriale derivato: `remotion/src/lakePaths.ts` — tela 544×720 unità, `LAKE_BBOX = [145,80,397,638]`
  (252×558 unità, rapporto larghezza/altezza **0,45**).
- Punti notevoli (unità): punta nord `389.9, 89.2` (in alto a DESTRA) · giunzione dei rami `271.7, 428.7` ·
  estremo ramo di Como (sinistra, il più lungo, curva in basso a sinistra) `157.5, 633.8` · estremo ramo di
  Lecco (destra) `393, 596`.
- Orientamento: **dritto**, mai ruotato né specchiato. Sembra una "λ" slanciata: tronco che sale verso
  destra, due gambe in basso.

**MAI ricalcare il logo da una foto** (capo piegato, indossato, packshot generato): è ruotato, in
prospettiva e spesso ridisegnato dall'AI. Errore già pagato il 18/09/2026: tutti i video Lario avevano un
logo "storto" perché tracciato dal packshot piegato. Si parte sempre da `remotion/public/logo.png`.

## 2. Misura e posizione reali (misurate sui packshot del sito `remotion/public/lario-col-*.jpg`)

| Dato | Valore |
|---|---|
| Altezza logo | **6,2% della larghezza del busto** del capo steso (≈ 3,1 cm su taglia M da 50 cm) |
| Larghezza logo | ≈ 3,3% della larghezza del busto (≈ 1,6 cm) |
| Altezza logo / larghezza esterna del colletto | ≈ **0,16** (metro utile sulle foto indossate) |
| Posizione orizzontale | centro al **74% della larghezza del busto** da sinistra di chi guarda = petto SINISTRO di chi indossa |
| Posizione verticale | centro al **32% dell'altezza del capo** dall'alto (≈ 23% della larghezza busto sopra la linea ascelle) |

È un logo **piccolo e fine**. Marco 19/09/2026: *"il logo è un po' più piccolo in realtà"* → nel dubbio
si sbaglia per difetto, mai per eccesso. Valori in uso dopo la correzione (−12%): `SC = 0.19` px/unità
sotto l'ago (`LarioEmbroideryCinematic.tsx`, `LarioEmbroideryUGC.tsx`), `logoH` per foto in
`larioColors.ts`.

## 3. Colore del filo per colore del capo

| Lario | Filo | Texture | Stato |
|---|---|---|---|
| Bianca | blu notte (navy) | `navy` | da copy approvato da Marco (il packshot del sito mostra il retro) |
| Nera | bianco | `white` | verificato sul packshot del sito |
| Blu Notte | bianco ghiaccio | `white` | verificato |
| Azzurra | blu notte | `navy` | verificato (RGB ≈ 0,23,77) |
| Grigio Melange | oro | `gold` | verificato (RGB ≈ 151,128,72) |
| Fucsia | **bordeaux** tono su tono | `bordeaux` | verificato (RGB ≈ 122,0,32) — NON navy |
| Verde Salvia | scuro tono su tono | `dark` | NON verificabile dal packshot (mostra il retro): chiedere a Marco |

## 4. Aspetto del ricamo

Richieste di Marco, in ordine: "NON VA BENE questo ricamo" (corda grossa, passo 17) → "più fine, più
smussato, filo più compatto e fine" → "non sembra ricamato con il filo" (texture piatta).

Quello che funziona (generatore `ugc/lario-bianca-ricamo/09_tools/` + texture in `remotion/public/`):

- **Punto raso**: fili paralleli che attraversano ogni ramo quasi perpendicolari all'asse (inclinazione 14°),
  passo 5 unità (≈ 0,36 mm su un logo da 4 cm). Colonna unica punta nord → giunzione → ramo di Lecco; ramo di
  Como come sezione separata (il confine tra sezioni è realistico).
- Colonna bombata (i fili scendono nel tessuto ai bordi → bordo più scuro e leggermente smerlato), riflesso
  anisotropo lungo il filo spezzato filo per filo, variazione di tono per filo ±5%.
- File: `lario-lake-embroidery-<navy|white|gold|dark|bordeaux>.png` (544×720, vista normale) e `…-macro.png`
  (1088×1440, fili singoli leggibili); ombre `lario-lake-embroidery-shadow(.png|-light.png)`.
- Nuovo colore di filo: NON rigenerare la geometria, ricolorare la texture navy con
  `ugc/lario-bianca-ricamo/09_tools/thread_recolor.py <nome> lo base spec` (così è nato il bordeaux).
- Sotto i ~130 px di altezza a schermo il filo non si risolve: conta il colore pieno + ombra. Per far
  *vedere* il filo serve un primo piano con logo ≥ 450 px (`boost` di `MacroScene`).
- Mai sfocare il logo, mai riflessi "sweep" che sbiancano il navy.

## 5. Componenti Remotion

- `EmbroideredLakeLogo.tsx` — `{id, progress, scale, texture, shadow, macro}`; `macroFor(altezzaPx)`,
  `lakeTipAt(progress)`, `LAKE_UNITS_H`. Rivelazione punto per punto: Como → Lecco → tronco fino alla punta
  nord (il ricamo finito resta davanti al piedino).
- `larioColors.ts` — per colore: foto lifestyle ripulita (`lf-clean-*.jpg`, logo AI rimosso), `logoX/Y/H/Rot`
  del logo ufficiale sovrapposto, filo, clip ricolorato.
- Scena macchina: testa ferma con maschera sul metallo (`mask-machine-head.png`), telaio che trasla, patch
  di tessuto `machine-patch-<colore>.png` nel layer mobile, ricolorazione `09_tools/recolor2.py`.

## 6. Controlli prima dell'anteprima

1. Forma = simbolo ufficiale, dritto (rotazione foto 0–2°, mai inclinato a occhio).
2. Misura: altezza ≈ 0,16 × colletto sulle foto indossate; ≈ 6% del busto sui capi stesi.
3. Filo del colore giusto (tabella §3) — il fucsia è bordeaux.
4. Nessun logo AI residuo sotto quello ufficiale (foto ripulite).
5. Primo piano: i fili si vedono; piano largo: colore pieno, bordo netto.
