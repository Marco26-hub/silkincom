'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountShell } from '@/components/account/AccountShell';
import { createBrowserClient } from '@/lib/supabase/client';

type Profile = { id: string; email: string | null; full_name: string | null; phone: string | null };

export default function ProfiloPage() {
  const t = useTranslations('account.profile');
  const tc = useTranslations('common');
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const deleteConfirmationWord = t('deleteConfirmationWord');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data as Profile);
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, phone: profile.phone })
      .eq('id', profile.id);
    setSaving(false);
    setMsg(error ? { type: 'err', text: error.message } : { type: 'ok', text: t('saved') });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPw.length < 8) {
      setPwMsg({ type: 'err', text: t('passwordMin') });
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: t('passwordMismatch') });
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setPwSaving(false);
    if (error) {
      setPwMsg({ type: 'err', text: error.message });
    } else {
      setPwMsg({ type: 'ok', text: t('passwordUpdated') });
      setPwForm({ current: '', newPw: '', confirm: '' });
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== deleteConfirmationWord) return;
    setDeleting(true);
    setDeleteMsg(null);
    const res = await fetch('/api/account/delete', { method: 'DELETE' });
    if (res.ok) {
      await supabase.auth.signOut();
      window.location.href = '/';
    } else {
      const d = await res.json();
      setDeleteMsg({ type: 'err', text: d.error ?? t('deleteError') });
      setDeleting(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-pearl-grey bg-warm-white focus:outline-none focus:border-gold-primary text-sm';

  return (
    <AccountShell title={t('title')}>
      {loading || !profile ? (
        <p className="text-sm text-soft-black/60 font-light">{tc('loading')}</p>
      ) : (
        <div className="space-y-10 max-w-xl">
          <form onSubmit={save} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('email')}</label>
              <input type="email" value={profile.email || ''} disabled className="w-full px-4 py-3 border border-pearl-grey bg-ivory text-soft-black/60 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('fullName')}</label>
              <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('phone')}</label>
              <input type="tel" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputCls} />
            </div>
            {msg && (
              <p className={`text-xs px-4 py-3 ${msg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </p>
            )}
            <button type="submit" disabled={saving} className="px-10 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-all disabled:opacity-60">
              {saving ? tc('saving') : tc('save')}
            </button>
          </form>

          <div className="border-t border-pearl-grey pt-8">
            <h2 className="font-display text-xl mb-5">{t('changePassword')}</h2>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('newPassword')}</label>
                <input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} required minLength={8} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-soft-black/70">{t('confirmPassword')}</label>
                <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} required minLength={8} className={inputCls} />
              </div>
              {pwMsg && (
                <p className={`text-xs px-4 py-3 ${pwMsg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {pwMsg.text}
                </p>
              )}
              <button type="submit" disabled={pwSaving} className="px-10 py-3 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.3em] hover:bg-gold-primary hover:text-soft-black transition-all disabled:opacity-60">
                {pwSaving ? t('updating') : t('updatePassword')}
              </button>
            </form>
          </div>
          <div className="border-t border-red-100 pt-8">
            <h2 className="font-display text-xl mb-2 text-red-700">{t('deleteTitle')}</h2>
            <p className="text-xs text-soft-black/60 mb-4">
              {t('deleteDescription')}
            </p>
            <form onSubmit={deleteAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] mb-2 text-red-600">
                  {t('deletePrompt', { word: deleteConfirmationWord })}
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={deleteConfirmationWord}
                  className="w-full px-4 py-3 border border-red-200 bg-warm-white focus:outline-none focus:border-red-500 text-sm"
                />
              </div>
              {deleteMsg && (
                <p className="text-xs px-4 py-3 bg-red-50 text-red-700 border border-red-200">
                  {deleteMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={deleting || deleteConfirm !== deleteConfirmationWord}
                className="px-10 py-3 bg-red-700 text-white text-[10px] uppercase tracking-[0.3em] hover:bg-red-800 transition-all disabled:opacity-40"
              >
                {deleting ? t('deleting') : t('deleteAction')}
              </button>
            </form>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
