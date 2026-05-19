'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, Copy, Check } from 'lucide-react';

type Media = {
  id: string;
  filename: string;
  storage_path: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  uploaded_at: string;
};

const cls = 'w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black';

export default function AdminMediaPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch('/api/admin/media');
    const data = await res.json();
    setMedia(data.media || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('alt_text', altText);

    try {
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setUploading(false); return; }
      setFile(null);
      setAltText('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err: any) {
      setError(err?.message || 'Errore');
    }
    setUploading(false);
  }

  async function remove(m: Media) {
    if (!confirm(`Eliminare ${m.filename}?`)) return;
    await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id }),
    });
    load();
  }

  function copyUrl(m: Media) {
    navigator.clipboard.writeText(m.url);
    setCopied(m.id);
    setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 1500);
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="font-display text-4xl mb-1">Media Library</h1>
        <p className="text-soft-grey text-sm">{media.length} file</p>
      </div>

      <form onSubmit={upload} className="border border-pearl-grey bg-white p-6 space-y-4">
        <h2 className="text-sm font-medium mb-2">Carica immagine</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">File</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={cls}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Testo alternativo</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Opzionale"
              className={cls}
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={!file || uploading}
          className="inline-flex items-center gap-2 px-8 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" /> {uploading ? 'Caricamento...' : 'Carica'}
        </button>
      </form>

      {loading ? (
        <p className="text-soft-grey text-sm py-12 text-center">Caricamento...</p>
      ) : media.length === 0 ? (
        <p className="text-soft-grey text-sm py-12 text-center border border-pearl-grey bg-white">Nessun file</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {media.map((m) => (
            <div key={m.id} className="border border-pearl-grey bg-white group">
              <button
                onClick={() => copyUrl(m)}
                className="relative block w-full aspect-square bg-ivory overflow-hidden"
                title="Copia URL"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt_text || m.filename} className="w-full h-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-soft-black/60 text-warm-white text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied === m.id ? (
                    <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> URL copiato</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Copia URL</span>
                  )}
                </span>
              </button>
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" title={m.filename}>{m.filename}</p>
                  <p className="text-[10px] text-soft-grey">{Math.round((m.size_bytes || 0) / 1024)} KB</p>
                </div>
                <button onClick={() => remove(m)} className="p-1.5 hover:bg-red-50 rounded text-red-600 shrink-0" title="Elimina">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
