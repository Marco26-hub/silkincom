'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

type Category = { id: string; name: string };
type Collection = { id: string; name: string };
type Composition = { id: string; name: string };
type ProductSize = { id: string; name: string };
type Color = { id: string; name: string; hex_code: string };
type Material = { id: string; name: string };
type Variant = {
  id: string;
  variant_sku: string;
  variant_name: string | null;
  price_override: number | null;
  color_id: string | null;
  material_id: string | null;
};

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function ProductEditForm({
  product,
  initialCategories = [],
  initialCollections = [],
  initialCompositions = [],
  initialSizes = [],
  initialColors = [],
  initialMaterials = [],
  initialVariants = [],
}: {
  product: any;
  initialCategories?: Category[];
  initialCollections?: Collection[];
  initialCompositions?: Composition[];
  initialSizes?: ProductSize[];
  initialColors?: Color[];
  initialMaterials?: Material[];
  initialVariants?: Variant[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name ?? '',
    slug: product.slug ?? '',
    sku: product.sku ?? '',
    price: product.price ?? '',
    compare_at_price: product.compare_at_price ?? '',
    description_short: product.description_short ?? '',
    description_long: product.description_long ?? '',
    composition: product.composition ?? '',
    dimensions: product.dimensions ?? '',
    care_instructions: product.care_instructions ?? '',
    status: product.status ?? 'draft',
    is_featured: product.is_featured ?? false,
    is_bestseller: product.is_bestseller ?? false,
    seo_title: product.seo_title ?? '',
    seo_description: product.seo_description ?? '',
    category_id: product.category_id ?? '',
    collection_id: product.collection_id ?? '',
    composition_id: product.composition_id ?? '',
    size_id: product.size_id ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [compositions, setCompositions] = useState<Composition[]>(initialCompositions);
  const [sizes, setSizes] = useState<ProductSize[]>(initialSizes);
  const [colors, setColors] = useState<Color[]>(initialColors);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [variants, setVariants] = useState<Variant[]>(initialVariants);

  const [creating, setCreating] = useState<'category' | 'collection' | 'composition' | 'size' | null>(null);

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
        category_id: form.category_id || null,
        collection_id: form.collection_id || null,
        composition_id: form.composition_id || null,
        size_id: form.size_id || null,
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

  return (
    <>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <InlineCreate
                placeholder="Nome categoria"
                onSave={createCategory}
                onCancel={() => setCreating(null)}
              />
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
              <InlineCreate
                placeholder="Nome collezione"
                onSave={createCollection}
                onCancel={() => setCreating(null)}
              />
            )}
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

      <VariantsSection
        productId={product.id}
        variants={variants}
        colors={colors}
        materials={materials}
        onVariantsChange={setVariants}
        onColorsChange={setColors}
        onMaterialsChange={setMaterials}
      />
    </>
  );
}

