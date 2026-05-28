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

export async function downloadAdminImage(opts: DownloadOptions): Promise<void> {
  if (!opts.url) return;
  try {
    const res = await fetch(opts.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;

    let filename = opts.filename || '';
    if (!filename && opts.storagePath) {
      filename = opts.storagePath.split('/').pop() || '';
    }
    if (!filename) {
      const titleSlug = slugify(opts.title || 'image');
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      filename = `${titleSlug || 'image'}.${ext}`;
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (e) {
    alert(`Download fallito: ${(e as Error).message}`);
  }
}
