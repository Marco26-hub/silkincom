// Generic OpenRouter translation helper.
// Italian is the source language; target locales are en/es/fr/de/pt/nl.
// Used by /api/admin/products/[id]/translate and /api/admin/home-slides/[id]/translate.

export const TARGET_LANGS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  nl: 'Dutch',
};

const MODEL = process.env.TRANSLATE_MODEL || 'google/gemma-4-31b-it:free';

export type TranslatableFields = Record<string, string>;

/**
 * Translate a flat object of Italian strings into the given target language.
 * Returns an object with the same keys, translated values.
 *
 * Sequential calls (not parallel) because free-tier OpenRouter rate-limits bursts.
 */
export async function translateFields<T extends TranslatableFields>(
  targetLang: string,
  fields: T,
  context: { brand?: string; tone?: string } = {}
): Promise<T> {
  const brand = context.brand || 'SILKinCOM, a luxury silk and cashmere accessories brand, Made in Como, Italy';
  const tone = context.tone || 'premium, editorial';
  const keys = Object.keys(fields);

  const system =
    `You translate content for ${brand}. ` +
    `Translate from Italian into ${targetLang}. Use a ${tone} tone. ` +
    `Keep brand names (SILKinCOM, Como) unchanged; render "Lago di Como" with the natural local name for Lake Como. ` +
    `Preserve any "||" separator verbatim (it splits two title halves). ` +
    `Return ONLY a JSON object with keys ${keys.map((k) => `"${k}"`).join(', ')} — no prose, no code fence.`;

  const user = `Translate these Italian fields to ${targetLang}. Return JSON {${keys.join(', ')}}.\n\n${JSON.stringify(fields)}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://silkincom.com',
      'X-Title': 'SILKinCOM',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  let text = (json.choices?.[0]?.message?.content || '').trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text) as T;
}

/**
 * Translate a single Italian fields object into all 6 target locales.
 * Returns map: { en: {...}, es: {...}, ... }
 */
export async function translateToAllLocales<T extends TranslatableFields>(
  italianFields: T,
  context: { brand?: string; tone?: string } = {}
): Promise<Record<string, T>> {
  const out: Record<string, T> = {};
  for (const [loc, langName] of Object.entries(TARGET_LANGS)) {
    out[loc] = await translateFields(langName, italianFields, context);
  }
  return out;
}

/**
 * Given Italian source values and a per-locale translation map, build the
 * i18n JSONB shape: { it: <source>, en: <translated>, ... }
 */
export function buildI18nMap(
  italianValue: string,
  perLocale: Record<string, TranslatableFields>,
  key: string
): Record<string, string> {
  const out: Record<string, string> = { it: italianValue };
  for (const [loc, fields] of Object.entries(perLocale)) {
    if (fields && typeof fields[key] === 'string') out[loc] = fields[key];
  }
  return out;
}
