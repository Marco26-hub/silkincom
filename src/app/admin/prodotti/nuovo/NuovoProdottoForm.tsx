'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Category = { id: string; name: string };
type Collection = { id: string; name: string };
type Composition = { id: string; name: string };
type ProductSize = { id: string; name: string };
type Color = { id: string; name: string; hex_code: string };
type Material = { id: string; name: string };

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function NuovoProdottoForm({
  initialCategories,
  initialCollections,
  initialCompositions,
  initialSizes,
  initialColors,
  initialMaterials,
}: {
  initialCategories: Category[];
  initialCollections: Collection[];
  initialCompositions: Composition[];
  initialSizes: ProductSize[];
  initialColors: Color[];
  initialMaterials: Material[];
}) {
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
    care_instructions: '',
    status: 'draft',
    is_featured: false,
    is_bestseller: false,
    seo_title: '',
    seo_description: '',
    category_id: '',
    collection_id: '',
    composition_id: '',
    size_id: '',
  });

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [compositions, setCompositions] = useState<Composition[]>(initialCompositions);
  const [sizes, setSizes] = useState<ProductSize[]>(initialSizes);

  const [creating, setCreating] = useState<'category' | 'collection' | 'composition' | 'size' | null>(null);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
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
        category_id: form.category_id || null,
        collection_id: form.collection_id || null,
        composition_id: form.composition_id || null,
        size_id: form.size_id || null,
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

  async function createCategory(name: string) {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: toSlug(name) }),
    });
    const data = await res.json();
    if (data.data) {
      setCategories((prev) => [...prev, { id: data.data.id, name: data.data.name }]);
      setField('category_id', data.data.id);
    }
    setCreating(null);
  }

  async function createCollection(name: string) {
    const res = await fetch('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: toSlug(name) }),
    });
    const data = await res.json();
    if (data.data) {
      setCollections((prev) => [...prev, { id: data.data.id, name: data.data.name }]);
      setField('collection_id', data.data.id);
    }
    setCreating(null);
  }

  async function createComposition(name: string) {
    const res = await fetch('/api/admin/compositions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.data) {
      setCompositions((prev) => [...prev, { id: data.data.id, name: data.data.name }]);
      setField('composition_id', data.data.id);
    }
    setCreating(null);
  }

  async function createSize(name: string) {
    const res = await fetch('/api/admin/sizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.data) {
      setSizes((prev) => [...prev, { id: data.data.id, name: data.data.name }]);
      setField('size_id', data.data.id);
    }
    setCreating(null);
  }

  const inputCls = 'w-full border border-pearl-grey px-4 py-3 text-sm focus:outline-none focus:border-soft-black';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-pearl-grey bg-white p-6 space-y-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-soft-grey font-medium">Informazioni base</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Nome *">
            <input required value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Slug *">
            <input required value={form.slug} onChange={(e) => setField('slug', e.target.value)} className={inputCls + ' font-mono'} />
          </Field>
          <Field label="SKU *">
            <input required value={form.sku} onChange={(e) => setField('sku', e.target.value)} className={inputCls + ' font-mono'} />
          </Field>
          <Field label="Stato">
            <select value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls + ' bg-white'}>
              <option value="draft">Bozza</option>
              <option value="published">Pubblicato</option>
              <option value="archived">Archiviato</option>
            </select>
          </Field>
          <Field label="Prezzo (€) *">
            <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setField('price', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Prezzo barrato (€)">
            <input type="number" min="0" step="0.01" value={form.compare_at_price} onChange={(e) => setField('compare_at_price', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Categoria">
            <select
              value={form.category_id}
              onChange={(e) => {
                if (e.target.value === '__new__') { setCreating('category'); setField('category_id', ''); }
                else setField('category_id', e.target.value);
              }}
              className={inputCls + ' bg-white'}
            >
              <option value="">— nessuna —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Aggiungi categoria</option>
            </select>
            {creating === 'category' && (
              <InlineCreate placeholder="Nome categoria" onSave={createCategory} onCancel={() => setCreating(null)} />
            )}
          </Field>

          <Field label="Collezione">
            <select
              value={form.collection_id}
              onChange={(e) => {
                if (e.target.value === '__new__') { setCreating('collection'); setField('collection_id', ''); }
                else setField('collection_id', e.target.value);
              }}
              className={inputCls + ' bg-white'}
            >
              <option value="">— nessuna —</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Aggiungi collezione</option>
            </select>
            {creating === 'collection' && (
              <InlineCreate placeholder="Nome collezione" onSave={createCollection} onCancel={() => setCreating(null)} />
            )}
          </Field>
        </div>

        <Field label="Descrizione breve">
          <input value={form.description_short} onChange={(e) => setField('description_short', e.target.value)} className={inputCls} />
        </Field>

        <Field label="Descrizione lunga">
          <textarea rows={5} value={form.description_long} onChange={(e) => setField('description_long', e.target.value)} className={inputCls + ' resize-none'} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Composizione">
            <select
              value={form.composition_id}
              onChange={(e) => {
                if (e.target.value === '__new__') { setCreating('composition'); setField('composition_id', ''); }
                else setField('composition_id', e.target.value);
              }}
              className={inputCls + ' bg-white'}
            >
              <option value="">— nessuna —</option>
              {compositions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Aggiungi composizione</option>
            </select>
            {creating === 'composition' && (
              <InlineCreate placeholder="es. 100% cashmere" onSave={createComposition} onCancel={() => setCreating(null)} />
            )}
          </Field>

          <Field label="Dimensioni">
            <select
              value={form.size_id}
              onChange={(e) => {
                if (e.target.value === '__new__') { setCreating('size'); setField('size_id', ''); }
                else setField('size_id', e.target.value);
              }}
              className={inputCls + ' bg-white'}
            >
              <option value="">— nessuna —</option>
              {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="__new__">+ Aggiungi dimensione</option>
            </select>
            {creating === 'size' && (
              <InlineCreate placeholder="es. 180 × 45 cm" onSave={createSize} onCancel={() => setCreating(null)} />
            )}
          </Field>
        </div>

        <Field label="Cura prodotto">
          <textarea rows={2} value={form.care_instructions} onChange={(e) => setField('care_instructions', e.target.value)} className={inputCls + ' resize-none'} />
        </Field>

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
        <Field label="Meta title">
          <input value={form.seo_title} onChange={(e) => setField('seo_title', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Meta description">
          <textarea rows={2} value={form.seo_description} onChange={(e) => setField('seo_description', e.target.value)} className={inputCls + ' resize-none'} />
        </Field>
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
  );
}

function InlineCreate({
  placeholder,
  onSave,
  onCancel,
}: {
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="mt-1.5 flex gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black"
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); if (value.trim()) onSave(value.trim()); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        type="button"
        onClick={() => { if (value.trim()) onSave(value.trim()); }}
        className="px-3 py-2 bg-soft-black text-warm-white text-xs hover:bg-gold-primary hover:text-soft-black transition-colors"
      >
        Crea
      </button>
      <button type="button" onClick={onCancel} className="px-3 py-2 text-xs text-soft-grey hover:text-soft-black">
        ✕
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">{label}</label>
      {children}
    </div>
  );
}
