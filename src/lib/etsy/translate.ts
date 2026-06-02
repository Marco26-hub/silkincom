/**
 * AI translation of an Etsy listing from its Italian master into an
 * SEO/GEO-optimised English translation, via OpenRouter.
 *
 * Goal: maximise discoverability for English-speaking buyers AND Google/AI
 * search (Etsy listings rank on Google; English doubles the addressable
 * market). Not a literal translation — it re-writes for English Etsy SEO:
 * keyword-front-loaded title, 13 long-tail tags (≤20 chars each), and a
 * description whose key terms land in the first ~160 characters.
 *
 * Env: OPENROUTER_API_KEY.
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
// Tried in order until one resolves on OpenRouter. The old
// 'anthropic/claude-3.5-sonnet' slug now 404s ("No endpoints found"), so we
// fall through current Anthropic slugs and finish with cross-vendor fallbacks
// that are always available — translation quality is fine on any of them.
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-latest',
  'openai/gpt-4o',
  'google/gemini-2.0-flash-001',
];

const SYSTEM = `You are the senior English copywriter & Etsy SEO specialist for
SILKinCOM — a luxury silk & cashmere atelier in Como, Italy (silk weaving
tradition since 1400, Made in Como). You translate the Italian master listing
into ENGLISH, optimised for Etsy search AND Google/AI discovery (GEO).

Output STRICT JSON, no markdown, no commentary:
{
  "title":       string,    // English, <= 140 chars, keyword FIRST. Front-load
                            //   the highest-intent buyer search terms, then
                            //   brand/geo. Use " | " separators. Natural, not
                            //   keyword-stuffed.
  "description": string,    // English. The FIRST 160 chars must carry the main
                            //   keywords + value (Google snippet + Etsy). Keep
                            //   the technical-details block (composition,
                            //   dimensions, finish) and gift/occasion framing.
                            //   Preserve line breaks with \\n.
  "tags":        string[]   // EXACTLY up to 13 tags. Each <= 20 characters,
                            //   lowercase, multi-word long-tail phrases buyers
                            //   actually type (e.g. "silk hair scarf",
                            //   "gift for her", "made in italy"). No duplicates,
                            //   no '#'.
}

Rules:
- Real, fluent English — never Italian words left untranslated (keep only
  proper nouns: SILKinCOM, Como, Lake Como, Italy).
- Luxury editorial voice: restrained, specific, no clichés ("best", "high
  quality"). Favour concrete cues: pure silk, hand-rolled hem, jacquard, Made
  in Como, Lake Como.
- Tags: mix product-type + fabric + occasion + brand/geo intent. Each <= 20
  chars (hard Etsy limit) — drop or shorten any that exceed it.
- Keep factual details accurate (composition %, dimensions, care).`;

export type ListingTranslation = {
  title: string;
  description: string;
  tags: string[];
};

export async function translateListingToEN(it: {
  title: string;
  description: string;
  tags: string[];
  materials?: string[];
}): Promise<ListingTranslation> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY non configurato');
  }

  const user = [
    'Translate this Italian Etsy listing into optimised English. Return JSON only.',
    '',
    `ITALIAN TITLE:\n${it.title}`,
    '',
    `ITALIAN DESCRIPTION:\n${it.description}`,
    '',
    `ITALIAN TAGS: ${(it.tags ?? []).join(', ')}`,
    it.materials?.length ? `MATERIALS: ${it.materials.join(', ')}` : '',
  ].join('\n');

  let content = '';
  let lastErr = '';
  for (const model of MODELS) {
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.silkincom.com',
        'X-Title': 'SILKinCOM Etsy Translate',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      content = json.choices?.[0]?.message?.content ?? '';
      if (content) break;
    } else {
      lastErr = `${model} → ${res.status}: ${(await res.text()).slice(0, 160)}`;
    }
  }
  if (!content) throw new Error(`openrouter: nessun modello disponibile (${lastErr})`);

  let parsed: Partial<ListingTranslation>;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }

  const title = String(parsed.title ?? '').trim().slice(0, 140);
  const description = String(parsed.description ?? '').trim().slice(0, 4000);
  const tags = (parsed.tags ?? [])
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0 && t.length <= 20)
    .filter((t, i, arr) => arr.indexOf(t) === i) // dedupe
    .slice(0, 13);

  if (!title || !description) {
    throw new Error('Traduzione incompleta dal modello (title/description vuoti)');
  }

  return { title, description, tags };
}
