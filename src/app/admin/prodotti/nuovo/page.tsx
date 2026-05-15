'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NuovoProdottoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    sku: '',
    price: '',
    compare_at_price: '',
    description_short: '',
    description_long: '',
    composition: '',
    dimensions: '',
    care_instructions: '',
    status: 'draft',
    is_featured: false,
    is_bestseller: false,
    seo_title: '',
    seo_description: '',
  });

  function setField(k: keyof typeof form, v: string | boolean) {
    if (k === 'name' && typeof v === 'string') {
      const slug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm((f) => ({ ...f, name: v, slug }));
      return;
    }
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.sku || !form.price) {
      setError('Nome, slug, SKU e prezzo sono obbligatori.');
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Errore creazione prodotto');
      setSaving(false);
      return;
    }

    router.push(`/admin/prodotti/${data.id}`);
  }

  const inputCls = 'w-full border border-pearl-grey px-4 py-3 text-sm focus:outline-none focus:border-soft-black';

  return (
    <div className="space-y-6 max-w-[900px]">
      <Link href="/admin/prodotti" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-soft-grey hover:text-soft-black">
        <ArrowLeft className="w-3.5 h-3.5" />
        Tutti i prodotti
      </Link>

      <h1 className="font-display text-4xl">Nuovo prodotto</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border border-pearl-grey bg-white p-6 space-y-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-soft-grey font-medium">Informazioni base</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Nome *</label>
              <input required value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Slug *</label>
              <input required value={form.slug} onChange={(e) => setField('slug', e.target.value)} className={inputCls + ' font-mono'} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">SKU *</label>
              <input required value={form.sku} onChange={(e) => setField('sku', e.target.value)} className={inputCls + ' font-mono'} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Stato</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls + ' bg-white'}>
                <option value="draft">Bozza</option>
                <option value="published">Pubblicato</option>
                <option value="archived">Archiviato</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Prezzo (€) *</label>
              <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setField('price', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Prezzo barrato (€)</label>
              <input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={(e) => setField('compare_at_price', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Descrizione breve</label>
            <input value={form.description_short} onChange={(e) => setField('description_short', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Descrizione lunga</label>
            <textarea rows={5} value={form.description_long} onChange={(e) => setField('description_long', e.target.value)} className={inputCls + ' resize-none'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Composizione</label>
              <input value={form.composition} onChange={(e) => setField('composition', e.target.value)} className={inputCls} placeholder="100% Cashmere" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Dimensioni</label>
              <input value={form.dimensions} onChange={(e) => setField('dimensions', e.target.value)} className={inputCls} placeholder="200 × 70 cm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Cura prodotto</label>
            <textarea rows={2} value={form.care_instructions} onChange={(e) => setField('care_instructions', e.target.value)} className={inputCls + ' resize-none'} />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setField('is_featured', e.target.checked)} className="accent-gold-primary" />
              In evidenza (home)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_bestseller} onChange={(e) => setField('is_bestseller', e.target.checked)} className="accent-gold-primary" />
              Bestseller
            </label>
          </div>
        </div>

        <div className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-soft-grey font-medium">SEO</h2>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Meta title</label>
            <input value={form.seo_title} onChange={(e) => setField('seo_title', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Meta description</label>
            <textarea rows={2} value={form.seo_description} onChange={(e) => setField('seo_description', e.target.value)} className={inputCls + ' resize-none'} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">{error}</p>
        )}

        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="px-8 py-3 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
            {saving ? 'Creazione…' : 'Crea prodotto'}
          </button>
          <Link href="/admin/prodotti" className="px-8 py-3 border border-pearl-grey text-xs uppercase tracking-[0.2em] hover:border-soft-black transition-colors">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
