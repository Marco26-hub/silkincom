/**
 * Shared admin helper: fetch a remote image (typically from Supabase Storage)
 * and trigger a browser file download. Using fetch+blob bypasses CORS issues
 * with cross-origin `<a download>` (which would otherwise just navigate to the
 * URL instead of saving it).
 *
 * Used by every admin gallery: home slides, sections, materials, collections,
 * static pages. Keeps download UX consistent and centralises filename logic.
 */

export type DownloadOptions = {
  /** Full URL of the image to download. */
  url: string;
  /** Original storage path — preferred filename source. */
  storagePath?: string | null;
  /** Italian title — used as filename fallback when storage path is missing. */
  title?: string | null;
  /** Optional explicit filename override. Wins over both above. */
  filename?: string | null;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function resolveFilename(opts: DownloadOptions, blobType?: string): string {
  if (opts.filename) return opts.filename;
  if (opts.storagePath) {
    const last = opts.storagePath.split('/').pop();
    if (last) return last;
  }
  const titleSlug = slugify(opts.title || 'image');
  const ext = ((blobType ?? 'image/jpeg').split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return `${titleSlug || 'image'}.${ext}`;
}

export async function downloadAdminImage(opts: DownloadOptions): Promise<void> {
  if (!opts.url) return;

  // Try a same-origin fetch first. Supabase Storage URLs work this way and
  // we get the blob without leaving the page. For cross-origin sources
  // (Wix CDN, Pinterest, …) the fetch fails the CORS preflight and we fall
  // back to the server-side proxy at /api/admin/download-image, which
  // streams the bytes back without CORS in the way.
  try {
    const res = await fetch(opts.url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (blob.size === 0) throw new Error('empty body');
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = resolveFilename(opts, blob.type);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return;
  } catch {
    // Fall through to the server-side proxy.
  }

  // Server-side proxy — admin auth happens inside the route handler.
  const filename = resolveFilename(opts);
  const proxyUrl =
    `/api/admin/download-image?url=${encodeURIComponent(opts.url)}` +
    `&filename=${encodeURIComponent(filename)}`;
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `proxy HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (e) {
    alert(`Download fallito: ${(e as Error).message}`);
  }
}
