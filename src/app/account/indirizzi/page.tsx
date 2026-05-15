'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AccountShell } from '@/components/account/AccountShell';
import { createBrowserClient } from '@/lib/supabase/client';

type Address = {
  id: string;
  full_name: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  is_default: boolean;
  type: string | null;
};

const blank: Partial<Address> = {
  full_name: '', street_address: '', city: '', postal_code: '',
  country: 'IT', phone: '', is_default: false, type: 'shipping',
};

export default function IndirizziPage() {
  const t = useTranslations('account.addressesPage');
  const tc = useTranslations('common');
  const supabase = createBrowserClient();
  const [items, setItems] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'idle' | 'add' | 'edit'>('idle');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Address>>(blank);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false });
    setItems((data as Address[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startAdd() {
    setMode('add');
    setEditId(null);
    setForm(blank);
    setError(null);
  }

  function startEdit(a: Address) {
    setMode('edit');
    setEditId(a.id);
    setForm({
      full_name: a.full_name || '',
      street_address: a.street_address || '',
      city: a.city || '',
      postal_code: a.postal_code || '',
      country: a.country || 'IT',
      phone: a.phone || '',
      is_default: a.is_default,
      type: a.type || 'shipping',
    });
    setError(null);
  }

  function cancel() {
    setMode('idle');
    setEditId(null);
    setForm(blank);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (mode === 'add') {
      const { error: insertError } = await supabase.from('customer_addresses').insert({
        ...form,
        customer_id: user.id,
      });
      if (insertError) { setError(insertError.message); return; }
    } else if (mode === 'edit' && editId) {
      const { error: updateError } = await supabase
        .from('customer_addresses')
        .update({
          full_name: form.full_name,
          street_address: form.street_address,
          city: form.city,
          postal_code: form.postal_code,
          country: form.country,
          phone: form.phone,
          is_default: form.is_default,
          type: form.type,
        })
        .eq('id', editId)
        .eq('customer_id', user.id);
      if (updateError) { setError(updateError.message); return; }
    }
    cancel();
    load();
  }

  async function remove(id: string) {
    await supabase.from('customer_addresses').delete().eq('id', id);
    load();
  }

  return (
    <AccountShell title={t('title')}>
      {loading ? (
        <p className="text-sm text-soft-black/60 font-light">{tc('loading')}</p>
      ) : (
        <>
          {items.length === 0 && mode === 'idle' && (
            <div className="bg-ivory border border-pearl-grey/60 px-8 py-14 text-center mb-6">
              <MapPin className="w-10 h-10 text-gold-primary stroke-1 mx-auto mb-5" />
              <p className="font-display font-light text-xl mb-3">{t('empty')}</p>
              <p className="text-sm text-soft-black/60 font-light mb-7 max-w-md mx-auto">{t('emptyDesc')}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {items.map((a) => (
              <div key={a.id} className="border border-pearl-grey/60 p-6 bg-warm-white">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gold-primary">
                    {a.type === 'billing' ? t('billing') : t('shipping')}{a.is_default && ` • ${t('defaultLabel')}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(a)} aria-label="Modifica" className="text-soft-black/40 hover:text-soft-black">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(a.id)} aria-label={t('deleteAria')} className="text-soft-black/40 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="font-display text-lg mb-2">{a.full_name}</p>
                <p className="text-sm font-light text-soft-black/75 leading-relaxed">
                  {a.street_address}<br />
                  {a.postal_code} {a.city}<br />
                  {a.country}
                </p>
                {a.phone && <p className="text-xs text-soft-black/60 mt-2">{a.phone}</p>}
              </div>
            ))}
          </div>

          {mode !== 'idle' ? (
            <form onSubmit={save} className="border border-pearl-grey/60 p-6 bg-ivory space-y-4">
              <h3 className="text-sm font-medium mb-2">{mode === 'add' ? t('addAddress') : 'Modifica indirizzo'}</h3>
              <Field label={t('fullName')} value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <Field label={t('street')} value={form.street_address} onChange={(v) => setForm({ ...form, street_address: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('postalCode')} value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
                <Field label={t('city')} value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('country')} value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
                <Field label={t('phone')} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required={false} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('type')}</label>
                <select
                  value={form.type || 'shipping'}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary text-sm"
                >
                  <option value="shipping">{t('shipping')}</option>
                  <option value="billing">{t('billing')}</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-soft-black/70">
                <input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="accent-gold-primary" />
                {t('setDefault')}
              </label>
              {error && <p className="text-xs text-red-700">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-8 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-all">{tc('save')}</button>
                <button type="button" onClick={cancel} className="px-8 py-3 border border-soft-black/30 text-[10px] uppercase tracking-[0.3em]">{tc('cancel')}</button>
              </div>
            </form>
          ) : (
            <button onClick={startAdd} className="inline-flex items-center gap-2 px-8 py-3 border border-soft-black text-[10px] uppercase tracking-[0.3em] hover:bg-soft-black hover:text-warm-white transition-all">
              <Plus className="w-3.5 h-3.5" /> {t('addAddress')}
            </button>
          )}
        </>
      )}
    </AccountShell>
  );
}

function Field({ label, value, onChange, required = true }: { label: string; value?: string | null; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary transition-colors text-sm"
      />
    </div>
  );
}
