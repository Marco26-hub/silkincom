import sharp from 'sharp';

/**
 * Re-encode an uploaded image to a sensible web-friendly variant before it
 * lands in Supabase Storage. Admins routinely upload originals straight out
 * of a camera or Photoshop export — 1.5–2.5 MB PNGs are common, and they
 * would otherwise be served as-is on the storefront. Here we standardise on
 * progressive JPG, resize to a sensible upper bound, and pick a quality that
 * is visually indistinguishable from the original.
 *
 * Photographs lose nothing perceptible from this; the file gets ~10× smaller;
 * next/image still serves AVIF/WebP variants downstream.
 *
 * Animated GIFs would lose animation through sharp's default JPG pipeline,
 * so we pass them through untouched.
 */
export type OptimisedUpload = {
  buffer: Buffer;
  contentType: string;
  ext: 'jpg' | 'webp' | 'gif';
};

export type OptimiseOptions = {
  /** Longest-side upper bound in pixels. Default 1600 (full-bleed safe). */
  maxDimension?: number;
  /** JPEG quality, 1-100. Default 85. */
  quality?: number;
};

export async function optimiseUpload(
  file: File,
  opts: OptimiseOptions = {}
): Promise<OptimisedUpload> {
  const { maxDimension = 1600, quality = 85 } = opts;

  if (file.type === 'image/gif') {
    const arr = Buffer.from(await file.arrayBuffer());
    return { buffer: arr, contentType: 'image/gif', ext: 'gif' };
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const out = await sharp(raw)
    .rotate() // honour EXIF orientation, then strip it
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 5 })
    .toBuffer();

  return { buffer: out, contentType: 'image/webp', ext: 'webp' };
}
