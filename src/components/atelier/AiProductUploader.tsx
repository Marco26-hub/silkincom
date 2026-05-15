'use client';

import { FormEvent, useMemo, useState } from 'react';

type DraftResponse = {
  ok: boolean;
  draft?: {
    name: string;
    slug: string;
    sku: string;
    price: number;
    descriptionShort: string;
    composition: string;
    imageLayout: {
      heroImageIndex: number;
      desktopRatio: string;
      mobileRatio: string;
    };
  };
  persisted?: {
    productId: string;
    slug: string;
    imageUrls: string[];
  } | null;
  warnings?: string[];
  error?: string;
};

export function AiProductUploader() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DraftResponse | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const form = new FormData(event.currentTarget);
    files.forEach((file) => form.append('photos', file));

    try {
      const response = await fetch('/api/automation/product-from-photos', {
        method: 'POST',
        body: form,
      });
      const data: DraftResponse = await response.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Upload non riuscito. Riprova.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-20 bg-warm-white">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-display font-light text-4xl md:text-5xl mb-4">
          Inserisci prodotto da foto
        </h1>
        <p className="text-soft-grey font-light mb-10">
          Carica foto da telefono: l&apos;AI propone scheda prodotto e layout gallery, pronta
          per bozza e-commerce.
        </p>

        <form onSubmit={onSubmit} className="space-y-5 border border-pearl-grey/60 p-6 md:p-8">
          <input
            name="productNameHint"
            placeholder="Nome prodotto (facoltativo)"
            className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
          />
          <input
            name="priceHint"
            type="number"
            step="0.01"
            min="1"
            placeholder="Prezzo suggerito (es. 120)"
            className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors"
          />
          <textarea
            name="notes"
            rows={4}
            placeholder="Note (materiale, stagione, stile, dettagli)"
            className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors resize-none"
          />
          <input name="persist" type="hidden" value="true" />
          <input name="initialStock" type="hidden" value="0" />

          <label className="block">
            <span className="block text-sm text-soft-grey mb-2">Foto prodotto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="w-full"
            />
          </label>

          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {previews.map((preview) => (
                <img
                  key={preview.url}
                  src={preview.url}
                  alt={preview.name}
                  className="w-full aspect-square object-cover border border-pearl-grey/60"
                />
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-10 py-4 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.25em] hover:bg-gold-primary hover:text-soft-black transition-all duration-300 disabled:opacity-60"
          >
            {loading ? 'Elaborazione AI...' : 'Genera bozza prodotto'}
          </button>
        </form>

        {result && (
          <div className="mt-8 border border-pearl-grey/60 p-6">
            {result.ok && result.draft ? (
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-gold-primary">Bozza generata</p>
                <h2 className="font-display text-3xl">{result.draft.name}</h2>
                <p className="text-sm text-soft-grey">Slug: {result.draft.slug} · SKU: {result.draft.sku}</p>
                <p className="text-soft-black/80">{result.draft.descriptionShort}</p>
                <p className="text-sm">
                  Prezzo: €{result.draft.price.toFixed(2)} · Composizione: {result.draft.composition}
                </p>
                <p className="text-xs text-soft-grey">
                  Layout: hero #{result.draft.imageLayout.heroImageIndex + 1}, desktop {result.draft.imageLayout.desktopRatio}, mobile {result.draft.imageLayout.mobileRatio}
                </p>
                {result.persisted?.slug ? (
                  <p className="text-sm text-green-700">
                    Salvato in bozza nel DB con slug: {result.persisted.slug}
                  </p>
                ) : null}
                {result.warnings?.length ? (
                  <ul className="text-xs text-amber-700 space-y-1">
                    {result.warnings.map((w) => (
                      <li key={w}>- {w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-red-700 text-sm">{result.error || 'Errore generazione'}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