function VariantsSection({
  productId,
  variants,
  colors,
  materials,
  onVariantsChange,
  onColorsChange,
  onMaterialsChange,
}: {
  productId: string;
  variants: Variant[];
  colors: Color[];
  materials: Material[];
  onVariantsChange: (v: Variant[]) => void;
  onColorsChange: (c: Color[]) => void;
  onMaterialsChange: (m: Material[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newVariant, setNewVariant] = useState({ variant_sku: '', variant_name: '', color_id: '', material_id: '', price_override: '' });
  const [creatingColor, setCreatingColor] = useState(false);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setNV<K extends keyof typeof newVariant>(k: K, v: string) {
    setNewVariant((p) => ({ ...p, [k]: v }));
  }

  async function addVariant() {
    if (!newVariant.variant_sku.trim()) { setErr('SKU richiesto'); return; }
    setSaving(true);
    setErr(null);
    const res = await fetch('/api/admin/variants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        variant_sku: newVariant.variant_sku.trim(),
        variant_name: newVariant.variant_name.trim() || null,
        color_id: newVariant.color_id || null,
        material_id: newVariant.material_id || null,
        price_override: newVariant.price_override ? Number(newVariant.price_override) : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? 'Errore'); return; }
    onVariantsChange([...variants, data.variant]);
    setNewVariant({ variant_sku: '', variant_name: '', color_id: '', material_id: '', price_override: '' });
    setShowForm(false);
  }

  async function deleteVariant(id: string) {
    await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
    onVariantsChange(variants.filter((v) => v.id !== id));
  }

  async function createColor(name: string, hex: string) {
    const res = await fetch('/api/admin/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, hex_code: hex || '#000000' }),
    });
    const data = await res.json();
    if (data.data) {
      onColorsChange([...colors, data.data]);
      setNV('color_id', data.data.id);
    }
    setCreatingColor(false);
  }

  async function createMaterial(name: string) {
    const res = await fetch('/api/admin/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.data) {
      onMaterialsChange([...materials, data.data]);
      setNV('material_id', data.data.id);
    }
    setCreatingMaterial(false);
  }

  return (
    <div className="border border-pearl-grey bg-white p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium uppercase tracking-[0.15em]">Varianti</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-gold-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Aggiungi variante
          </button>
        )}
      </div>

      {variants.length > 0 && (
        <div className="border border-pearl-grey divide-y divide-pearl-grey/60">
          {variants.map((v) => {
            const color = colors.find((c) => c.id === v.color_id);
            const material = materials.find((m) => m.id === v.material_id);
            return (
              <div key={v.id} className="flex items-center gap-4 px-4 py-2.5">
                {color && (
                  <span
                    className="w-4 h-4 rounded-full border border-pearl-grey flex-shrink-0"
                    style={{ backgroundColor: color.hex_code }}
                    title={color.name}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono">{v.variant_sku}</p>
                  <p className="text-[10px] text-soft-grey">
                    {[color?.name, material?.name].filter(Boolean).join(' · ') || 'Nessun colore/materiale'}
                    {v.price_override != null && ` · €${v.price_override}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteVariant(v.id)}
                  className="text-soft-grey hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {variants.length === 0 && !showForm && (
        <p className="text-sm text-soft-grey/60">Nessuna variante. Aggiungi colori e materiali specifici.</p>
      )}

      {showForm && (
        <div className="border border-pearl-grey/60 p-4 space-y-3 bg-warm-white/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="SKU variante *">
              <input
                value={newVariant.variant_sku}
                onChange={(e) => setNV('variant_sku', e.target.value)}
                className={inputCls}
                placeholder="es. SKU-001-ROSSO"
              />
            </Field>
            <Field label="Nome variante">
              <input
                value={newVariant.variant_name}
                onChange={(e) => setNV('variant_name', e.target.value)}
                className={inputCls}
                placeholder="es. Rosso carminio"
              />
            </Field>

            <Field label="Colore">
              <select
                value={newVariant.color_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') { setCreatingColor(true); setNV('color_id', ''); }
                  else setNV('color_id', e.target.value);
                }}
                className={inputCls + ' bg-white'}
              >
                <option value="">— nessuno —</option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">+ Aggiungi colore</option>
              </select>
              {creatingColor && (
                <InlineColorCreate onSave={createColor} onCancel={() => setCreatingColor(false)} />
              )}
            </Field>

            <Field label="Materiale">
              <select
                value={newVariant.material_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') { setCreatingMaterial(true); setNV('material_id', ''); }
                  else setNV('material_id', e.target.value);
                }}
                className={inputCls + ' bg-white'}
              >
                <option value="">— nessuno —</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                <option value="__new__">+ Aggiungi materiale</option>
              </select>
              {creatingMaterial && (
                <InlineCreate
                  placeholder="Nome materiale"
                  onSave={createMaterial}
                  onCancel={() => setCreatingMaterial(false)}
                />
              )}
            </Field>

            <Field label="Prezzo override (€)">
              <input
                type="number"
                step="0.01"
                value={newVariant.price_override}
                onChange={(e) => setNV('price_override', e.target.value)}
                className={inputCls}
                placeholder="Lascia vuoto = prezzo base"
              />
            </Field>
          </div>

          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addVariant}
              disabled={saving}
              className="px-5 py-2 bg-soft-black text-warm-white text-xs uppercase tracking-[0.15em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva variante'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setErr(null); }}
              className="px-5 py-2 text-xs text-soft-grey hover:text-soft-black"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
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
        className={inputCls + ' flex-1'}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (value.trim()) onSave(value.trim()); } if (e.key === 'Escape') onCancel(); }}
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

function InlineColorCreate({
  onSave,
  onCancel,
}: {
  onSave: (name: string, hex: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#000000');
  return (
    <div className="mt-1.5 flex gap-2 items-center">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome colore"
        className={inputCls + ' flex-1'}
      />
      <input
        type="color"
        value={hex}
        onChange={(e) => setHex(e.target.value)}
        className="w-9 h-9 border border-pearl-grey cursor-pointer p-0.5 bg-white"
        title="Scegli colore"
      />
      <button
        type="button"
        onClick={() => { if (name.trim()) onSave(name.trim(), hex); }}
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

const inputCls = 'w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">{label}</label>
      {children}
    </div>
  );
}
