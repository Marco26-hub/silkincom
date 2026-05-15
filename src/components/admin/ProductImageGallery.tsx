'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Star } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
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

  return (
    <div className="border border-pearl-grey bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Immagini prodotto</h3>
        <label className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] cursor-pointer transition-colors ${uploading ? 'opacity-50' : 'bg-soft-black text-warm-white hover:bg-gold-primary hover:text-soft-black'}`}>
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

      {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2">{error}</p>}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-pearl-grey py-12 text-center text-soft-grey text-sm">
          Nessuna immagine. Carica la prima.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group border border-pearl-grey bg-ivory aspect-square">
              <Image
                src={img.image_url}
                alt={img.alt_text || ''}
                fill
                className="object-cover"
                sizes="200px"
              />
              {img.is_primary && (
                <span className="absolute top-1.5 left-1.5 bg-gold-primary text-soft-black px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Principale
                </span>
              )}
              <button
                onClick={() => remove(img.id)}
                className="absolute top-1.5 right-1.5 bg-white/90 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                title="Elimina"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
