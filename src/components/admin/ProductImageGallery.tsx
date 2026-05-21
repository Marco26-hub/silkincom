'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Star, ArrowLeft, ArrowRight, RefreshCw, Download } from 'lucide-react';
import Image from 'next/image';

type ProductImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
};

export function ProductImageGallery({ productId }: { productId: string }) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTargetId = useRef<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/products/${productId}/images`);
    const data = await res.json();
    setImages(data.images || []);
  }

  useEffect(() => { load(); }, [productId]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('alt_text', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      const res = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Upload fallito');
      }
    }
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    load();
  }

  async function remove(imageId: string) {
    if (!confirm('Eliminare immagine?')) return;
    await fetch(`/api/admin/products/${productId}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId }),
    });
    load();
  }

  // Optimistic reorder, then persist. display_order + primary follow the array.
  async function persistOrder(next: ProductImage[]) {
    setImages(next);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Riordino fallito');
      load();
    }
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[index], next[j]] = [next[j], next[index]];
    persistOrder(next);
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [pick] = next.splice(index, 1);
    next.unshift(pick);
    persistOrder(next);
  }

  function triggerReplace(imageId: string) {
    replaceTargetId.current = imageId;
    replaceRef.current?.click();
  }

  async function doReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = replaceTargetId.current;
    if (!file || !targetId) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('replaceId', targetId);
    const res = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Sostituzione fallita');
    }
    if (replaceRef.current) replaceRef.current.value = '';
    replaceTargetId.current = null;
    setBusy(false);
    load();
  }

  async function download(img: ProductImage) {
    try {
      const res = await fetch(img.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = (img.image_url.split('?')[0].split('.').pop() || 'jpg');
      a.download = `${(img.alt_text || 'immagine').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(img.image_url, '_blank');
    }
  }

  const iconBtn =
    'p-1.5 bg-white/95 hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-30 disabled:hover:bg-white/95 disabled:hover:text-current';

  return (
    <div className="border border-pearl-grey bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Immagini prodotto</h3>
          <p className="text-[11px] text-soft-grey mt-0.5">
            La prima immagine è la principale. Usa le frecce per spostarle.
          </p>
        </div>
        <label
          className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] cursor-pointer transition-colors ${
            uploading ? 'opacity-50' : 'bg-soft-black text-warm-white hover:bg-gold-primary hover:text-soft-black'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Caricamento...' : 'Carica'}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={upload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Shared hidden input for single-image replace */}
      <input
        ref={replaceRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={doReplace}
        className="hidden"
      />

      {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2">{error}</p>}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-pearl-grey py-12 text-center text-soft-grey text-sm">
          Nessuna immagine. Carica la prima.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div key={img.id} className="relative group border border-pearl-grey bg-ivory aspect-square">
              <Image
                src={img.image_url}
                alt={img.alt_text || ''}
                fill
                className="object-cover"
                sizes="200px"
              />

              {index === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-gold-primary text-soft-black px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] flex items-center gap-1 z-10">
                  <Star className="w-2.5 h-2.5" /> Principale
                </span>
              )}

              <button
                onClick={() => remove(img.id)}
                disabled={busy}
                className="absolute top-1.5 right-1.5 bg-white/95 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-30 z-10"
                title="Elimina"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </button>

              {/* Action bar */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1.5 bg-gradient-to-t from-soft-black/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => move(index, -1)}
                  disabled={busy || index === 0}
                  className={iconBtn}
                  title="Sposta indietro"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => makePrimary(index)}
                  disabled={busy || index === 0}
                  className={iconBtn}
                  title="Imposta come principale"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={busy || index === images.length - 1}
                  className={iconBtn}
                  title="Sposta avanti"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => triggerReplace(img.id)}
                  disabled={busy}
                  className={iconBtn}
                  title="Sostituisci immagine"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => download(img)}
                  disabled={busy}
                  className={iconBtn}
                  title="Scarica immagine"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
