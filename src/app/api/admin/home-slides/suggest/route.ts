import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];
const DEFAULT_MODEL = process.env.VISION_MODEL || 'google/gemma-4-31b-it:free';
const MAX_BYTES = 8 * 1024 * 1024;

// Server-side allowlist of vision-capable models currently live on
// OpenRouter (verified May 2026). Keeps clients from invoking arbitrary
// models that could spend tokens unexpectedly.
const ALLOWED_MODELS = new Set([
  // Free
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  // Paid — cheap
  'google/gemini-3.1-flash-lite',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash',
  'google/gemini-3-flash-preview',
  'google/gemini-3.5-flash',
  // Paid — top quality
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-opus-4.7',
]);

const SYSTEM_PROMPT = `You are the editorial copywriter for SILKinCOM, a luxury silk, cashmere, wool, linen and cotton accessories maison Made in Como, Italy. Founder: Marco Dibenedetto. Voice: refined, editorial, evocative, never marketing-cliché. Lake Como heritage is the soul.

Given a single hero slide image (homepage carousel), produce three Italian fields:

- title: max 10 words, headline for a slide carousel. Split with "||" into a main line and a gold italic accent line. Example: "L'eleganza del lago||tessuta a Como." or "Lino e cotone||per ogni stagione.". Never quote brand names verbatim.
- subtitle: 120–220 chars, one sentence, editorial luxury tone, evokes texture/material/place/use. No CTA. No hashtags.
- alt: 80–125 chars, factual accessible description of what is visible (subject, material if guessable, setting), Italian.

Return ONLY raw JSON: {"title":"...","subtitle":"...","alt":"..."}. No prose, no code fence.`;

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 });
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo immagini sono ammesse' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Immagine oltre 8 MB' }, { status: 400 });
  }

  const rawModel = (formData?.get('model') as string | null) ?? '';
  const requestedModel = rawModel.trim().replace(/[^\x20-\x7e]/g, '') || DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return NextResponse.json({ error: `Modello non ammesso: ${requestedModel}` }, { status: 400 });
  }

  // Per-request API key override. Never persisted server-side, never logged.
  // HTTP headers must be ASCII (ByteString). Smart-quotes, em-dashes and other
  // characters introduced by copy-paste would crash fetch(), so we sanitise
  // before deciding whether the override is usable. If sanitisation actually
  // changed the value we treat the original input as invalid (the user almost
  // certainly intended to paste a clean key).
  const rawKeyValue = (formData?.get('api_key') as string | null) ?? '';
  const rawKey = rawKeyValue.trim();
  const cleanKey = rawKey.replace(/[^\x20-\x7e]/g, '');
  if (rawKey && cleanKey !== rawKey) {
    return NextResponse.json(
      { error: 'API key contiene caratteri non ASCII (em-dash o virgolette smart). Ricopiala come testo semplice.' },
      { status: 400 }
    );
  }
  if (cleanKey && !/^sk-or-v1-[a-f0-9]{32,128}$/i.test(cleanKey)) {
    return NextResponse.json(
      { error: 'Formato API key OpenRouter non valido (atteso sk-or-v1-…)' },
      { status: 400 }
    );
  }
  const envKey = (process.env.OPENROUTER_API_KEY || '').trim().replace(/[^\x20-\x7e]/g, '');
  const apiKey = cleanKey || envKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY non configurata su Vercel e nessun override fornito' },
      { status: 500 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://silkincom.com',
        'X-Title': 'SILKinCOM',
      },
      body: JSON.stringify({
        model: requestedModel,
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Genera title/subtitle/alt italiani per questa hero slide.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: `Rete OpenRouter: ${(e as Error).message}` }, { status: 502 });
  }

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: `OpenRouter ${res.status}: ${txt.slice(0, 300)}` }, { status: 502 });
  }

  const json = await res.json();
  let text = (json.choices?.[0]?.message?.content || '').toString().trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);

  let parsed: { title?: string; subtitle?: string; alt?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: 'Modello non ha restituito JSON valido', raw: text.slice(0, 500) },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    title_it: (parsed.title || '').trim(),
    subtitle_it: (parsed.subtitle || '').trim(),
    alt_it: (parsed.alt || '').trim(),
    model: requestedModel,
  });
}

// GET — list the allowed models so the admin form can render a dropdown
// without hardcoding the catalogue client-side.
export async function GET() {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);
  return NextResponse.json({
    default_model: DEFAULT_MODEL,
    has_env_key: !!process.env.OPENROUTER_API_KEY,
    models: Array.from(ALLOWED_MODELS).map((id) => ({
      id,
      label: MODEL_LABELS[id] ?? id,
      free: id.endsWith(':free'),
    })),
  });
}

const MODEL_LABELS: Record<string, string> = {
  'google/gemma-4-31b-it:free': 'Gemma 4 31B IT · gratis · consigliato',
  'google/gemma-4-26b-a4b-it:free': 'Gemma 4 26B IT · gratis · piu veloce',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Nemotron 3 Nano Omni · gratis · reasoning',
  'google/gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite · economico',
  'google/gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite · economico',
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash · stabile economico',
  'google/gemini-3-flash-preview': 'Gemini 3 Flash · ultimo Google',
  'google/gemini-3.5-flash': 'Gemini 3.5 Flash · top Google',
  'anthropic/claude-haiku-4.5': 'Claude Haiku 4.5 · luxury voice economico',
  'anthropic/claude-sonnet-4.6': 'Claude Sonnet 4.6 · luxury voice premium',
  'anthropic/claude-opus-4.7': 'Claude Opus 4.7 · top brand voice',
};
