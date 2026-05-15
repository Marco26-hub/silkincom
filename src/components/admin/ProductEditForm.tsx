'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProductEditForm({ product }: { product: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    compare_at_price: product.compare_at_price ?? '',
    description_short: product.description_short ?? '',
    description_long: product.description_long ?? '',
    composition: product.composition ?? '',
    dimensions: product.dimensions ?? '',
    care_instructions: product.care_instructions ?? '',
    status: product.status,
    is_featured: product.is_featured ?? false,
    is_bestseller: product.is_bestseller ?? false,
    seo_title: product.seo_title ?? '',
    seo_description: product.seo_description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setMsg({ type: 'err', text: data.error ?? 'Errore' });
    else {
      setMsg({ type: 'ok', text: 'Salvato' });
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-6 border border-pearl-grey bg-white p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome">
          <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} required />
        </Field>
        <Field label="Slug">
          <input value={form.slug} onChange={(e) => setField('slug', e.target.value)} className={inputCls} required />
        </Field>
        <Field label="SKU">
          <input value={form.sku} onChange={(e) => setField('sku', e.target.value)} className={inputCls} required />
        </Field>
        <Field label="Stato">
          <select value={form.status} onChange={(e) => setField('status', e.target.value as any)} className={inputCls + ' bg-white'}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </Field>
        <Field label="Prezzo (€)">
          <input type="number" step="0.01" value={form.price} onChange={(e) => setField('price', e.target.value as any)} className={inputCls} required />
        </Field>
        <Field label="Prezzo barrato (€)">
          <input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setField('compare_at_price', e.target.value as any)} className={inputCls} />
        </Field>
      </div>

      <Field label="Descrizione breve">
        <input value={form.description_short} onChange={(e) => setField('description_short', e.target.value)} className={inputCls} />
      </Field>

      <Field label="Descrizione lunga">
        <textarea value={form.description_long} onChange={(e) => setField('description_long', e.target.value)} className={inputCls} rows={4} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Composizione">
          <input value={form.composition} onChange={(e) => setField('composition', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Dimensioni">
          <input value={form.dimensions} onChange={(e) => setField('dimensions', e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Cura prodotto">
        <textarea value={form.care_instructions} onChange={(e) => setField('care_instructions', e.target.value)} className={inputCls} rows={2} />
      </Field>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_featured} onChange={(e) => setField('is_featured', e.target.checked)} />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_bestseller} onChange={(e) => setField('is_bestseller', e.target.checked)} />
          Bestseller
        </label>
      </div>

      <div className="border-t border-pearl-grey pt-6 space-y-4">
        <h3 className="text-sm font-medium">SEO</h3>
        <Field label="Meta title">
          <input value={form.seo_title} onChange={(e) => setField('seo_title', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Meta description">
          <textarea value={form.seo_description} onChange={(e) => setField('seo_description', e.target.value)} className={inputCls} rows={2} />
        </Field>
      </div>

      {msg && (
        <p className={`text-xs px-3 py-2 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>
      )}

      <button type="submit" disabled={saving} className="px-8 py-3 bg-soft-black text-warm-white text-xs uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
        {saving ? 'Salvataggio...' : 'Salva'}
      </button>
    </form>
  );
}

const inputCls = 'w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">{label}</label>
      {children}
    </div>
  );
}
