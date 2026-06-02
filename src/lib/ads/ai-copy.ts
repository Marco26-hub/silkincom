/**
 * Generate Google Ads ad copy from a product slug using OpenRouter.
 *
 * Outputs Responsive Search Ad ingredients ready to be pushed via the Ads
 * API: 15 headlines (≤ 30 chars), 4 descriptions (≤ 90 chars), and a list
 * of 20 keyword candidates. The prompt is locked to the SILKinCOM brand
 * voice ("Tradizione serica dal 1400 / Made in Como") so admins can drop
 * the output straight into a campaign without copy editing.
 */

import { createServiceClient } from '@/lib/supabase/server';

export type AdCopy = {
  headlines: string[];
  descriptions: string[];
  keywords: string[];
};

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
// Ordered fallback — the old 'anthropic/claude-3.5-sonnet' slug now 404s on
// OpenRouter ("No endpoints found"). Try current Anthropic slugs first, then
// always-available cross-vendor models.
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-latest',
  'openai/gpt-4o',
  'google/gemini-2.0-flash-001',
];

const SYSTEM = `You are the senior copywriter for SILKinCOM — a luxury silk &
cashmere atelier in Como, Italy. Tradition: silk weaving since 1400, made in
Como. Voice: editorial, restrained, never aggressive; cultivated Italian
heritage; English-friendly when the locale calls for it.

Output strict JSON with three arrays:
  headlines     — 15 strings, each ≤ 30 characters, no period at the end
  descriptions  — 4 strings, each ≤ 90 characters, full sentences
  keywords      — 20 search query candidates (phrases, lowercase, no quotes)

Rules:
  - Italian for IT campaigns, English for EN campaigns, both clean and
    typo-free.
  - Each headline must stand alone (Google rotates them).
  - Avoid generic luxury clichés ("the best", "premium quality"); favour
    specific cues: cashmere puro, twilly Lake Como, Made in Como, edizione
    limitata.
  - Include at least one headline with the brand name "SILKinCOM" and one
    with the city "Como".
  - Keywords cover product type, fabric, occasion, and brand+geo intent.
  - Never include disallowed Google Ads characters (!, repeated punctuation).`;

type Product = {
  slug: string;
  name: string;
  description_short: string | null;
  description_long: string | null;
  composition: string | null;
  price: number;
  category_slug?: string | null;
};

export async function generateAdCopy(
  slugs: string[],
  locale: 'it' | 'en' = 'it',
): Promise<AdCopy> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY non configurato');
  }
  if (slugs.length === 0) throw new Error('Almeno un prodotto richiesto');

  const supabase = createServiceClient();
  const { data: products } = await supabase
    .from('products')
    .select('slug, name, description_short, description_long, composition, price')
    .in('slug', slugs);

  const productBrief = (products as Product[] | null ?? [])
    .map(
      (p) =>
        `- ${p.name} (€${p.price})${p.composition ? ` — ${p.composition}` : ''}\n  ${
          (p.description_short || p.description_long || '').slice(0, 240)
        }`,
    )
    .join('\n');

  const user = [
    `Locale: ${locale.toUpperCase()}`,
    `Products in this campaign:`,
    productBrief,
    '',
    `Generate the JSON now. No markdown, no commentary, no code fences.`,
  ].join('\n');

  let content = '{}';
  let lastErr = '';
  for (const model of MODELS) {
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.silkincom.com',
        'X-Title': 'SILKinCOM Ad Copy',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      content = json.choices?.[0]?.message?.content ?? '{}';
      if (content && content !== '{}') break;
    } else {
      lastErr = `${model} → ${res.status}: ${(await res.text()).slice(0, 160)}`;
    }
  }
  if (!content || content === '{}') throw new Error(`openrouter: nessun modello disponibile (${lastErr})`);

  let parsed: Partial<AdCopy>;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Some models wrap output in markdown despite response_format. Pluck the
    // first JSON object out of the string before giving up.
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }

  const headlines = (parsed.headlines ?? [])
    .map((h) => String(h).trim())
    .filter((h) => h.length > 0 && h.length <= 30)
    .slice(0, 15);
  const descriptions = (parsed.descriptions ?? [])
    .map((d) => String(d).trim())
    .filter((d) => d.length > 0 && d.length <= 90)
    .slice(0, 4);
  const keywords = (parsed.keywords ?? [])
    .map((k) => String(k).trim().toLowerCase())
    .filter((k) => k.length > 0)
    .slice(0, 20);

  return { headlines, descriptions, keywords };
}
