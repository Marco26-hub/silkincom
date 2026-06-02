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

// Etsy translation language codes → human name used in the prompt.
export const ETSY_TRANSLATION_LANGS: Record<string, string> = {
  en: 'English',
  de: 'German (Deutsch)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  pt: 'Portuguese (Português)',
  nl: 'Dutch (Nederlands)',
};

function buildSystem(langName: string): string {
  return `You are the senior ${langName} copywriter & Etsy SEO specialist for
SILKinCOM — a luxury silk & cashmere atelier in Como, Italy (silk weaving
tradition since 1400, Made in Como). You translate the Italian master listing
into ${langName}, optimised for Etsy search AND Google/AI discovery (GEO).

Output STRICT JSON, no markdown, no commentary:
{
  "title":       string,    // ${langName}, <= 140 chars, keyword FIRST.
                            //   Front-load the highest-intent buyer search
                            //   terms, then brand/geo. Use " | " separators.
                            //   Natural, not keyword-stuffed.
  "description": string,    // ${langName}. The FIRST 160 chars must carry the
                            //   main keywords + value (Google snippet + Etsy).
                            //   Keep the technical-details block (composition,
                            //   dimensions, finish) and gift/occasion framing.
                            //   Preserve line breaks with \\n.
  "tags":        string[]   // EXACTLY up to 13 tags. Each <= 20 characters,
                            //   lowercase, multi-word long-tail phrases buyers
                            //   actually type in ${langName}. No duplicates,
                            //   no '#'.
}

Rules:
- Real, fluent, idiomatic ${langName} — translate everything (keep only proper
  nouns: SILKinCOM, Como, Lake Como, Italy). Use the correct accents/umlauts.
- Luxury editorial voice: restrained, specific, no clichés. Favour concrete
  cues: pure silk, hand-rolled hem, jacquard, Made in Como, Lake Como.
- Tags: mix product-type + fabric + occasion + brand/geo intent, in ${langName}.
  Each <= 20 chars (hard Etsy limit) — drop or shorten any that exceed it.
- Keep factual details accurate (composition %, dimensions, care).`;
}

export type ListingTranslation = {
  title: string;
  description: string;
  tags: string[];
};

export async function translateListing(
  it: { title: string; description: string; tags: string[]; materials?: string[] },
  targetLang: string = 'en',
): Promise<ListingTranslation> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY non configurato');
  }
  const langName = ETSY_TRANSLATION_LANGS[targetLang];
  if (!langName) throw new Error(`Lingua non supportata: ${targetLang}`);

  const user = [
    `Translate this Italian Etsy listing into optimised ${langName}. Return JSON only.`,
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
          { role: 'system', content: buildSystem(langName) },
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
