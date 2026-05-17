'use client';

import { Fragment, useEffect, useState } from 'react';
import { Trash2, Mail, ChevronDown, ChevronRight } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

type Contact = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  numero_ordine: string | null;
  messaggio: string;
  status: string;
  created_at: string;
};

const STATUSES = ['new', 'in_progress', 'resolved'];

const statusLabel: Record<string, string> = {
  new: 'Nuovo',
  in_progress: 'In lavorazione',
  resolved: 'Risolto',
};

const statusBadge: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function AdminContattiPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(c: Contact, status: string) {
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, status } : x)));
    await fetch(`/api/admin/contacts/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(c: Contact) {
    if (!confirm(`Eliminare il messaggio di ${c.nome} ${c.cognome}?`)) return;
    await fetch(`/api/admin/contacts/${c.id}`, { method: 'DELETE' });
    load();
  }

  const unread = contacts.filter((c) => c.status === 'new').length;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-1">Contatti</h1>
          <p className="text-soft-grey text-sm">
            {contacts.length} messaggi
            {unread > 0 && <span className="text-gold-primary"> · {unread} da leggere</span>}
          </p>
        </div>
      </div>

      <div className="border border-pearl-grey bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-pearl-grey">
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-soft-grey">
              <th className="px-5 py-3 font-medium w-8"></th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Messaggio</th>
              <th className="px-5 py-3 font-medium">Stato</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pearl-grey/60">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Caricamento...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-soft-grey">Nessun messaggio</td></tr>
            ) : contacts.map((c) => (
              <Fragment key={c.id}>
                <tr
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className={`hover:bg-ivory/50 cursor-pointer ${c.status === 'new' ? 'font-medium' : ''}`}
                >
                  <td className="px-5 py-3 text-soft-grey">
                    {expanded === c.id
                      ? <ChevronDown className="w-3.5 h-3.5" />
                      : <ChevronRight className="w-3.5 h-3.5" />}
                  </td>
                  <td className="px-5 py-3">{c.nome} {c.cognome}</td>
                  <td className="px-5 py-3 text-xs">
                    <a
                      href={`mailto:${c.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 hover:text-gold-primary transition-colors"
                    >
                      <Mail className="w-3 h-3" /> {c.email}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-xs text-soft-grey max-w-xs truncate">{c.messaggio}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded ${statusBadge[c.status] || 'bg-pearl-grey text-soft-grey'}`}>
                      {statusLabel[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-soft-grey">{new Date(c.created_at).toLocaleString('it-IT')}</td>
                  <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={c.status}
                        onChange={(e) => changeStatus(c, e.target.value)}
                        className="border border-pearl-grey px-2 py-1 text-xs bg-white focus:outline-none focus:border-soft-black"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{statusLabel[s]}</option>
                        ))}
                      </select>
                      <button onClick={() => remove(c)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Elimina">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === c.id && (
                  <tr className="bg-ivory/40">
                    <td></td>
                    <td colSpan={6} className="px-5 py-4 space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">Messaggio</p>
                        <p className="text-sm whitespace-pre-wrap">{c.messaggio}</p>
                      </div>
                      <div className="flex gap-8 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">Telefono</p>
                          <p>{c.telefono || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">Numero ordine</p>
                          <p>{c.numero_ordine || '—'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
