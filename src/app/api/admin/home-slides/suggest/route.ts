import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_ROLES = ['admin', 'super_admin', 'editor'];
const MODEL = process.env.VISION_MODEL || 'google/gemini-2.0-flash-exp:free';
const MAX_BYTES = 8 * 1024 * 1024;

const SYSTEM_PROMPT = `You are the editorial copywriter for SILKinCOM, a luxury silk, cashmere, wool, linen and cotton accessories maison Made in Como, Italy. Founder: Marco Dibenedetto. Voice: refined, editorial, evocative, never marketing-cliché. Lake Como heritage is the soul.

Given a single hero slide image (homepage carousel), produce three Italian fields:

- title: max 10 words, headline for a slide carousel. Split with "||" into a main line and a gold italic accent line. Example: "L'eleganza del lago||tessuta a Como." or "Lino e cotone||per ogni stagione.". Never quote brand names verbatim.
- subtitle: 120–220 chars, one sentence, editorial luxury tone, evokes texture/material/place/use. No CTA. No hashtags.
- alt: 80–125 chars, factual accessible description of what is visible (subject, material if guessable, setting), Italian.

Return ONLY raw JSON: {"title":"...","subtitle":"...","alt":"..."}. No prose, no code fence.`;

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi(ADMIN_ROLES);
  if (!auth.ok) return forbidden(auth.status);

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY non configurata su Vercel' }, { status: 500 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File mancante' }, { status: 400 });
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo immagini sono ammesse' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Immagine oltre 8 MB' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://silkincom.com',
        'X-Title': 'SILKinCOM',
      },
      body: JSON.stringify({
        model: MODEL,
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
    model: MODEL,
  });
}
