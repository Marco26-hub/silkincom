// Prebuild responsive assets without using the quota-limited hosted optimizer.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const cardDir = "public/experience/cards";
const sources = [
  ...["lago-di-como", "lago-maggiore", "como-stadio-sinigaglia"].map(
    (name) => `/experience/${name}.webp`,
  ),
  ...(await fs.readdir(cardDir))
    .filter((name) => name.endsWith(".webp"))
    .map((name) => `/experience/cards/${name}`),
  "/artisans/tessitore-tessitura-como.webp",
];
const manifest = {};
let originalBytes = 0,
  smallBytes = 0;
for (const source of sources) {
  const input = `public${source}`;
  const isHero =
    !source.includes("/cards/") && !source.startsWith("/artisans/");
  const metadata = await sharp(input).metadata();
  if (!metadata.width)
    throw new Error(`Cannot determine image width: ${input}`);
  const widths = [
    ...new Set(
      (isHero ? [480, 768, 1280, 1920] : [480, 768, 1200]).map((width) =>
        Math.min(width, metadata.width),
      ),
    ),
  ];
  const variants = [];
  for (const width of widths) {
    const output = `/experience/responsive${source.replace(/\.webp$/, `-${width}.webp`)}`;
    await fs.mkdir(path.dirname(`public${output}`), { recursive: true });
    await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: isHero ? 77 : 75, effort: 6 })
      .toFile(`public${output}`);
    const { size } = await fs.stat(`public${output}`);
    variants.push({ width, src: output, bytes: size });
  }
  manifest[source] = variants;
  originalBytes += (await fs.stat(input)).size;
  smallBytes += variants[0].bytes;
}
await fs.writeFile(
  "src/data/experience-images.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    images: sources.length,
    originalBytes,
    smallBytes,
    savingsPercent: Math.round((1 - smallBytes / originalBytes) * 100),
  }),
);
