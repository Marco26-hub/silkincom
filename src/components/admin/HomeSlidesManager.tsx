'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import {
  ArrowUp, ArrowDown, Pencil, Trash2, Eye, EyeOff,
  Upload, Languages, Save, X, Plus, Loader2, ImageIcon, Sparkles,
} from 'lucide-react';

type I18nMap = Record<string, string>;

type Slide = {
  id: string;
  image_url: string;
  storage_path: string;
  title_i18n: I18nMap;
  subtitle_i18n: I18nMap;
  alt_i18n: I18nMap;
  focus: string;
  display_order: number;
  is_active: boolean;
};

const FOCUS_OPTIONS = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Alto' },
  { value: 'bottom', label: 'Basso' },
  { value: 'left', label: 'Sinistra' },
  { value: 'right', label: 'Destra' },
];

export function HomeSlidesManager({ initialSlides }: { initialSlides: Slide[] }) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function reload() {
    const res = await fetch('/api/admin/home-slides');
    if (res.ok) {
      const json = await res.json();
      setSlides(json.slides || []);
    }
    refresh();
  }

  async function move(id: string, direction: -1 | 1) {
    const idx = slides.findIndex((s) => s.id === id);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= slides.length) return;

    const next = [...slides];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    const items = next.map((s, i) => ({ id: s.id, display_order: i + 1 }));
    setSlides(next.map((s, i) => ({ ...s, display_order: i + 1 })));

    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/home-slides/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      refresh();
    } catch (e) {
      setError((e as Error).message);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(slide: Slide) {
    setBusyId(slide.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/home-slides/${slide.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ is_active: !slide.is_active }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const { slide: updated } = await res.json();
      setSlides(slides.map((s) => (s.id === slide.id ? updated : s)));
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Eliminare questa slide? Operazione irreversibile.')) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/home-slides/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setSlides(slides.filter((s) => s.id !== id));
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function translate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/home-slides/${id}/translate`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function replaceImage(id: string, file: File) {
    setBusyId(id);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/home-slides/${id}/image`, { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm rounded flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      <div className="flex justify-between items-center">
        <p className="text-sm text-soft-grey">{slides.length} slide totali · {slides.filter((s) => s.is_active).length} attive</p>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2 text-sm hover:bg-soft-black/90"
        >
          <Plus className="w-4 h-4" /> Nuova slide
        </button>
      </div>

      {showUpload ? (
        <UploadForm
          onCancel={() => setShowUpload(false)}
          onCreated={async () => {
            setShowUpload(false);
            await reload();
          }}
        />
      ) : null}

      <div className="space-y-3">
        {slides.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-pearl-grey text-soft-grey">
            Nessuna slide. Aggiungi la prima per popolare la home.
          </div>
        ) : (
          slides.map((slide, i) => (
            <SlideRow
              key={slide.id}
              slide={slide}
              isFirst={i === 0}
              isLast={i === slides.length - 1}
              busy={busyId === slide.id}
              isEditing={editingId === slide.id}
              onEdit={() => setEditingId(editingId === slide.id ? null : slide.id)}
              onMoveUp={() => move(slide.id, -1)}
              onMoveDown={() => move(slide.id, 1)}
              onToggleActive={() => toggleActive(slide)}
              onDelete={() => remove(slide.id)}
              onTranslate={() => translate(slide.id)}
              onReplaceImage={(file) => replaceImage(slide.id, file)}
              onSaved={async () => {
                setEditingId(null);
                await reload();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

type AiModel = { id: string; label: string; free: boolean };

function UploadForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [titleIt, setTitleIt] = useState('');
  const [subtitleIt, setSubtitleIt] = useState('');
  const [altIt, setAltIt] = useState('');
  const [focus, setFocus] = useState('center');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(true);

  // Load model catalogue on first mount. Endpoint is admin-gated, so the
  // user already authenticated to reach this form.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/home-slides/suggest');
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        setModels(j.models || []);
        setSelectedModel(j.default_model || '');
        setHasEnvKey(!!j.has_env_key);
      } catch {
        // Silent — dropdown stays empty, user can still hit submit with default.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function onFilePicked() {
    const file = fileRef.current?.files?.[0];
    setAiInfo(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } else {
      setPreviewUrl(null);
    }
  }

  async function suggest() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr('Carica prima un\'immagine');
      return;
    }
    setSuggesting(true);
    setErr(null);
    setAiInfo(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (selectedModel) fd.append('model', selectedModel);
      if (apiKey.trim()) fd.append('api_key', apiKey.trim());
      const res = await fetch('/api/admin/home-slides/suggest', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      if (j.title_it) setTitleIt(j.title_it);
      if (j.subtitle_it) setSubtitleIt(j.subtitle_it);
      if (j.alt_it) setAltIt(j.alt_it);
      setAiInfo(`Suggerito da AI (${j.model || 'vision model'}). Modifica liberamente prima di caricare.`);
    } catch (e) {
      setErr(`AI: ${(e as Error).message}`);
    } finally {
      setSuggesting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr('Seleziona un file'); return; }
    if (!titleIt.trim()) { setErr('Titolo IT richiesto'); return; }

    setSubmitting(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title_it', titleIt);
      fd.append('subtitle_it', subtitleIt);
      fd.append('alt_it', altIt);
      fd.append('focus', focus);

      const res = await fetch('/api/admin/home-slides', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-pearl-grey bg-white p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg">Nuova slide</h3>
        <button type="button" onClick={onCancel}><X className="w-4 h-4" /></button>
      </div>

      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Immagine *</label>
        <div className="flex items-start gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm"
            onChange={onFilePicked}
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="anteprima"
              className="w-28 h-20 object-cover border border-pearl-grey"
            />
          ) : null}
          <button
            type="button"
            onClick={suggest}
            disabled={suggesting || !previewUrl}
            className="inline-flex items-center gap-2 border border-gold-primary text-gold-dark px-3 py-1.5 text-xs uppercase tracking-[0.18em] hover:bg-gold-primary hover:text-soft-black disabled:opacity-50 transition-colors"
            title={previewUrl ? 'Genera titolo/sottotitolo/alt italiani da questa immagine' : 'Carica prima un\'immagine'}
          >
            {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Suggerisci con AI
          </button>
        </div>
        <p className="text-[11px] text-soft-grey mt-1">JPG/PNG/WebP, max 10 MB. Sarà caricata su Supabase Storage (bucket <code>home-slides</code>).</p>
        {aiInfo ? (
          <p className="text-[11px] text-gold-dark mt-1 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {aiInfo}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-pearl-grey/20 border border-pearl-grey">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soft-grey mb-1">
              Modello AI vision
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full border border-pearl-grey px-2 py-1.5 text-xs bg-white"
            >
              {models.length === 0 ? <option value="">Caricamento…</option> : null}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.free ? '🆓 ' : '💳 '}{m.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-soft-grey mt-1">Default free. Modelli a pagamento richiedono crediti su OpenRouter.</p>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-soft-grey mb-1">
              API key OpenRouter
              <span className="ml-1 text-soft-grey/70 normal-case">
                {hasEnvKey ? '(env Vercel attiva — vuoto = usa quella)' : '(env mancante — obbligatorio)'}
              </span>
            </label>
            <div className="flex gap-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasEnvKey ? 'sk-or-v1-… (opzionale)' : 'sk-or-v1-… (obbligatorio)'}
                autoComplete="off"
                className="flex-1 border border-pearl-grey px-2 py-1.5 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="px-2 py-1.5 text-xs border border-pearl-grey hover:border-soft-black"
                title={showApiKey ? 'Nascondi' : 'Mostra'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-soft-grey mt-1">Solo per questa richiesta. Mai salvata, mai loggata.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Titolo IT *</label>
        <input
          type="text"
          value={titleIt}
          onChange={(e) => setTitleIt(e.target.value)}
          placeholder="L'eleganza del lago||tessuta a Como."
          required
          className="w-full border border-pearl-grey px-3 py-2 text-sm"
        />
        <p className="text-[11px] text-soft-grey mt-1">Usa <code>||</code> per separare la riga principale dalla riga in corsivo oro.</p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Sottotitolo IT</label>
        <textarea
          value={subtitleIt}
          onChange={(e) => setSubtitleIt(e.target.value)}
          rows={3}
          className="w-full border border-pearl-grey px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Alt IT (accessibilità)</label>
        <input
          type="text"
          value={altIt}
          onChange={(e) => setAltIt(e.target.value)}
          className="w-full border border-pearl-grey px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Focus immagine</label>
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="border border-pearl-grey px-3 py-2 text-sm"
        >
          {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2 text-sm hover:bg-soft-black/90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Carica e traduci
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-pearl-grey">Annulla</button>
      </div>
    </form>
  );
}

function SlideRow(props: {
  slide: Slide;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onTranslate: () => void;
  onReplaceImage: (file: File) => void;
  onSaved: () => Promise<void>;
}) {
  const { slide, isFirst, isLast, busy, isEditing } = props;
  const titleIt = slide.title_i18n?.it || '';
  const localesFilled = ['it', 'en', 'es', 'fr', 'de', 'pt', 'nl'].filter((l) => slide.title_i18n?.[l]);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`border ${slide.is_active ? 'border-pearl-grey' : 'border-pearl-grey/40 bg-pearl-grey/10'} bg-white`}>
      <div className="flex gap-4 p-4">
        <div className="relative w-32 h-20 flex-shrink-0 bg-soft-black/5">
          {slide.image_url ? (
            <Image
              src={slide.image_url}
              alt={slide.alt_i18n?.it || ''}
              fill
              sizes="128px"
              className="object-cover"
              style={{ objectPosition: slide.focus || 'center' }}
              unoptimized
            />
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-soft-grey">#{slide.display_order}</span>
            {!slide.is_active ? <span className="text-[10px] uppercase tracking-wider text-red-700">Nascosta</span> : null}
            <span className="text-[10px] uppercase tracking-wider text-soft-grey">{localesFilled.length}/7 lingue</span>
          </div>
          <p className="text-sm font-medium truncate">{titleIt || <em className="text-soft-grey">(senza titolo)</em>}</p>
          <p className="text-xs text-soft-grey line-clamp-2">{slide.subtitle_i18n?.it || ''}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onReplaceImage(f);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <IconButton title="Su" onClick={props.onMoveUp} disabled={isFirst || busy}><ArrowUp className="w-4 h-4" /></IconButton>
          <IconButton title="Giù" onClick={props.onMoveDown} disabled={isLast || busy}><ArrowDown className="w-4 h-4" /></IconButton>
          <IconButton title={slide.is_active ? 'Disattiva' : 'Attiva'} onClick={props.onToggleActive} disabled={busy}>
            {slide.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </IconButton>
          <IconButton title="Cambia foto" onClick={() => fileRef.current?.click()} disabled={busy}>
            <ImageIcon className="w-4 h-4" />
          </IconButton>
          <IconButton title="Traduci" onClick={props.onTranslate} disabled={busy}><Languages className="w-4 h-4" /></IconButton>
          <IconButton title="Modifica testi" onClick={props.onEdit} disabled={busy}><Pencil className="w-4 h-4" /></IconButton>
          <IconButton title="Elimina" onClick={props.onDelete} disabled={busy}><Trash2 className="w-4 h-4 text-red-700" /></IconButton>
          {busy ? <Loader2 className="w-4 h-4 animate-spin text-soft-grey" /> : null}
        </div>
      </div>

      {isEditing ? <EditForm slide={slide} onCancel={props.onEdit} onSaved={props.onSaved} /> : null}
    </div>
  );
}

function IconButton({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-2 hover:bg-pearl-grey/40 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function EditForm({ slide, onCancel, onSaved }: { slide: Slide; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [titleIt, setTitleIt] = useState(slide.title_i18n?.it || '');
  const [subtitleIt, setSubtitleIt] = useState(slide.subtitle_i18n?.it || '');
  const [altIt, setAltIt] = useState(slide.alt_i18n?.it || '');
  const [focus, setFocus] = useState(slide.focus || 'center');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/home-slides/${slide.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title_it: titleIt,
          subtitle_it: subtitleIt,
          alt_it: altIt,
          focus,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-pearl-grey p-4 bg-pearl-grey/10 space-y-3">
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Titolo IT</label>
        <input
          type="text"
          value={titleIt}
          onChange={(e) => setTitleIt(e.target.value)}
          className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
        />
        <p className="text-[11px] text-soft-grey mt-1">Usa <code>||</code> per riga principale + accent.</p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Sottotitolo IT</label>
        <textarea
          value={subtitleIt}
          onChange={(e) => setSubtitleIt(e.target.value)}
          rows={3}
          className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Alt IT</label>
        <input
          type="text"
          value={altIt}
          onChange={(e) => setAltIt(e.target.value)}
          className="w-full border border-pearl-grey px-3 py-2 text-sm bg-white"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-soft-grey mb-1">Focus</label>
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="border border-pearl-grey px-3 py-2 text-sm bg-white"
        >
          {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-soft-black text-warm-white px-4 py-2 text-sm hover:bg-soft-black/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva (auto-traduce se IT cambia)
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-pearl-grey">Annulla</button>
      </div>
    </div>
  );
}
