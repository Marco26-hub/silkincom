import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];
const DEFAULT_MODEL = process.env.VISION_MODEL || 'google/gemini-2.0-flash-exp:free';
const MAX_BYTES = 8 * 1024 * 1024;

// Server-side allowlist. Keeps clients from invoking arbitrary models that
// could spend tokens unexpectedly. All entries are vision-capable.
const ALLOWED_MODELS = new Set([
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5',
  'google/gemini-flash-1.5-8b',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen-2-vl-7b-instruct:free',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
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

  const requestedModel = (formData?.get('model') as string | null)?.trim() || DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return NextResponse.json({ error: `Modello non ammesso: ${requestedModel}` }, { status: 400 });
  }
  // Per-request API key override. Never persisted server-side, never logged.
  const keyOverride = (formData?.get('api_key') as string | null)?.trim();
  const apiKey = keyOverride || process.env.OPENROUTER_API_KEY;
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
  'google/gemini-2.0-flash-exp:free': 'Gemini 2.0 Flash · gratis · consigliato',
  'google/gemini-flash-1.5': 'Gemini Flash 1.5 · ~$0.0004/img',
  'google/gemini-flash-1.5-8b': 'Gemini Flash 1.5 8B · ~$0.0002/img',
  'meta-llama/llama-3.2-90b-vision-instruct:free': 'Llama 3.2 90B Vision · gratis · lento',
  'meta-llama/llama-3.2-11b-vision-instruct:free': 'Llama 3.2 11B Vision · gratis · veloce',
  'qwen/qwen-2-vl-7b-instruct:free': 'Qwen 2 VL 7B · gratis · IT debole',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet · ~$0.003/img · top brand voice',
  'anthropic/claude-3-haiku': 'Claude 3 Haiku · ~$0.00025/img',
  'openai/gpt-4o': 'GPT-4o · ~$0.005/img',
  'openai/gpt-4o-mini': 'GPT-4o mini · ~$0.001/img',
};
