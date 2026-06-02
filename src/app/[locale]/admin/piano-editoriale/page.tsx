'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays, Plus, Trash2, Check, Circle, SkipForward, Loader2,
  Info, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';

type Item = {
  id: string;
  scheduled_date: string;
  channel: string;
  action_type: string;
  title: string;
  notes: string | null;
  product_slug: string | null;
  status: 'planned' | 'done' | 'skipped';
};

const CHANNELS = ['etsy', 'instagram', 'facebook', 'tiktok', 'pinterest', 'threads', 'youtube', 'email', 'blog'];
const ACTIONS = ['post', 'reel', 'story', 'listing_new', 'renew', 'restock', 'promo', 'email', 'article'];

const CHANNEL_DOT: Record<string, string> = {
  etsy: 'bg-[#F1641E]', instagram: 'bg-pink-500', facebook: 'bg-blue-600',
  tiktok: 'bg-soft-black', pinterest: 'bg-red-600', threads: 'bg-soft-black',
  youtube: 'bg-red-500', email: 'bg-gold-primary', blog: 'bg-green-600',
};

const STATUS_STYLE: Record<string, string> = {
  planned: 'text-soft-grey',
  done: 'text-green-700',
  skipped: 'text-soft-grey/50 line-through',
};

const empty = {
  scheduled_date: '', channel: 'instagram', action_type: 'post',
  title: '', notes: '', product_slug: '',
};

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function PianoEditorialePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [showStrategy, setShowStrategy] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // AI generation
  const todayISO = new Date().toISOString().slice(0, 10);
  const [gen, setGen] = useState({
    startDate: todayISO,
    days: 14,
    channels: ['instagram', 'facebook', 'tiktok', 'pinterest'] as string[],
    goal: '',
  });
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function toggleGenChannel(c: string) {
    setGen((g) => ({
      ...g,
      channels: g.channels.includes(c) ? g.channels.filter((x) => x !== c) : [...g.channels, c],
    }));
  }

  async function generate() {
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await fetch('/api/admin/content-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gen),
      });
      const d = await res.json();
      if (d.ok) {
        setGenMsg({ type: 'ok', text: `${d.inserted} contenuti generati e aggiunti al calendario.` });
        await load();
      } else {
        setGenMsg({ type: 'err', text: d.error || 'Errore generazione' });
      }
    } catch (e) {
      setGenMsg({ type: 'err', text: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content-plan');
      const d = await res.json();
      setItems(d.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/content-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.ok) { setForm({ ...empty }); await load(); }
      else setMsg(d.error || 'Errore');
    } finally { setSaving(false); }
  }

  async function cycleStatus(it: Item) {
    const next = it.status === 'planned' ? 'done' : it.status === 'done' ? 'skipped' : 'planned';
    await fetch('/api/admin/content-plan', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.id, status: next }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questa voce?')) return;
    await fetch(`/api/admin/content-plan?id=${id}`, { method: 'DELETE' });
    load();
  }

  // Group by date
  const groups: Record<string, Item[]> = {};
  for (const it of items) (groups[it.scheduled_date] ??= []).push(it);
  const dates = Object.keys(groups).sort();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-gold-primary" />
        <div>
          <h1 className="font-display text-4xl">Piano editoriale</h1>
          <p className="text-soft-grey text-sm">Strategia + calendario contenuti — Etsy, social (Blotato), email</p>
        </div>
      </div>

      {/* Strategy */}
      <div className="border border-pearl-grey bg-ivory/50">
        <button onClick={() => setShowStrategy(s => !s)} className="w-full flex items-center justify-between px-5 py-3 text-left">
          <span className="flex items-center gap-2 text-sm font-medium"><Info className="w-4 h-4 text-gold-dark" /> Strategia SILKinCOM</span>
          {showStrategy ? <ChevronUp className="w-4 h-4 text-soft-grey" /> : <ChevronDown className="w-4 h-4 text-soft-grey" />}
        </button>
        {showStrategy && (
          <div className="px-5 pb-5 space-y-4 text-sm text-soft-grey leading-relaxed">
            <div>
              <p className="text-soft-black font-medium mb-1">Posizionamento</p>
              <p>Maison di seta e cashmere, tradizione serica di Como dal 1400. Lusso accessibile, editoriale, Made in Como. Heritage + Lago di Como come storia distintiva.</p>
            </div>
            <div>
              <p className="text-soft-black font-medium mb-1">Prodotti traino (Etsy + social)</p>
              <p>Sciarpe cashmere · foulard/twilly seta · pashmina. Apparel (cap, t-shirt, lino) = secondari. Spingere i regali (gift for her/him) e l'occasione.</p>
            </div>
            <div>
              <p className="text-soft-black font-medium mb-1">Mercati</p>
              <p>IT (base) · EN (US/UK, mercato #1 Etsy) · DE + FR (luxury EU alto valore). Tradurre title+tag per ranking nella ricerca di ogni lingua.</p>
            </div>
            <div>
              <p className="text-soft-black font-medium mb-1">Cadenza consigliata (settimana tipo)</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>Lun</strong> — Reel IG/TikTok: lavorazione/heritage (dietro le quinte Como)</li>
                <li><strong>Mer</strong> — Post IG/FB prodotto + Pinterest pin (link Etsy/sito)</li>
                <li><strong>Ven</strong> — Story IG + Threads: novità/restock, push regalo</li>
                <li><strong>Etsy</strong> — renew listing chiave 1×/sett, restock stagionale</li>
                <li><strong>Email</strong> — 1 newsletter ogni 2 sett (collezione + storia)</li>
              </ul>
            </div>
            <div>
              <p className="text-soft-black font-medium mb-1">Funnel</p>
              <p>Social (awareness, virale) → sito/Etsy (SEO/GEO, conversione) → email (retention). Google Ads = spinta a pagamento sui best-seller.</p>
            </div>
          </div>
        )}
      </div>

      {/* AI generation */}
      <div className="border border-gold-primary/40 bg-gold-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-dark" />
          <h2 className="text-sm font-medium">Genera con AI</h2>
          <span className="text-xs text-soft-grey">— calendario completo, strategia social media manager senior</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">Data inizio</label>
            <input type="date" value={gen.startDate} onChange={(e) => setGen({ ...gen, startDate: e.target.value })} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">Durata</label>
            <select value={gen.days} onChange={(e) => setGen({ ...gen, days: Number(e.target.value) })} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white">
              <option value={7}>1 settimana</option>
              <option value={14}>2 settimane</option>
              <option value={30}>1 mese</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1">Obiettivo (opz.)</label>
            <input type="text" value={gen.goal} onChange={(e) => setGen({ ...gen, goal: e.target.value })} placeholder="es. lancio capsule cashmere, regali Natale" className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">Canali</label>
          <div className="flex flex-wrap gap-2">
            {['instagram', 'facebook', 'tiktok', 'pinterest', 'threads', 'youtube', 'email'].map((c) => {
              const on = gen.channels.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleGenChannel(c)} className={`px-3 py-1 text-xs border transition-colors ${on ? 'border-soft-black bg-soft-black text-warm-white' : 'border-pearl-grey text-soft-grey hover:border-soft-black'}`}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        {genMsg && (
          <p className={`text-xs ${genMsg.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{genMsg.text}</p>
        )}
        <button onClick={generate} disabled={generating || gen.channels.length === 0} className="inline-flex items-center gap-2 px-6 py-2 bg-gold-primary text-soft-black text-[10px] uppercase tracking-[0.2em] hover:bg-gold-dark hover:text-warm-white transition-colors disabled:opacity-40">
          {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Genero il piano…</> : <><Sparkles className="w-3.5 h-3.5" /> Genera calendario</>}
        </button>
        <p className="text-[11px] text-soft-grey">Aggiunge i post generati al calendario sotto (stato “planned”). Puoi modificarli o eliminarli singolarmente.</p>
      </div>

      {/* Add form */}
      <form onSubmit={add} className="border border-pearl-grey bg-white p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-soft-grey font-medium">Nuova voce (manuale)</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" required value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="border border-pearl-grey px-3 py-2 text-sm bg-white" />
          <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} className="border border-pearl-grey px-3 py-2 text-sm bg-white">
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.action_type} onChange={e => setForm({ ...form, action_type: e.target.value })} className="border border-pearl-grey px-3 py-2 text-sm bg-white">
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="text" placeholder="Prodotto (slug, opz.)" value={form.product_slug} onChange={e => setForm({ ...form, product_slug: e.target.value })} className="border border-pearl-grey px-3 py-2 text-sm bg-white" />
        </div>
        <input type="text" required placeholder="Titolo / cosa pubblicare" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white" />
        <textarea placeholder="Note (caption, hook, hashtag…)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white resize-y" />
        {msg && <p className="text-xs text-red-700">{msg}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2 bg-soft-black text-warm-white text-[10px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-40">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Aggiungi
        </button>
      </form>

      {/* Calendar list */}
      {loading ? (
        <div className="flex items-center gap-2 text-soft-grey py-12"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento…</div>
      ) : dates.length === 0 ? (
        <p className="text-center text-soft-grey py-12 text-sm">Nessuna voce. Aggiungi la prima sopra.</p>
      ) : (
        <div className="space-y-5">
          {dates.map(date => (
            <div key={date} className="border border-pearl-grey bg-white">
              <div className="px-5 py-2 border-b border-pearl-grey bg-warm-white">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-soft-black font-medium">{fmtDay(date)}</h3>
              </div>
              <ul className="divide-y divide-pearl-grey/60">
                {groups[date].map(it => (
                  <li key={it.id} className="px-5 py-3 flex items-start gap-3">
                    <button onClick={() => cycleStatus(it)} title={it.status} className="mt-0.5 shrink-0">
                      {it.status === 'done' ? <Check className="w-4 h-4 text-green-600" /> : it.status === 'skipped' ? <SkipForward className="w-4 h-4 text-soft-grey/50" /> : <Circle className="w-4 h-4 text-soft-grey" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] ${STATUS_STYLE[it.status]}`}>
                          <span className={`w-2 h-2 rounded-full ${CHANNEL_DOT[it.channel] ?? 'bg-soft-grey'}`} />
                          {it.channel} · {it.action_type}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 ${it.status === 'skipped' ? 'line-through text-soft-grey/60' : ''}`}>{it.title}</p>
                      {it.product_slug && <p className="text-[11px] text-gold-dark">{it.product_slug}</p>}
                      {it.notes && <p className="text-xs text-soft-grey mt-0.5 whitespace-pre-line">{it.notes}</p>}
                    </div>
                    <button onClick={() => remove(it.id)} className="text-soft-grey hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
