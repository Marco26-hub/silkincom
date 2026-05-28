/**
 * Client-side downscale + re-encode for admin image uploads.
 *
 * Why this exists:
 *   Vercel serverless functions reject POST bodies above ~4.5 MB before the
 *   handler ever runs. Modern phone/DSLR/Photoshop exports easily exceed that
 *   (a 24-megapixel JPG straight off a Sony α7 is 8–15 MB). The upload would
 *   appear to succeed on the client, then come back with a 413 the UI quietly
 *   swallowed — and the just-uploaded image would "disappear" because the
 *   gallery refreshed from the database, which never got the row.
 *
 * What this does:
 *   Decodes the file with createImageBitmap, paints it onto an off-screen
 *   canvas no larger than `maxDimension` on its longest side, then re-encodes
 *   as progressive JPG at `quality`. The server still runs its own sharp
 *   pipeline (1600px @ q85) for a second pass — we err a bit larger here so
 *   the server has high-quality pixels to work from.
 *
 * Non-images (PDF, video) and GIFs are passed through untouched.
 */
export type DownscaleOptions = {
  /** Longest-side cap in px. Default 2400 (~2.5× a typical 1× viewport). */
  maxDimension?: number;
  /** JPEG quality, 0-1. Default 0.92. */
  quality?: number;
  /** If file is below this, return as-is. Default 1.5 MB. */
  passthroughBelowBytes?: number;
};

const IMAGE_MIME = /^image\//i;

export async function downscaleImage(
  file: File,
  opts: DownscaleOptions = {}
): Promise<File> {
  const {
    maxDimension = 2400,
    quality = 0.92,
    passthroughBelowBytes = 1.5 * 1024 * 1024,
  } = opts;

  // Skip non-images and animated GIFs (we'd lose animation).
  if (!IMAGE_MIME.test(file.type) || file.type === 'image/gif') return file;

  // Small files don't need a roundtrip through canvas.
  if (file.size <= passthroughBelowBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Decoder failure (unsupported format, corrupted file, …). Surface the
    // original — the server will either re-encode it or reject it, but at
    // least the user sees the real error rather than a silent disappearance.
    return file;
  }

  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetW, targetH)
      : (() => {
          const c = document.createElement('canvas');
          c.width = targetW;
          c.height = targetH;
          return c;
        })();

  const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) return file;

  // Tell the rasteriser to use high-quality bilinear/bicubic scaling.
  // 'high' is the spec value; some browsers ignore it but never error.
  (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = true;
  (ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // Prefer WebP — ~30% smaller than JPG at equivalent quality. Fall back
  // to JPG only if the browser refuses to encode WebP (very old Safari).
  const wantsWebp = canvas instanceof OffscreenCanvas
    ? true
    : (canvas as HTMLCanvasElement).toDataURL('image/webp').startsWith('data:image/webp');
  const mime = wantsWebp ? 'image/webp' : 'image/jpeg';
  const ext = wantsWebp ? 'webp' : 'jpg';

  let blob: Blob;
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: mime, quality });
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
        mime,
        quality,
      );
    });
  }

  // If the canvas pass somehow produced a larger file (rare, but possible for
  // already-compressed source images), keep the original — pointless to upload
  // a worse version.
  if (blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
}
