/**
 * One-shot image optimisation pass.
 *
 * Targets the assets that dominate the LCP / total transfer on every page:
 *   - 4 oversized PNGs (editorial + artisans, ~7 MB combined) — convert to
 *     resized JPG. Photographs gain nothing from PNG lossless encoding.
 *   - 18 Instagram-grid JPGs (~6 MB combined) — re-compress in place at a
 *     lower quality and a sensible max width. They render at most ~400 px
 *     wide in the UI so 1200 px sources are plenty.
 *
 * After the rewrite, run the inline `sed` calls (printed at the end) to
 * update the source-tree references that point at the .png files.
 *
 * Usage: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

// Big PNGs → resized JPG. The renamed file lives next to the original so
// we can sed the references afterwards.
const PNG_CONVERSIONS = [
  { src: 'public/editorial/foto_sciarpe_1.png', dst: 'public/editorial/foto_sciarpe_1.jpg', maxWidth: 1920, quality: 85 },
  { src: 'public/artisans/telaio-silkincom-blu.png', dst: 'public/artisans/telaio-silkincom-blu.jpg', maxWidth: 1600, quality: 85 },
  { src: 'public/artisans/telaio-artigiano-principale.png', dst: 'public/artisans/telaio-artigiano-principale.jpg', maxWidth: 1600, quality: 85 },
  { src: 'public/artisans/twill-dettaglio-jacquard.png', dst: 'public/artisans/twill-dettaglio-jacquard.jpg', maxWidth: 1600, quality: 85 },
];

const IG_DIR = 'public/instagram';
const IG_MAX_WIDTH = 1200;
const IG_QUALITY = 78;

async function bytes(p) {
  try {
    const s = await fs.promises.stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

function kb(n) {
  return `${(n / 1024).toFixed(0)} KB`;
}

async function processPng() {
  let beforeTotal = 0;
  let afterTotal = 0;
  for (const job of PNG_CONVERSIONS) {
    const inp = path.join(ROOT, job.src);
    const out = path.join(ROOT, job.dst);
    if (!fs.existsSync(inp)) {
      console.warn(`SKIP (missing): ${job.src}`);
      continue;
    }
    const before = await bytes(inp);
    beforeTotal += before;
    await sharp(inp)
      .rotate() // honour EXIF orientation, strip it
      .resize({ width: job.maxWidth, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: job.quality, mozjpeg: true, progressive: true })
      .toFile(out);
    const after = await bytes(out);
    afterTotal += after;
    // Remove the source PNG once the JPG is on disk — references in code
    // will be updated to the .jpg path so the .png becomes dead weight.
    await fs.promises.unlink(inp);
    console.log(`PNG→JPG: ${job.src}  ${kb(before)} → ${kb(after)}  (-${(((before - after) / before) * 100).toFixed(0)}%)`);
  }
  return { beforeTotal, afterTotal };
}

async function processInstagram() {
  let beforeTotal = 0;
  let afterTotal = 0;
  const igAbs = path.join(ROOT, IG_DIR);
  if (!fs.existsSync(igAbs)) return { beforeTotal, afterTotal };
  const files = (await fs.promises.readdir(igAbs)).filter((f) => /\.(jpe?g)$/i.test(f));
  for (const f of files) {
    const inp = path.join(igAbs, f);
    const tmp = `${inp}.tmp`;
    const before = await bytes(inp);
    beforeTotal += before;
    await sharp(inp)
      .rotate()
      .resize({ width: IG_MAX_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: IG_QUALITY, mozjpeg: true, progressive: true })
      .toFile(tmp);
    await fs.promises.rename(tmp, inp);
    const after = await bytes(inp);
    afterTotal += after;
    console.log(`IG re-compress: instagram/${f}  ${kb(before)} → ${kb(after)}  (-${(((before - after) / before) * 100).toFixed(0)}%)`);
  }
  return { beforeTotal, afterTotal };
}

(async () => {
  console.log('--- PNG → JPG conversion ---');
  const png = await processPng();

  console.log('\n--- Instagram JPG re-compression ---');
  const ig = await processInstagram();

  const totalBefore = png.beforeTotal + ig.beforeTotal;
  const totalAfter = png.afterTotal + ig.afterTotal;
  console.log('\n--- Summary ---');
  console.log(`PNG block: ${kb(png.beforeTotal)} → ${kb(png.afterTotal)}`);
  console.log(`Instagram block: ${kb(ig.beforeTotal)} → ${kb(ig.afterTotal)}`);
  console.log(`TOTAL: ${kb(totalBefore)} → ${kb(totalAfter)}  (saved ${kb(totalBefore - totalAfter)}, -${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%)`);

  console.log('\n--- Remember to update code references ---');
  console.log("grep -rln '\\.png' src/data/blog.json src/app/\\[locale\\]/artigiani/page.tsx");
})();
