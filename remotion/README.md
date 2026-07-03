# SILKinCOM — Remotion video studio

Reel verticali 9:16 (1080×1920) brandizzati, **parametrici**. Progetto **isolato** dal build Next (package.json proprio; `remotion/` in `.vercelignore`).

## Setup
```bash
cd remotion
npm install
```

## Preview interattivo (Remotion Studio)
```bash
npm run preview        # apre lo Studio, modifica props live
```

## Render
```bash
npm run render                       # usa i default (Cernobbio · Como Fluido)
# render con props custom (un reel diverso):
npx remotion render SilkReel out/varenna-elegante.mp4 \
  --props='{"place":"Varenna","product":"Como Elegante","subtitle":"Twilly in pura seta di Como · €75","heroSrc":"https://.../foto.jpg","heroKind":"image"}'
```
`heroKind`: `"image"` (foto/card) o `"video"` (clip location). `heroSrc` = URL pubblico (CDN Blotato o foto).

## Template `SilkReel`
Hero full-bleed + Ken Burns → scrim → logo ufficiale top-right → eyebrow `LAGO DI COMO · {place}` → titolo Bodoni `{product}` → sottotitolo `{subtitle}` → footer `silkincom.com`. Flash bianco in apertura.

## Regole brand (ferree)
- **SOLO collezione Primavera-Estate**: Twilly Como (seta €75), Lario (cotone), Melzi/Riva (lino), Tivan, Darsena. **MAI** Inverno (pashmina Bellagio, sciarpe Cernobbio/Varenna/Tremezzo) finché è stagione SS.
- Nomi prodotto SOLO dal DB. `subtitle` con materiale + €.
- Musica: royalty-free, aggiunta a parte (Pixabay).

## Batch (per i reel SS)
Lanciare `remotion render` in loop variando `--props` (uno per variante/località). Output in `out/`, poi upload Blotato → schedule.
