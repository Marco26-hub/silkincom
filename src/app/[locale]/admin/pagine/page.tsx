'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Page = {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  created_at: string;
};

const empty: Partial<Page> = {
  title: '', slug: '', content: '',
  meta_title: '', meta_description: '', is_published: false,
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Page>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('pages')
      .select('*')
      .order('created_at', { ascending: false });
    setPages((data as Page[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(p: Page) {
    setEditing(p);
    setCreating(false);
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content,
      meta_title: p.meta_title || '',
      meta_description: p.meta_description || '',
      is_published: p.is_published,
    });
    setError(null);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm(empty);
    setError(null);
  }

  function cancel() {
    setCreating(false);
    setEditing(null);
    setForm(empty);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      slug: (form.slug || '').toLowerCase().trim(),
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
    };

    try {
      if (creating) {
        const res = await fetch('/api/admin/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      } else if (editing) {
        const res = await fetch(`/api/admin/pages/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setSaving(false); return; }
      }
      cancel();
      load();
    } catch (err: any) {
      setError(err?.message || 'Errore');
    }
    setSaving(false);
  }

  async function toggle(p: Page) {
    await fetch(`/api/admin/pages/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !p.is_published }),
    });
    load();
  }

  async function remove(p: Page) {
    if (!confirm(`Eliminare pagina ${p.title}?`)) return;
    await fetch(`/api/admin/pages/${p.id}`, { method: 'DELETE' });
    load();
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Pagine CMS</h1>
          <p className="text-soft-grey text-sm">{pages.length} pagine</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="inline-flex items-center gap-2 px-6 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="border border-pearl-grey bg-white p-6 space-y-4">
          <h2 className="text-sm font-medium mb-2">{creating ? 'Nuova pagina' : `Modifica ${editing!.title}`}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="Titolo" value={form.title || ''} onChange={(v) => setForm({ ...form, title: v })} required />
            <Inp label="Slug" value={form.slug || ''} onChange={(v) => setForm({ ...form, slug: v })} required />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Contenuto</label>
            <textarea
              value={form.content || ''}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
              rows={14}
              className={cls}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Inp label="Meta title" value={form.meta_title || ''} onChange={(v) => setForm({ ...form, meta_title: v })} />
            <Inp label="Meta description" value={form.meta_description || ''} onChange={(v) => setForm({ ...form, meta_description: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="accent-gold-primary" />
            Pubblicata
          </label>
          {error && <p className="text-xs text-red-700 bg-red-50 px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black transition-colors disabled:opacity-50">
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
            <button type="button" onClick={cancel} className="px-8 py-2.5 border border-soft-black/30 text-[10px] uppercase tracking-[0.2em]">Annulla</button>
          </div>
        </form>
      )}

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium">Titolo</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : pages.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-12 text-center text-soft-grey">Nessuna pagina</td></tr>
            ) : pages.map((p) => (
              <tr key={p.id} className="hover:bg-ivory/50">
                <td className="px-5 py-3 font-medium">{p.title}</td>
                <td className="px-5 py-3 font-mono text-xs">/{p.slug}</td>
                <td className="px-5 py-3">
                  <button onClick={() => toggle(p)} title={p.is_published ? 'Nascondi' : 'Pubblica'}>
                    {p.is_published
                      ? <ToggleRight className="w-5 h-5 text-green-600" />
                      : <ToggleLeft className="w-5 h-5 text-soft-grey" />
                    }
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-pearl-grey rounded" title="Modifica">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(p)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cls = 'w-full border border-pearl-grey px-3 py-2 text-sm focus:outline-none focus:border-soft-black';

function Inp({ label, value, onChange, required, type = 'text', step }: {
  label: string; value: string | number; onChange: (v: string) => void;
  required?: boolean; type?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">{label}</label>
      <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} required={required} className={cls} />
    </div>
  );
}
