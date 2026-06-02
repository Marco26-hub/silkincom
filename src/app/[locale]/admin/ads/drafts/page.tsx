'use client';

/**
 * Admin /ads/drafts — campaign blueprint editor.
 *
 * Workflow:
 *   1. Click «Nuova bozza» — creates a placeholder ad_drafts row.
 *   2. Pick one or more product slugs from the catalog dropdown.
 *   3. Click «Genera con AI» — Claude returns 15 headlines, 4 descriptions,
 *      20 keywords. Editable inline.
 *   4. Set budget / target ROAS / final URL.
 *   5. Status moves draft → published once pushed to Google (Phase 3).
 *
 * Each row is editable inline; the right column shows a live preview of
 * the Responsive Search Ad as Google would render it on the search results
 * page (alternating headlines + description rotation).
 */

import { useEffect, useState } from 'react';
import { Sparkles, Trash2, Plus, Save, Eye, Loader2, Info, AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

type Draft = {
  id: string;
  source: 'google_ads' | 'meta';
  status: 'draft' | 'published' | 'archived';
  name: string;
  channel_type: string | null;
  daily_budget: number | null;
  target_roas: number | null;
  target_cpa: number | null;
  bidding_strategy: string | null;
  final_url: string | null;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
  audience_notes: string | null;
  product_slugs: string[];
  generated_with_ai: boolean;
  updated_at: string;
};

type ProductOption = { slug: string; name: string };

const fmtEUR = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

export default function AdDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [active, setActive] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const draftsRes = await fetch('/api/admin/ads/drafts');
    const draftsJson = await draftsRes.json();
    setDrafts((draftsJson.drafts ?? []) as Draft[]);
    // Catalog is small (~40 rows). Read it client-side via Supabase to skip
    // adding another admin API endpoint just to list slugs.
    const supabase = createBrowserClient();
    const { data: rows } = await supabase
      .from('products')
      .select('slug, name')
      .eq('status', 'published')
      .order('name');
    setProducts((rows as ProductOption[] | null) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createDraft() {
    setBusy(true);
    const res = await fetch('/api/admin/ads/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nuova bozza ' + new Date().toLocaleDateString('it-IT') }),
    });
    const json = await res.json();
    if (res.ok) {
      setActive(json.draft);
      await load();
    }
    setBusy(false);
  }

  async function updateDraft(patch: Partial<Draft>) {
    if (!active) return;
    setBusy(true);
    const res = await fetch('/api/admin/ads/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: active.id, ...patch }),
    });
    const json = await res.json();
    if (res.ok) {
      setActive(json.draft);
      await load();
    }
    setBusy(false);
  }

  async function deleteDraft(id: string) {
    if (!confirm('Eliminare definitivamente questa bozza?')) return;
    await fetch('/api/admin/ads/drafts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (active?.id === id) setActive(null);
    await load();
  }

  async function generateAi() {
    if (!active) return;
    if (active.product_slugs.length === 0) {
      setMsg('Seleziona almeno un prodotto prima di generare');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/ads/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slugs: active.product_slugs,
          locale: 'it',
          draft_id: active.id,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg(`Generati ${json.copy.headlines.length} titoli, ${json.copy.descriptions.length} descrizioni, ${json.copy.keywords.length} keyword`);
        await load();
        // refetch active
        const updated = await (await fetch('/api/admin/ads/drafts')).json();
        const next = (updated.drafts ?? []).find((d: Draft) => d.id === active.id);
        if (next) setActive(next);
      } else {
        setMsg(json.error || 'Errore generazione');
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-gold-primary" />
          <div>
            <h1 className="font-display text-4xl">Bozze pubblicità</h1>
            <p className="text-soft-grey text-sm">Crea annunci Google Ads con copy scritta dall'AI — pronti da rivedere e pubblicare</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ads"
            className="inline-flex items-center gap-2 px-4 py-2 border border-pearl-grey hover:border-soft-black text-[11px] uppercase tracking-[0.2em]"
          >
            ← Performance
          </Link>
          <button
            onClick={createDraft}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-warm-white text-[11px] uppercase tracking-[0.2em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Nuova bozza
          </button>
        </div>
      </div>

      {msg && (
        <div className="border border-pearl-grey bg-ivory px-4 py-2 text-xs text-soft-black">{msg}</div>
      )}

      {/* Spiegazione del flusso — leggibile */}
      <div className="border border-pearl-grey bg-ivory/50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gold-dark" />
          <h2 className="text-sm font-medium">Come funziona</h2>
        </div>
        <p className="text-sm text-soft-grey leading-relaxed max-w-[820px]">
          Qui crei le bozze degli <strong>annunci a pagamento Google Ads</strong> (ricerca sponsorizzata).
          L'AI scrive titoli, descrizioni e parole chiave già ottimizzati per le ricerche dei clienti —
          tu li rivedi e pubblichi.
        </p>
        <ol className="text-sm text-soft-grey space-y-1.5 list-decimal list-inside max-w-[820px]">
          <li><strong>Nuova bozza</strong> → scegli uno o più prodotti dal catalogo</li>
          <li><strong>Genera copy con AI</strong> → 15 titoli (max 30 caratteri), 4 descrizioni (max 90), 20 keyword. Tutto modificabile a mano</li>
          <li>Imposta <strong>budget giornaliero</strong>, target ROAS e URL di destinazione</li>
          <li><strong>Pubblica su Google</strong> → crea la campagna nel tuo account Google Ads</li>
        </ol>
        <div className="border-t border-pearl-grey/60 pt-3 space-y-2 text-xs text-soft-grey max-w-[820px]">
          <p>
            <strong className="text-soft-black">SEO, GEO e "virale" sono cose diverse:</strong>{' '}
            Google Ads porta traffico <em>a pagamento</em> (non organico, non virale) — la copy è ricca di
            keyword per intercettare chi cerca. La visibilità organica (SEO/GEO) si lavora su sito ed Etsy;
            il "virale" sui social (sezione <strong>Social</strong> / Blotato). Questa pagina = solo annunci a pagamento.
          </p>
          <p className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-amber-700">Pubblicazione su Google non ancora attiva.</strong>{' '}
              Serve collegare Google Ads (OAuth + developer token). Finché non è connesso, le bozze restano
              qui pronte: le copi a mano in Google Ads, oppure le pubblichi in un clic appena colleghiamo l'account.
              Nessun audit/punteggio automatico al momento — la copy è già ottimizzata in generazione.
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Drafts list */}
        <div className="border border-pearl-grey bg-white">
          <div className="px-4 py-3 border-b border-pearl-grey bg-warm-white">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-soft-grey font-medium">
              {drafts.length} bozze
            </h3>
          </div>
          <ul className="divide-y divide-pearl-grey/60 max-h-[640px] overflow-y-auto">
            {drafts.map((d) => (
              <li
                key={d.id}
                onClick={() => setActive(d)}
                className={`px-4 py-3 cursor-pointer hover:bg-ivory/40 ${
                  active?.id === d.id ? 'bg-ivory/60 border-l-2 border-gold-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{d.name}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDraft(d.id);
                    }}
                    className="text-soft-grey hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-[0.2em] text-soft-grey">
                  <span>{d.status}</span>
                  {d.generated_with_ai && (
                    <span className="text-gold-primary">· AI</span>
                  )}
                  <span>· {d.headlines.length} titoli</span>
                </div>
              </li>
            ))}
            {drafts.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-soft-grey">
                Nessuna bozza. Click «Nuova bozza» per iniziare.
              </li>
            )}
          </ul>
        </div>

        {/* Editor */}
        {active ? (
          <div className="space-y-5">
            <div className="border border-pearl-grey bg-white p-5 space-y-4">
              <input
                value={active.name}
                onChange={(e) => setActive({ ...active, name: e.target.value })}
                onBlur={(e) => updateDraft({ name: e.target.value })}
                className="w-full font-display text-2xl border-b border-pearl-grey/60 focus:border-gold-primary focus:outline-none pb-1"
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <FieldLabel label="Budget giornaliero">
                  <input
                    type="number"
                    step="0.01"
                    value={active.daily_budget ?? ''}
                    onChange={(e) =>
                      setActive({
                        ...active,
                        daily_budget: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    onBlur={(e) =>
                      updateDraft({
                        daily_budget: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="€"
                    className="w-full border border-pearl-grey px-3 py-2 text-sm"
                  />
                </FieldLabel>
                <FieldLabel label="Target ROAS">
                  <input
                    type="number"
                    step="0.1"
                    value={active.target_roas ?? ''}
                    onChange={(e) =>
                      setActive({
                        ...active,
                        target_roas: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    onBlur={(e) =>
                      updateDraft({
                        target_roas: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="3.0"
                    className="w-full border border-pearl-grey px-3 py-2 text-sm"
                  />
                </FieldLabel>
                <FieldLabel label="Tipo campagna">
                  <select
                    value={active.channel_type ?? 'SEARCH'}
                    onChange={(e) => {
                      setActive({ ...active, channel_type: e.target.value });
                      updateDraft({ channel_type: e.target.value });
                    }}
                    className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
                  >
                    <option value="SEARCH">Search</option>
                    <option value="PERFORMANCE_MAX">Performance Max</option>
                    <option value="SHOPPING">Shopping</option>
                  </select>
                </FieldLabel>
                <FieldLabel label="Final URL">
                  <input
                    value={active.final_url ?? ''}
                    onChange={(e) => setActive({ ...active, final_url: e.target.value })}
                    onBlur={(e) => updateDraft({ final_url: e.target.value })}
                    placeholder="https://www.silkincom.com/…"
                    className="w-full border border-pearl-grey px-3 py-2 text-sm"
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="Prodotti inclusi">
                <select
                  multiple
                  value={active.product_slugs}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setActive({ ...active, product_slugs: selected });
                    updateDraft({ product_slugs: selected });
                  }}
                  className="w-full border border-pearl-grey px-3 py-2 text-sm h-32 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-soft-grey mt-1">
                  Cmd/Ctrl + click per selezionare più prodotti
                </p>
              </FieldLabel>

              <button
                onClick={generateAi}
                disabled={busy || active.product_slugs.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-primary text-soft-black text-[11px] uppercase tracking-[0.2em] hover:bg-gold-dark hover:text-warm-white transition-colors disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Genera copy con AI
              </button>
            </div>

            {/* Headlines + descriptions + keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="border border-pearl-grey bg-white p-5">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-3">
                  Titoli ({active.headlines.length}/15) · max 30 caratteri
                </h3>
                <ArrayEditor
                  items={active.headlines}
                  maxItems={15}
                  maxLength={30}
                  onChange={(items) => {
                    setActive({ ...active, headlines: items });
                    updateDraft({ headlines: items });
                  }}
                  placeholder="Es. Sciarpe in seta — Made in Como"
                />
              </div>

              <div className="border border-pearl-grey bg-white p-5">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-3">
                  Descrizioni ({active.descriptions.length}/4) · max 90 caratteri
                </h3>
                <ArrayEditor
                  items={active.descriptions}
                  maxItems={4}
                  maxLength={90}
                  onChange={(items) => {
                    setActive({ ...active, descriptions: items });
                    updateDraft({ descriptions: items });
                  }}
                  placeholder="Es. Tradizione serica dal 1400. Spedizione gratuita sopra 200 €."
                />
              </div>
            </div>

            <div className="border border-pearl-grey bg-white p-5">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-3">
                Keyword ({active.keywords.length}/20)
              </h3>
              <ArrayEditor
                items={active.keywords}
                maxItems={20}
                maxLength={80}
                onChange={(items) => {
                  setActive({ ...active, keywords: items });
                  updateDraft({ keywords: items });
                }}
                placeholder="Es. sciarpe seta made in italy"
              />
            </div>

            {/* SERP preview */}
            <div className="border border-pearl-grey bg-white p-5">
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-soft-grey mb-3 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Anteprima Google Search
              </h3>
              <div className="border border-pearl-grey/60 p-4 max-w-[600px]">
                <p className="text-xs text-[#202124] mb-1">
                  <span className="text-[#202124] font-bold mr-1">Sponsorizzato</span>
                  {active.final_url || 'silkincom.com'}
                </p>
                <p className="text-[#1a0dab] text-lg leading-tight">
                  {active.headlines[0] || 'Titolo'} | {active.headlines[1] || 'Secondo titolo'} | SILKinCOM
                </p>
                <p className="text-[#4d5156] text-sm mt-1">
                  {active.descriptions[0] || 'Descrizione della tua campagna…'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-pearl-grey bg-white p-10 text-center text-soft-grey text-sm">
            Seleziona una bozza dalla lista, oppure crea una nuova.
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.2em] text-soft-grey mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ArrayEditor({
  items,
  maxItems,
  maxLength,
  onChange,
  placeholder,
}: {
  items: string[];
  maxItems: number;
  maxLength: number;
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={v}
            maxLength={maxLength}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className="flex-1 border border-pearl-grey px-3 py-1.5 text-sm focus:border-gold-primary focus:outline-none"
          />
          <span className="text-[10px] text-soft-grey/70 w-12 text-right tabular-nums">
            {v.length}/{maxLength}
          </span>
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-soft-grey hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {items.length < maxItems && (
        <button
          onClick={() => onChange([...items, ''])}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-soft-grey hover:text-gold-primary"
        >
          <Plus className="w-3 h-3" /> Aggiungi
        </button>
      )}
    </div>
  );
}
