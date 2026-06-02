/**
 * AI translation of a blog post from its Italian master into one target locale,
 * via OpenRouter. Preserves the editorial voice, the markdown-style headings
 * (## / ###) and paragraph breaks (\n\n) that the public renderer relies on.
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-latest',
  'openai/gpt-4o',
  'google/gemini-2.0-flash-001',
];

export const BLOG_LANGS: Record<string, string> = {
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  pt: 'Portuguese (Português)',
  nl: 'Dutch (Nederlands)',
};

export type BlogFields = {
  title: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
};

function buildSystem(langName: string): string {
  return `You are the senior ${langName} editorial translator for SILKinCOM, a
luxury silk & cashmere atelier in Como, Italy (silk-weaving tradition since
1400). Translate the Italian blog article into fluent, idiomatic ${langName}
with a refined, restrained editorial voice — never literal or robotic.

Output STRICT JSON, no markdown fences, no commentary:
{
  "title":           string,
  "excerpt":         string,   // 1–2 sentence standfirst
  "content":         string,   // KEEP the "## " and "### " heading markers and
                               //   the blank-line paragraph breaks (\\n\\n)
                               //   EXACTLY where they are in the source.
  "seo_title":       string,   // <= 60 chars
  "seo_description": string    // <= 155 chars
}

Rules:
- Translate everything; keep only proper nouns (SILKinCOM, Como, Lake Como).
- Correct ${langName} accents/diacritics. Natural, premium register.
- Preserve factual accuracy (figures, materials, care instructions).`;
}

export async function translateBlog(it: BlogFields, targetLang: string): Promise<BlogFields> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY non configurato');
  const langName = BLOG_LANGS[targetLang];
  if (!langName) throw new Error(`Lingua non supportata: ${targetLang}`);

  const user = [
    `Translate this Italian blog article into ${langName}. Return JSON only.`,
    '',
    `TITLE:\n${it.title}`,
    '',
    `EXCERPT:\n${it.excerpt}`,
    '',
    `CONTENT:\n${it.content}`,
    '',
    `SEO_TITLE:\n${it.seo_title}`,
    `SEO_DESCRIPTION:\n${it.seo_description}`,
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
        'X-Title': 'SILKinCOM Blog Translate',
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

  let parsed: Partial<BlogFields>;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }

  const out: BlogFields = {
    title: String(parsed.title ?? '').trim(),
    excerpt: String(parsed.excerpt ?? '').trim(),
    content: String(parsed.content ?? '').trim(),
    seo_title: String(parsed.seo_title ?? '').trim().slice(0, 70),
    seo_description: String(parsed.seo_description ?? '').trim().slice(0, 160),
  };
  if (!out.title || !out.content) throw new Error('Traduzione incompleta dal modello');
  return out;
}
